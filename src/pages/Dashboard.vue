<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Users, GraduationCap, FolderKanban, FileText, Calendar } from 'lucide-vue-next'
import { format, isPast, isWithinInterval, addDays } from 'date-fns'
import { useTeamStore } from '@/stores/teamStore'
import { usePhdStore } from '@/stores/phdStore'
import { useProjectStore } from '@/stores/projectStore'
import { useMeetingStore } from '@/stores/meetingStore'
import StatusBadge from '@/components/StatusBadge.vue'
import type { Component } from 'vue'

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
    projectStore.loadUpcomingDeliverables(),
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
</script>

<template>
  <div v-if="!loaded" class="flex items-center justify-center h-64 text-text-secondary">Loading...</div>
  <div v-else class="grid grid-cols-[1fr_2fr_2fr_1fr] gap-x-8 gap-y-8 pb-12">
    <!-- Header -->
    <div class="col-start-2 col-span-2 pt-4 pb-4">
      <h1 class="text-2xl font-bold text-text">Dashboard</h1>
      <p class="text-text-secondary mt-2 text-sm">Here's your lab overview.</p>
    </div>

    <!-- Stat cards: 2 per row across the middle 2 cols -->
    <RouterLink
      v-for="(stat, i) in stats"
      :key="stat.label"
      :to="stat.link"
      :class="['bg-card rounded-2xl p-8 shadow-sm hover:shadow-md transition-all overflow-hidden min-w-0 flex flex-col items-center text-center', i % 2 === 0 ? 'col-start-2' : '']"
    >
      <div :class="['w-10 h-10 rounded-xl flex items-center justify-center mb-4', stat.color]">
        <component :is="stat.icon" :size="18" />
      </div>
      <p class="text-2xl font-bold text-text font-heading">{{ stat.value }}</p>
      <p class="text-xs text-text-secondary mt-1.5">{{ stat.label }}</p>
    </RouterLink>

    <!-- PhD Progress -->
    <div class="col-start-2 bg-card rounded-2xl p-8 shadow-sm mt-8 overflow-hidden min-w-0 flex flex-col items-center text-center">
      <h2 class="text-lg font-semibold text-text mb-2">PhD Progress</h2>
      <RouterLink to="/phd-progress" class="text-xs text-blue hover:text-blue-dark mb-6">View all</RouterLink>
      <p v-if="phdStore.trackers.length === 0" class="text-text-secondary text-sm py-4">No PhD students tracked yet.</p>
      <div v-else class="space-y-5 w-full">
        <div v-for="tracker in phdStore.trackers.slice(0, 5)" :key="tracker.id" class="flex items-center gap-4">
          <div class="w-9 h-9 rounded-full bg-hover flex items-center justify-center text-xs font-medium text-text-secondary shrink-0">
            {{ tracker.member_name.split(' ').map((n: string) => n[0]).join('') }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <p class="text-sm font-medium text-text truncate text-left">{{ tracker.member_name }}</p>
              <StatusBadge :status="tracker.status" />
            </div>
            <div class="w-full bg-hover rounded-full h-2">
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
          </div>
          <span class="text-xs text-text-muted w-10 text-right">{{ getProgress(tracker.phd_start_date, tracker.expected_end_date) }}%</span>
        </div>
      </div>
    </div>

    <!-- Upcoming Deliverables -->
    <div class="bg-card rounded-2xl p-8 shadow-sm mt-8 overflow-hidden min-w-0 flex flex-col items-center text-center">
      <h2 class="text-lg font-semibold text-text mb-2">Upcoming Deliverables</h2>
      <RouterLink to="/projects" class="text-xs text-blue hover:text-blue-dark mb-6">View all</RouterLink>
      <p v-if="projectStore.upcomingDeliverables.length === 0" class="text-text-secondary text-sm py-4">No upcoming deliverables.</p>
      <div v-else class="space-y-5 w-full">
        <div v-for="d in projectStore.upcomingDeliverables.slice(0, 6)" :key="d.id" class="flex items-center gap-4">
          <div class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: d.project_color }" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-text truncate text-left">{{ d.title }}</p>
            <p class="text-xs text-text-muted mt-0.5 text-left">{{ d.project_name }}</p>
          </div>
          <div v-if="d.due_date" class="flex items-center gap-1.5 shrink-0">
            <Calendar
              :size="12"
              :class="isPast(new Date(d.due_date)) ? 'text-danger' : isWithinInterval(new Date(d.due_date), { start: today, end: addDays(today, 7) }) ? 'text-warning' : 'text-text-muted'"
            />
            <span :class="[
              'text-xs',
              isPast(new Date(d.due_date)) ? 'text-danger font-medium' :
              isWithinInterval(new Date(d.due_date), { start: today, end: addDays(today, 7) }) ? 'text-warning' : 'text-text-muted',
            ]">
              {{ format(new Date(d.due_date), 'MMM d') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Meeting Notes — single column -->
    <div class="col-start-2 bg-card rounded-2xl p-8 shadow-sm mt-8 overflow-hidden min-w-0 flex flex-col items-center text-center">
      <h2 class="text-lg font-semibold text-text mb-2">Recent Meeting Notes</h2>
      <RouterLink to="/meetings" class="text-xs text-blue hover:text-blue-dark mb-6">View all</RouterLink>
      <p v-if="meetingStore.notes.length === 0" class="text-text-secondary text-sm py-4">No meeting notes yet.</p>
      <div v-else class="space-y-4 w-full">
        <RouterLink
          v-for="note in meetingStore.notes.slice(0, 3)"
          :key="note.id"
          :to="`/meetings?id=${note.id}`"
          class="block border border-border rounded-xl p-5 hover:shadow-md hover:border-blue/30 transition-all bg-hover/50 text-center"
        >
          <p class="text-sm font-medium text-text mb-1.5 truncate">{{ note.title }}</p>
          <p class="text-xs text-text-muted mb-3">{{ format(new Date(note.date), 'MMM d, yyyy') }}</p>
          <div class="flex items-center justify-center gap-1.5">
            <div
              v-for="a in note.attendees.slice(0, 3)"
              :key="a.team_member_id"
              class="w-6 h-6 rounded-full bg-hover flex items-center justify-center text-[10px] font-medium text-text-secondary"
              :title="a.name"
            >
              {{ a.name.split(' ').map((n: string) => n[0]).join('') }}
            </div>
            <span v-if="note.attendees.length > 3" class="text-xs text-text-muted">+{{ note.attendees.length - 3 }}</span>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>
