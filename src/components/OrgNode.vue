<script setup lang="ts">
import type { OrgTreeNode } from '@/types'

defineProps<{ node: OrgTreeNode }>()

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('')
}
</script>

<template>
  <div class="flex flex-col items-center">
    <div
      :data-member-id="node.member.id"
      class="bg-card rounded-2xl px-8 py-5 shadow-sm border border-border text-center min-w-[180px]"
    >
      <div class="w-11 h-11 rounded-full bg-hover flex items-center justify-center text-sm font-medium text-text-secondary mx-auto mb-2.5">
        {{ getInitials(node.member.name) }}
      </div>
      <p class="text-sm font-semibold text-text">{{ node.member.name }}</p>
      <p v-if="node.member.function_title" class="text-xs text-blue mt-1">{{ node.member.function_title }}</p>
      <p v-if="node.member.role" class="text-xs text-text-muted mt-0.5">{{ node.member.role }}</p>
    </div>
    <div v-if="node.children.length > 0" class="flex gap-8 mt-10">
      <OrgNode v-for="child in node.children" :key="child.member.id" :node="child" />
    </div>
  </div>
</template>
