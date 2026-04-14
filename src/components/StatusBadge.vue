<script setup lang="ts">
const props = withDefaults(defineProps<{
  status: string
  size?: 'sm' | 'md'
}>(), {
  size: 'sm',
})

const statusStyles: Record<string, string> = {
  active: 'bg-success/10 text-success',
  completed: 'bg-blue/10 text-blue',
  on_hold: 'bg-warning/10 text-warning',
  planned: 'bg-text-muted/10 text-text-muted',
  on_track: 'bg-success/10 text-success',
  at_risk: 'bg-warning/10 text-warning',
  overdue: 'bg-danger/10 text-danger',
  pending: 'bg-text-muted/10 text-text-muted',
  in_progress: 'bg-blue/10 text-blue',
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  on_hold: 'On Hold',
  planned: 'Planned',
  on_track: 'On Track',
  at_risk: 'At Risk',
  overdue: 'Overdue',
  pending: 'Pending',
  in_progress: 'In Progress',
}
</script>

<template>
  <span :class="[
    'inline-flex items-center rounded-md font-medium',
    statusStyles[props.status] || statusStyles.pending,
    props.size === 'sm' ? 'text-[11px] px-3 py-1' : 'text-xs px-3.5 py-1.5',
  ]">
    {{ statusLabels[props.status] || props.status }}
  </span>
</template>
