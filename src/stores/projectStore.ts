import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Project, Deliverable, DeliverableWithAssignee } from '@/types'
import * as projectQueries from '@/db/projectQueries'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const upcomingDeliverables = ref<DeliverableWithAssignee[]>([])
  const loading = ref(false)

  async function loadProjects() {
    loading.value = true
    projects.value = await projectQueries.getAllProjects()
    loading.value = false
  }

  async function loadUpcomingDeliverables() {
    upcomingDeliverables.value = await projectQueries.getAllUpcomingDeliverables()
  }

  async function addProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) {
    await projectQueries.createProject(project)
    projects.value = await projectQueries.getAllProjects()
  }

  async function updateProject(id: number, project: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>) {
    await projectQueries.updateProject(id, project)
    projects.value = await projectQueries.getAllProjects()
  }

  async function deleteProject(id: number) {
    await projectQueries.deleteProject(id)
    projects.value = await projectQueries.getAllProjects()
  }

  async function addDeliverable(deliverable: Omit<Deliverable, 'id' | 'created_at' | 'updated_at'>) {
    await projectQueries.createDeliverable(deliverable)
    upcomingDeliverables.value = await projectQueries.getAllUpcomingDeliverables()
  }

  async function updateDeliverable(id: number, deliverable: Partial<Omit<Deliverable, 'id' | 'created_at' | 'updated_at'>>) {
    await projectQueries.updateDeliverable(id, deliverable)
    upcomingDeliverables.value = await projectQueries.getAllUpcomingDeliverables()
  }

  async function deleteDeliverable(id: number) {
    await projectQueries.deleteDeliverable(id)
    upcomingDeliverables.value = await projectQueries.getAllUpcomingDeliverables()
  }

  async function addProjectMember(projectId: number, teamMemberId: number, role: string) {
    await projectQueries.addProjectMember(projectId, teamMemberId, role)
  }

  async function removeProjectMember(projectId: number, teamMemberId: number) {
    await projectQueries.removeProjectMember(projectId, teamMemberId)
  }

  return {
    projects, upcomingDeliverables, loading,
    loadProjects, loadUpcomingDeliverables,
    addProject, updateProject, deleteProject,
    addDeliverable, updateDeliverable, deleteDeliverable,
    addProjectMember, removeProjectMember,
  }
})
