<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Flask body -->
    <path d="M12 4V12L5 24C4.2 25.4 5.2 27 6.8 27H25.2C26.8 27 27.8 25.4 27 24L20 12V4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <!-- Flask top -->
    <path d="M10 4H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <!-- Liquid level -->
    <path d="M8.5 20H23.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
    <!-- Bubbles -->
    <circle cx="14" cy="23" r="1.2" fill="currentColor" opacity="0.6" />
    <circle cx="18" cy="22" r="0.8" fill="currentColor" opacity="0.4" />
    <circle cx="16" cy="25" r="0.6" fill="currentColor" opacity="0.3" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 32 })
</script>
