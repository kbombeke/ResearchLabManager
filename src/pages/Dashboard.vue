<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Users, GraduationCap, FolderKanban, FileText, BookOpen } from 'lucide-vue-next'
import { useTeamStore } from '@/stores/teamStore'
import { usePhdStore } from '@/stores/phdStore'
import { useProjectStore } from '@/stores/projectStore'
import { useMeetingStore } from '@/stores/meetingStore'
import StatusBadge from '@/components/StatusBadge.vue'
import type { Component } from 'vue'
import type { DissertationChapter, PhdTrackerWithMember } from '@/types'

const teamStore = useTeamStore()
const phdStore = usePhdStore()
const projectStore = useProjectStore()
const meetingStore = useMeetingStore()
const loaded = ref(false)

onMounted(async () => {
  await Promise.all([
    teamStore.loadMembers(),
    phdStore.loadTrackers(),
    projectStore.loadProjects(),
    meetingStore.loadNotes(),
  ])
  loaded.value = true
})

const activeMembers = computed(() => teamStore.members.filter(m => m.is_active))
const activeProjects = computed(() => projectStore.projects.filter(p => p.status === 'active'))
const today = new Date()

const stats = computed<{ label: string; value: number; icon: Component; color: string; link: string }[]>(() => [
  { label: 'Team Members', value: activeMembers.value.length, icon: Users, color: 'bg-blue/10 text-blue', link: '/team' },
  { label: 'PhD Students', value: phdStore.trackers.length, icon: GraduationCap, color: 'bg-purple/10 text-purple', link: '/phd-progress' },
  { label: 'Active Projects', value: activeProjects.value.length, icon: FolderKanban, color: 'bg-success/10 text-success', link: '/projects' },
  { label: 'Meeting Notes', value: meetingStore.notes.length, icon: FileText, color: 'bg-warning/10 text-warning', link: '/meetings' },
])

function getProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const elapsed = today.getTime() - start
  return Math.min(Math.max(Math.round((elapsed / (end - start)) * 100), 0), 100)
}

function getChapters(tracker: PhdTrackerWithMember): DissertationChapter[] {
  try { return JSON.parse(tracker.chapters || '[]') } catch { return [] }
}

function getFinishedChapters(tracker: PhdTrackerWithMember) {
  return getChapters(tracker).filter(c => c.status === 'finished').length
}
</script>

<template>
  <div v-if="!loaded" class="flex items-center justify-center h-64 text-text-secondary">Loading...</div>
  <div v-else>
    <div class="mb-10">
      <h1 class="text-2xl font-bold text-text">Dashboard</h1>
      <p class="text-text-secondary mt-2 text-sm">Here's your lab overview.</p>
    </div>

    <!-- Stat cards: 4 in one row -->
    <div class="grid grid-cols-4 gap-5 mb-10">
      <RouterLink
        v-for="stat in stats"
        :key="stat.label"
        :to="stat.link"
        class="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center"
      >
        <div :class="['w-10 h-10 rounded-xl flex items-center justify-center mb-3', stat.color]">
          <component :is="stat.icon" :size="18" />
        </div>
        <p class="text-2xl font-bold text-text font-heading">{{ stat.value }}</p>
        <p class="text-xs text-text-secondary mt-1">{{ stat.label }}</p>
      </RouterLink>
    </div>

    <!-- PhD Progress - full width, all trackers -->
    <div class="bg-card rounded-2xl p-10 shadow-sm">
      <h2 class="text-lg font-semibold text-text mb-6 text-center">PhD Progress</h2>
      <p v-if="phdStore.trackers.length === 0" class="text-text-secondary text-sm py-4 text-center">No PhD students tracked yet.</p>
      <div v-else class="space-y-10">
        <div v-for="tracker in phdStore.trackers" :key="tracker.id" class="flex items-center gap-5">
          <div class="w-9 h-9 rounded-full bg-hover flex items-center justify-center text-xs font-medium text-text-secondary shrink-0 overflow-hidden">
            <img v-if="tracker.member_photo" :src="tracker.member_photo" class="w-full h-full object-cover" />
            <template v-else>{{ tracker.member_name.split(' ').map((n: string) => n[0]).join('') }}</template>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-text truncate text-left">{{ tracker.member_name }}</p>
              <StatusBadge :status="tracker.status" />
            </div>
            <!-- Time-based progress -->
            <div class="flex items-center gap-3 mb-1.5">
              <span class="text-[10px] text-text-muted w-12 shrink-0 text-left">Time</span>
              <div class="flex-1 bg-hover rounded-full h-2">
                <div
                  :class="[
                    'h-2 rounded-full',
                    tracker.status === 'on_track' ? 'bg-success' :
                    tracker.status === 'at_risk' ? 'bg-warning' :
                    tracker.status === 'overdue' ? 'bg-danger' : 'bg-blue',
                  ]"
                  :style="{ width: `${getProgress(tracker.phd_start_date, tracker.expected_end_date)}%` }"
                />
              </div>
              <span class="text-xs text-text-muted w-10 text-right shrink-0">{{ getProgress(tracker.phd_start_date, tracker.expected_end_date) }}%</span>
            </div>
            <!-- Chapter-based progress -->
            <div class="flex items-center gap-3">
              <span class="text-[10px] text-text-muted w-12 shrink-0 text-left">Chapters</span>
              <div class="flex-1 flex items-center gap-1.5 flex-wrap">
                <template v-if="getChapters(tracker).length > 0">
                  <BookOpen
                    v-for="(ch, i) in getChapters(tracker)"
                    :key="i"
                    :size="22"
                    :class="ch.status === 'finished' ? 'text-purple' : 'text-text-muted/30'"
                  />
                </template>
                <span v-else class="text-[10px] text-text-muted">No chapters yet</span>
              </div>
              <span class="text-xs text-text-muted w-10 text-right shrink-0">{{ getFinishedChapters(tracker) }}/{{ getChapters(tracker).length }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
