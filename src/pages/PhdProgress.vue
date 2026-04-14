<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Edit2, Trash2, GraduationCap, ChevronDown, ChevronUp, BookOpen } from 'lucide-vue-next'
import { format, differenceInMonths } from 'date-fns'
import { useTeamStore } from '@/stores/teamStore'
import { usePhdStore } from '@/stores/phdStore'
import type { PhdTrackerWithMember, DissertationChapter } from '@/types'
import Modal from '@/components/Modal.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const teamStore = useTeamStore()
const phdStore = usePhdStore()

const emptyForm: { team_member_id: number; phd_start_date: string; expected_end_date: string; status: 'on_track' | 'at_risk' | 'overdue' | 'completed'; milestones: string; chapters: string; notes: string } = { team_member_id: 0, phd_start_date: '', expected_end_date: '', status: 'on_track', milestones: '[]', chapters: '[]', notes: '' }

const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ ...emptyForm })
const expandedId = ref<number | null>(null)
const chapterForm = ref({ title: '', reference: '', status: 'not_started' as DissertationChapter['status'] })
const editingChapterId = ref<string | null>(null)
const deleteConfirm = ref<number | null>(null)
const today = new Date()

onMounted(() => { teamStore.loadMembers(); phdStore.loadTrackers() })

async function handleSubmit() {
  if (!form.value.team_member_id || !form.value.phd_start_date || !form.value.expected_end_date) return
  if (editingId.value) {
    await phdStore.updateTracker(editingId.value, form.value)
  } else {
    await phdStore.addTracker(form.value)
  }
  closeModal()
}

function handleEdit(tracker: PhdTrackerWithMember) {
  editingId.value = tracker.id
  form.value = { team_member_id: tracker.team_member_id, phd_start_date: tracker.phd_start_date, expected_end_date: tracker.expected_end_date, status: tracker.status, milestones: tracker.milestones, chapters: tracker.chapters, notes: tracker.notes }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  form.value = { ...emptyForm }
}

function getChapters(tracker: PhdTrackerWithMember): DissertationChapter[] {
  try { return JSON.parse(tracker.chapters || '[]') } catch { return [] }
}

async function addChapter(tracker: PhdTrackerWithMember) {
  if (!chapterForm.value.title) return
  const chapters = getChapters(tracker)
  chapters.push({ id: crypto.randomUUID(), title: chapterForm.value.title, reference: chapterForm.value.reference, status: chapterForm.value.status })
  await phdStore.updateTracker(tracker.id, { chapters: JSON.stringify(chapters) })
  chapterForm.value = { title: '', reference: '', status: 'not_started' }
}

async function updateChapter(tracker: PhdTrackerWithMember, chapterId: string, updates: Partial<DissertationChapter>) {
  const chapters = getChapters(tracker)
  const ch = chapters.find(c => c.id === chapterId)
  if (ch) Object.assign(ch, updates)
  await phdStore.updateTracker(tracker.id, { chapters: JSON.stringify(chapters) })
}

async function deleteChapter(tracker: PhdTrackerWithMember, chapterId: string) {
  const chapters = getChapters(tracker).filter(c => c.id !== chapterId)
  await phdStore.updateTracker(tracker.id, { chapters: JSON.stringify(chapters) })
}

function startEditChapter(ch: DissertationChapter) {
  editingChapterId.value = ch.id
  chapterForm.value = { title: ch.title, reference: ch.reference, status: ch.status }
}

async function saveEditChapter(tracker: PhdTrackerWithMember) {
  if (!editingChapterId.value || !chapterForm.value.title) return
  await updateChapter(tracker, editingChapterId.value, { title: chapterForm.value.title, reference: chapterForm.value.reference, status: chapterForm.value.status })
  editingChapterId.value = null
  chapterForm.value = { title: '', reference: '', status: 'not_started' }
}

function cancelEditChapter() {
  editingChapterId.value = null
  chapterForm.value = { title: '', reference: '', status: 'not_started' }
}

