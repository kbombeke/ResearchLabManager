<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Download, Upload, Check, AlertTriangle, HardDrive, FolderOpen } from 'lucide-vue-next'
import { invoke } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { getDb, isUsingFallback } from '@/db/database'
import { getCustomDbFolder, setCustomDbFolder, DB_FILENAME } from '@/utils/dbPath'

const exportStatus = ref<'idle' | 'success' | 'error'>('idle')
const importStatus = ref<'idle' | 'success' | 'error'>('idle')
const importError = ref('')
const customFolder = ref<string | null>(null)
const currentDbPath = ref('')
const changingLocation = ref(false)
const fallbackActive = ref(false)

onMounted(async () => {
  customFolder.value = await getCustomDbFolder()
  fallbackActive.value = isUsingFallback()
  if (customFolder.value && !fallbackActive.value) {
    currentDbPath.value = await join(customFolder.value, DB_FILENAME)
  } else {
    const appData = await appDataDir()
    currentDbPath.value = await join(appData, DB_FILENAME)
  }
})

async function handleChangeLocation() {
  const selected = await open({ directory: true, multiple: false, title: 'Select database folder' })
  if (typeof selected !== 'string') return

  changingLocation.value = true
  try {
    const newDbPath = await join(selected, DB_FILENAME)
    const exists = await invoke<boolean>('file_exists', { path: newDbPath })

    if (!exists) {
      await invoke('copy_file', { source: currentDbPath.value, destination: newDbPath })
    }

    await setCustomDbFolder(selected)
    window.location.reload()
  } catch (err) {
    changingLocation.value = false
    console.error('Failed to change database location:', err)
  }
}

async function handleResetLocation() {
  await setCustomDbFolder(null)
  window.location.reload()
}

