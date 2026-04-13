<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  open: boolean
  title: string
  width?: string
}>()

const emit = defineEmits<{
  close: []
}>()

function handleEsc(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

watch(() => props.open, (val) => {
  if (val) {
    document.addEventListener('keydown', handleEsc)
  } else {
    document.removeEventListener('keydown', handleEsc)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
})
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-sidebar/40" @click="emit('close')" />
    <div :class="['relative bg-card rounded-2xl shadow-xl w-full mx-4 max-h-[90vh] flex flex-col', width || 'max-w-lg']">
      <div class="flex items-center justify-between px-8 py-6 border-b border-border">
        <h2 class="text-base font-semibold text-text">{{ title }}</h2>
        <button @click="emit('close')" class="p-1.5 rounded-lg hover:bg-hover text-text-muted transition-colors">
          <X :size="16" />
        </button>
      </div>
      <div class="overflow-y-auto px-8 py-6">
        <slot />
      </div>
    </div>
  </div>
</template>