const chapterStatusStyles: Record<string, string> = {
  finished: 'bg-success/10 text-success',
  in_progress: 'bg-blue/10 text-blue',
  not_started: 'bg-text-muted/10 text-text-muted',
}

const chapterStatusLabels: Record<string, string> = {
  finished: 'Finished',
  in_progress: 'In Progress',
  not_started: 'Not Started',
}

const availableMembers = computed(() => {
  const existingIds = phdStore.trackers.map(t => t.team_member_id)
  return editingId.value
    ? teamStore.members.filter(m => m.is_active)
    : teamStore.members.filter(m => m.is_active && !existingIds.includes(m.id))
})

const timelineData = computed(() => {
  if (phdStore.trackers.length === 0) return null
  const allDates = phdStore.trackers.flatMap(t => [new Date(t.phd_start_date), new Date(t.expected_end_date)])
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())))
  const range = maxDate.getTime() - minDate.getTime()
  const years: number[] = []
  for (let y = minDate.getFullYear(); y <= maxDate.getFullYear(); y++) years.push(y)
  const todayPos = ((today.getTime() - minDate.getTime()) / range) * 100
  return { minDate, maxDate, range, years, todayPos }
})

function trackerBarStyle(tracker: PhdTrackerWithMember) {
  if (!timelineData.value) return {}
  const { minDate, range } = timelineData.value
  const start = new Date(tracker.phd_start_date)
  const end = new Date(tracker.expected_end_date)
  const left = ((start.getTime() - minDate.getTime()) / range) * 100
  const width = ((end.getTime() - start.getTime()) / range) * 100
  return { left: `${left}%`, width: `${width}%` }
}

function trackerProgress(tracker: PhdTrackerWithMember) {
  const start = new Date(tracker.phd_start_date).getTime()
  const end = new Date(tracker.expected_end_date).getTime()
  return Math.min(Math.max(((today.getTime() - start) / (end - start)) * 100, 0), 100)
}

function yearPos(year: number) {
  if (!timelineData.value) return 0
  const { minDate, range } = timelineData.value
  const yearStart = new Date(year, 0, 1)
  return Math.max(0, ((yearStart.getTime() - minDate.getTime()) / range) * 100)
}

function barColor(status: string) {
  return status === 'on_track' ? 'bg-success' : status === 'at_risk' ? 'bg-warning' : status === 'overdue' ? 'bg-danger' : 'bg-blue'
}
</script>