async function handleExport() {
  try {
    const db = await getDb()
    const tables = ['team_members', 'team_member_relationships', 'phd_trackers', 'projects', 'project_members', 'deliverables', 'meeting_notes', 'meeting_attendees']
    const data: Record<string, unknown[]> = {}
    for (const table of tables) {
      data[table] = await db.select(`SELECT * FROM ${table}`)
    }
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `research-lab-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    exportStatus.value = 'success'
    setTimeout(() => { exportStatus.value = 'idle' }, 3000)
  } catch {
    exportStatus.value = 'error'
    setTimeout(() => { exportStatus.value = 'idle' }, 3000)
  }
}

function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const db = await getDb()
      const deleteTables = ['meeting_attendees', 'meeting_notes', 'deliverables', 'project_members', 'projects', 'phd_trackers', 'team_member_relationships', 'team_members']
      for (const table of deleteTables) { await db.execute(`DELETE FROM ${table}`) }
      const insertOrder = ['team_members', 'team_member_relationships', 'phd_trackers', 'projects', 'project_members', 'deliverables', 'meeting_notes', 'meeting_attendees']
      for (const table of insertOrder) {
        const rows = data[table]
        if (!Array.isArray(rows)) continue
        for (const row of rows) {
          const cols = Object.keys(row)
          const placeholders = cols.map((_: string, i: number) => `$${i + 1}`).join(', ')
          const values = cols.map((c: string) => row[c])
          await db.execute(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, values)
        }
      }
      importStatus.value = 'success'
      importError.value = ''
      setTimeout(() => { importStatus.value = 'idle' }, 3000)
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      importStatus.value = 'error'
      importError.value = err instanceof Error ? err.message : 'Import failed'
      setTimeout(() => { importStatus.value = 'idle' }, 5000)
    }
  }
  input.click()
}
</script>

<template>
  <div>
    <div class="mb-10">
      <h1 class="text-2xl font-bold text-text">Settings</h1>
      <p class="text-text-secondary mt-2">Manage your data and preferences</p>
    </div>

    <div class="max-w-2xl space-y-10">
      <!-- Database Location -->
      <div class="bg-card rounded-2xl p-10 shadow-sm">
        <div class="flex items-start gap-6">
          <div class="w-12 h-12 rounded-xl bg-purple/10 flex items-center justify-center shrink-0">
            <HardDrive :size="22" class="text-purple" />
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-text">Database Location</h2>
            <p class="text-sm text-text-secondary mt-2 mb-4 leading-relaxed">
              Choose where your database is stored. Use a cloud-synced folder (like OneDrive) to access your data across computers.
            </p>
            <div v-if="fallbackActive" class="flex items-center gap-2 text-xs text-warning mb-4">
              <AlertTriangle :size="14" />
              <span>Could not access custom location. Using default path instead.</span>
            </div>
            <div class="bg-hover/60 rounded-xl px-5 py-3.5 mb-5">
              <p class="text-[11px] text-text-muted mb-1 uppercase tracking-wide">Current location</p>
              <p class="text-sm text-text font-mono truncate">{{ currentDbPath || 'Loading...' }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button @click="handleChangeLocation" :disabled="changingLocation" class="flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors disabled:opacity-50">
                <FolderOpen :size="16" />
                {{ changingLocation ? 'Moving...' : 'Change Location' }}
              </button>
              <button v-if="customFolder" @click="handleResetLocation" class="flex items-center gap-2 px-5 py-2.5 border border-border text-sm text-text-secondary rounded-xl hover:bg-hover transition-colors">
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Export -->
      <div class="bg-card rounded-2xl p-10 shadow-sm">
        <div class="flex items-start gap-6">
          <div class="w-12 h-12 rounded-xl bg-blue/10 flex items-center justify-center shrink-0">
            <Download :size="22" class="text-blue" />
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-text">Export Data</h2>
            <p class="text-sm text-text-secondary mt-2 mb-5 leading-relaxed">
              Download all your data as a JSON file. This includes team members, PhD trackers, projects, deliverables, and meeting notes.
            </p>
            <button @click="handleExport" class="flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">
              <Check v-if="exportStatus === 'success'" :size="16" />
              <Download v-else :size="16" />
              {{ exportStatus === 'success' ? 'Exported!' : exportStatus === 'error' ? 'Export Failed' : 'Export JSON' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Import -->
      <div class="bg-card rounded-2xl p-10 shadow-sm">
        <div class="flex items-start gap-6">
          <div class="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <Upload :size="22" class="text-warning" />
          </div>
          <div class="flex-1">
            <h2 class="text-lg font-semibold text-text">Import Data</h2>
            <p class="text-sm text-text-secondary mt-2 mb-3 leading-relaxed">
              Restore data from a previously exported JSON backup. This will replace all current data.
            </p>
            <div class="flex items-center gap-2 text-xs text-warning mb-5">
              <AlertTriangle :size="14" />
              <span>Warning: importing will overwrite all existing data.</span>
            </div>
            <button @click="handleImport" class="flex items-center gap-2 px-5 py-2.5 border border-border text-sm font-medium rounded-xl hover:bg-hover transition-colors">
              <Check v-if="importStatus === 'success'" :size="16" class="text-success" />
              <Upload v-else :size="16" />
              {{ importStatus === 'success' ? 'Imported!' : importStatus === 'error' ? 'Import Failed' : 'Import JSON' }}
            </button>
            <p v-if="importStatus === 'error' && importError" class="text-xs text-danger mt-3">{{ importError }}</p>
          </div>
        </div>
      </div>

      <!-- About -->
      <div class="bg-card rounded-2xl p-10 shadow-sm">
        <h2 class="text-lg font-semibold text-text mb-3">About</h2>
        <div class="space-y-2 text-sm text-text-secondary leading-relaxed">
          <p><span class="font-medium text-text">Research Lab Manager</span> v0.1.0</p>
          <p>A free, open-source project management tool for research lab teams.</p>
          <p>Built with Tauri, Vue, and TypeScript.</p>
        </div>
      </div>
    </div>
  </div>
</template>
