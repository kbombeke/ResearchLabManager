<script setup lang="ts">
import { ref, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useTeamStore } from '@/stores/teamStore'
import type { OrgTreeNode } from '@/types'
import OrgNode from './OrgNode.vue'
import { Network } from 'lucide-vue-next'

const teamStore = useTeamStore()
const containerRef = ref<HTMLElement>()
const lines = ref<string[]>([])
let resizeObserver: ResizeObserver | null = null

function computeLines() {
  if (!containerRef.value) { lines.value = []; return }
  const containerRect = containerRef.value.getBoundingClientRect()
  const newLines: string[] = []

  function walkTree(node: OrgTreeNode) {
    const parentEl = containerRef.value!.querySelector(`[data-member-id="${node.member.id}"]`)
    if (!parentEl) return
    const parentRect = parentEl.getBoundingClientRect()
    const px = parentRect.left + parentRect.width / 2 - containerRect.left
    const py = parentRect.bottom - containerRect.top

    for (const child of node.children) {
      const childEl = containerRef.value!.querySelector(`[data-member-id="${child.member.id}"]`)
      if (!childEl) continue
      const childRect = childEl.getBoundingClientRect()
      const cx = childRect.left + childRect.width / 2 - containerRect.left
      const cy = childRect.top - containerRect.top
      const midY = py + (cy - py) / 2

      newLines.push(`M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`)
      walkTree(child)
    }
  }

  for (const root of teamStore.orgTree) walkTree(root)
  lines.value = newLines
}

function refreshLines() {
  requestAnimationFrame(() => {
    computeLines()
    if (containerRef.value && !resizeObserver) {
      resizeObserver = new ResizeObserver(() => requestAnimationFrame(computeLines))
      resizeObserver.observe(containerRef.value)
    }
  })
}

onMounted(() => {
  nextTick(refreshLines)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(() => teamStore.orgTree, () => {
  nextTick(refreshLines)
}, { deep: true })
</script>

<template>
  <div v-if="teamStore.orgTree.length === 0" class="text-center py-20 text-text-secondary">
    <Network :size="48" class="mx-auto mb-4 text-text-muted" />
    <p class="text-lg font-medium mb-1">No organigram data yet</p>
    <p class="text-sm">Add team members and set reporting relationships to build the organigram.</p>
  </div>
  <div v-else class="overflow-x-auto pb-8">
    <div ref="containerRef" class="relative inline-block min-w-full py-4 px-4">
      <svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 0">
        <path v-for="(d, i) in lines" :key="i" :d="d"
          stroke="var(--color-border)" stroke-width="2" fill="none" />
      </svg>
      <div class="relative flex gap-12 justify-center" style="z-index: 1">
        <OrgNode v-for="root in teamStore.orgTree" :key="root.member.id" :node="root" />
      </div>
    </div>
  </div>
</template>
