import { createRouter, createWebHistory } from 'vue-router'
import Layout from '@/components/Layout.vue'
import Dashboard from '@/pages/Dashboard.vue'
import Team from '@/pages/Team.vue'
import PhdProgress from '@/pages/PhdProgress.vue'
import Projects from '@/pages/Projects.vue'
import MeetingNotes from '@/pages/MeetingNotes.vue'
import Settings from '@/pages/Settings.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', component: Dashboard },
        { path: 'team', component: Team },
        { path: 'phd-progress', component: PhdProgress },
        { path: 'projects', component: Projects },
        { path: 'meetings', component: MeetingNotes },
        { path: 'settings', component: Settings },
      ],
    },
  ],
})

export default router
