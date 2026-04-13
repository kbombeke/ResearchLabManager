import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TeamMember } from '@/types'
import * as teamQueries from '@/db/teamQueries'

export const useTeamStore = defineStore('team', () => {
  const members = ref<TeamMember[]>([])
  const loading = ref(false)

  async function loadMembers() {
    loading.value = true
    members.value = await teamQueries.getAllTeamMembers()
    loading.value = false
  }

  async function addMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) {
    await teamQueries.createTeamMember(member)
    members.value = await teamQueries.getAllTeamMembers()
  }

  async function updateMember(id: number, member: Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>>) {
    await teamQueries.updateTeamMember(id, member)
    members.value = await teamQueries.getAllTeamMembers()
  }

  async function deleteMember(id: number) {
    await teamQueries.deleteTeamMember(id)
    members.value = await teamQueries.getAllTeamMembers()
  }

  return { members, loading, loadMembers, addMember, updateMember, deleteMember }
})
