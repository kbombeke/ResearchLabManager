<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { LayoutDashboard, Users, GraduationCap, FolderKanban, FileText, Settings } from 'lucide-vue-next'
import type { Component } from 'vue'
import AppLogo from './AppLogo.vue'

const route = useRoute()

const navItems: { to: string; icon: Component; label: string }[] = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/phd-progress', icon: GraduationCap, label: 'PhD Progress' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/meetings', icon: FileText, label: 'Meeting Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path.startsWith(to)
}
</script>

<template>
  <aside class="w-64 bg-sidebar text-white flex flex-col shrink-0 h-full">
    <div class="px-8 pt-8 pb-6">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-blue flex items-center justify-center text-white">
          <AppLogo :size="24" />
        </div>
        <div>
          <h1 class="text-[13px] font-semibold leading-tight">Research Lab</h1>
          <p class="text-[11px] text-white/40 leading-tight">Manager</p>
        </div>
      </div>
    </div>

    <nav class="flex-1 px-4 pb-4">
      <p class="text-[10px] uppercase tracking-widest text-white/30 font-medium px-4 mb-3">Menu</p>
      <ul class="space-y-1">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            :class="[
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] transition-colors',
              isActive(item.to)
                ? 'bg-sidebar-active text-white font-medium'
                : 'text-white/50 hover:text-white/80 hover:bg-sidebar-hover',
            ]"
          >
            <component :is="item.icon" :size="17" :stroke-width="1.8" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </aside>
</template>