<template>
  <div v-if="phdStore.loading && phdStore.trackers.length === 0" class="flex items-center justify-center h-64 text-text-secondary">Loading...</div>
  <div v-else>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-text">PhD Progress</h1>
        <p class="text-text-secondary mt-2">Track PhD student timelines and dissertation progress</p>
      </div>
      <button @click="form = { ...emptyForm }; editingId = null; showModal = true" class="flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">
        <Plus :size="16" /> Add PhD Tracker
      </button>
    </div>

    <!-- Timeline View -->
    <div v-if="timelineData && phdStore.trackers.length > 0" class="bg-card rounded-2xl p-8 mb-8 shadow-sm">
      <h2 class="text-lg font-semibold text-text mb-8">Timeline Overview</h2>
      <div class="relative">
        <div class="flex items-center gap-5 mb-3">
          <div class="w-48 shrink-0"></div>
          <div class="flex-1 relative h-5">
            <div v-for="year in timelineData.years" :key="year" class="absolute text-xs text-text-muted" :style="{ left: `${yearPos(year)}%` }">{{ year }}</div>
          </div>
        </div>
        <div class="space-y-4">
          <div v-for="tracker in phdStore.trackers" :key="tracker.id" class="flex items-center gap-5">
            <div class="w-48 shrink-0 text-right">
              <p class="text-sm font-medium text-text truncate">{{ tracker.member_name }}</p>
              <p class="text-xs text-text-muted mt-0.5">{{ differenceInMonths(new Date(tracker.expected_end_date), new Date(tracker.phd_start_date)) }} months</p>
            </div>
            <div class="flex-1 relative h-9">
              <div class="absolute h-8 rounded-lg bg-hover border border-border top-0.5" :style="trackerBarStyle(tracker)">
                <div :class="['h-full rounded-lg opacity-30', barColor(tracker.status)]" :style="{ width: `${trackerProgress(tracker)}%` }" />
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="timelineData.todayPos >= 0 && timelineData.todayPos <= 100"
          class="absolute top-0 bottom-0 w-px bg-danger z-10"
          :style="{ left: `calc(13.25rem + (100% - 13.25rem) * ${timelineData.todayPos / 100})` }"
        >
          <div class="absolute -top-5 -translate-x-1/2 text-[10px] text-danger font-medium bg-card px-1.5 rounded">Today</div>
        </div>
      </div>
    </div>

    <!-- Detail Cards -->
    <div class="space-y-8">
      <div v-for="tracker in phdStore.trackers" :key="tracker.id" class="bg-card rounded-2xl overflow-hidden shadow-sm">
        <div class="flex items-center justify-between px-8 py-6 cursor-pointer hover:bg-hover/50 transition-colors" @click="expandedId = expandedId === tracker.id ? null : tracker.id">
          <div class="flex items-center gap-5">
            <div class="w-11 h-11 rounded-full bg-hover flex items-center justify-center text-sm font-medium text-text-secondary">
              {{ tracker.member_name.split(' ').map((n: string) => n[0]).join('') }}
            </div>
            <div>
              <h3 class="font-semibold text-text">{{ tracker.member_name }}</h3>
              <p class="text-sm text-text-secondary mt-0.5">
                {{ format(new Date(tracker.phd_start_date), 'MMM yyyy') }} - {{ format(new Date(tracker.expected_end_date), 'MMM yyyy') }}
                ({{ differenceInMonths(new Date(tracker.expected_end_date), new Date(tracker.phd_start_date)) }} months, {{ Math.max(0, differenceInMonths(today, new Date(tracker.phd_start_date))) }} elapsed)
              </p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <StatusBadge :status="tracker.status" />
            <div class="flex items-center gap-1">
              <button @click.stop="handleEdit(tracker)" class="p-2 rounded-lg hover:bg-hover text-text-muted transition-colors"><Edit2 :size="14" /></button>
              <button @click.stop="deleteConfirm = tracker.id" class="p-2 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"><Trash2 :size="14" /></button>
              <ChevronUp v-if="expandedId === tracker.id" :size="16" class="text-text-muted" />
              <ChevronDown v-else :size="16" class="text-text-muted" />
            </div>
          </div>
        </div>

        <div v-if="expandedId === tracker.id" class="px-8 pb-8 border-t border-border">
          <div v-if="tracker.notes" class="mt-6 mb-6 text-sm text-text-secondary bg-hover/60 rounded-xl p-6 leading-relaxed">{{ tracker.notes }}</div>

          <!-- Dissertation Chapters -->
          <div class="mt-7">
            <h4 class="text-sm font-semibold text-text mb-5 flex items-center gap-2"><BookOpen :size="14" /> Dissertation Chapters</h4>
            <div class="space-y-3">
              <div v-for="(ch, idx) in getChapters(tracker)" :key="ch.id" class="group bg-hover/50 rounded-xl px-6 py-4">
                <template v-if="editingChapterId === ch.id">
                  <div class="space-y-3">
                    <div class="flex items-center gap-3">
                      <span class="text-xs text-text-muted font-medium w-6">{{ idx + 1 }}.</span>
                      <input type="text" v-model="chapterForm.title" placeholder="Chapter title..." class="flex-1 border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" />
                      <select v-model="chapterForm.status" class="border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg">
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="finished">Finished</option>
                      </select>
                    </div>
                    <div class="ml-9">
                      <input type="text" v-model="chapterForm.reference" placeholder="APA reference (e.g., Author, A. (2024). Title. Journal, 1(2), 1-10.)" class="w-full border border-border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" />
                    </div>
                    <div class="ml-9 flex items-center gap-2">
                      <button @click="saveEditChapter(tracker)" class="px-4 py-2 bg-blue text-white text-xs rounded-lg hover:bg-blue-dark transition-colors">Save</button>
                      <button @click="cancelEditChapter" class="px-4 py-2 text-xs text-text-secondary border border-border rounded-lg hover:bg-hover transition-colors">Cancel</button>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-start gap-3">
                    <span class="text-xs text-text-muted font-medium w-6 mt-0.5">{{ idx + 1 }}.</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-sm font-medium text-text">{{ ch.title }}</span>
                        <span :class="['text-[10px] px-2.5 py-1 rounded-md font-medium', chapterStatusStyles[ch.status]]">{{ chapterStatusLabels[ch.status] }}</span>
                      </div>
                      <p v-if="ch.reference" class="text-xs text-text-secondary italic leading-relaxed">{{ ch.reference }}</p>
                    </div>
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button @click="startEditChapter(ch)" class="p-1.5 rounded-lg hover:bg-hover text-text-muted transition-colors"><Edit2 :size="12" /></button>
                      <button @click="deleteChapter(tracker, ch.id)" class="p-1.5 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"><Trash2 :size="12" /></button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
            <div v-if="editingChapterId === null" class="mt-6 pt-5 border-t border-border space-y-3">
              <div class="flex items-center gap-3">
                <input type="text" v-model="chapterForm.title" placeholder="Chapter title..." class="flex-1 border border-border rounded-xl px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" />
                <select v-model="chapterForm.status" class="border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg">
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="finished">Finished</option>
                </select>
              </div>
              <input type="text" v-model="chapterForm.reference" placeholder="APA reference..." class="w-full border border-border rounded-xl px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" />
              <button @click="addChapter(tracker)" class="px-4 py-2.5 bg-blue text-white text-sm rounded-xl hover:bg-blue-dark transition-colors">Add Chapter</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="phdStore.trackers.length === 0" class="text-center py-20 text-text-secondary">
      <GraduationCap :size="48" class="mx-auto mb-4 text-text-muted" />
      <p class="text-lg font-medium mb-1">No PhD trackers yet</p>
      <p class="text-sm">Add a PhD tracker to visualize student progress.</p>
    </div>

    <!-- Add/Edit Modal -->
    <Modal :open="showModal" @close="closeModal" :title="editingId ? 'Edit PhD Tracker' : 'Add PhD Tracker'">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-text mb-2">Team Member *</label>
          <select v-model.number="form.team_member_id" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" required :disabled="editingId !== null">
            <option :value="0">Select a member...</option>
            <option v-for="m in availableMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text mb-2">PhD Start Date *</label>
            <input type="date" v-model="form.phd_start_date" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-text mb-2">Expected End Date *</label>
            <input type="date" v-model="form.expected_end_date" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" required />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Status</label>
          <select v-model="form.status" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg">
            <option value="on_track">On Track</option>
            <option value="at_risk">At Risk</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Notes</label>
          <textarea v-model="form.notes" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 resize-none bg-bg" rows="3" placeholder="Any notes about the PhD progress..." />
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="closeModal" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
          <button type="submit" class="px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">{{ editingId ? 'Save Changes' : 'Add Tracker' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal :open="deleteConfirm !== null" @close="deleteConfirm = null" title="Delete PhD Tracker">
      <p class="text-sm text-text-secondary mb-6">Are you sure you want to delete this PhD tracker? All chapter data will be lost.</p>
      <div class="flex justify-end gap-3">
        <button @click="deleteConfirm = null" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
        <button @click="deleteConfirm && phdStore.deleteTracker(deleteConfirm).then(() => deleteConfirm = null)" class="px-5 py-2.5 bg-danger text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors">Delete</button>
      </div>
    </Modal>
  </div>
</template>
