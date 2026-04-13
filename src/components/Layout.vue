<script setup lang="ts">
import Sidebar from './Sidebar.vue'
</script>

<template>
  <div class="flex h-screen bg-bg">
    <Sidebar />
    <main class="flex-1 overflow-auto">
      <div class="pl-20 pr-16 py-12 max-w-[1400px]">
        <router-view />
      </div>
    </main>
  </div>
</template>
