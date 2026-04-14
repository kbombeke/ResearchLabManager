import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { TeamMember, TeamMemberRelationship, OrgTreeNode } from '@/types'
import * as teamQueries from '@/db/teamQueries'

export const useTeamStore = defineStore('team', () => {
  const members = ref<TeamMember[]>([])
  const relationships = ref<TeamMemberRelationship[]>([])
  const loading = ref(false)

  async function loadMembers() {
    loading.value = true
    members.value = await teamQueries.getAllTeamMembers()
    loading.value = false
  }

  async function loadRelationships() {
    relationships.value = await teamQueries.getAllRelationships()
  }

  async function addMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    const id = await teamQueries.createTeamMember(member)
    members.value = await teamQueries.getAllTeamMembers()
    return id
  }

  async function updateMember(id: number, member: Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>>) {
    await teamQueries.updateTeamMember(id, member)
    members.value = await teamQueries.getAllTeamMembers()
  }

  async function deleteMember(id: number) {
    await teamQueries.deleteTeamMember(id)
    members.value = await teamQueries.getAllTeamMembers()
    relationships.value = await teamQueries.getAllRelationships()
  }

  async function setParent(memberId: number, parentId: number) {
    await teamQueries.setParent(memberId, parentId)
    relationships.value = await teamQueries.getAllRelationships()
  }

  async function removeParent(memberId: number) {
    await teamQueries.removeParent(memberId)
    relationships.value = await teamQueries.getAllRelationships()
  }

  function getParentId(memberId: number): number | null {
    const rel = relationships.value.find(r => r.member_id === memberId)
    return rel ? rel.parent_id : null
  }

  function wouldCreateCycle(memberId: number, proposedParentId: number): boolean {
    let current: number | null = proposedParentId
    const visited = new Set<number>()
    while (current !== null) {
      if (current === memberId) return true
      if (visited.has(current)) return false
      visited.add(current)
      const rel = relationships.value.find(r => r.member_id === current)
      current = rel ? rel.parent_id : null
    }
    return false
  }

  const orgTree = computed<OrgTreeNode[]>(() => {
    const parentMap = new Map<number, number>()
    for (const rel of relationships.value) {
      parentMap.set(rel.member_id, rel.parent_id)
    }

    const activeMembers = members.value.filter(m => m.is_active)
    const childrenMap = new Map<number, TeamMember[]>()
    const roots: TeamMember[] = []

    for (const member of activeMembers) {
      const pid = parentMap.get(member.id)
      if (pid !== undefined && activeMembers.some(m => m.id === pid)) {
        if (!childrenMap.has(pid)) childrenMap.set(pid, [])
        childrenMap.get(pid)!.push(member)
      } else {
        roots.push(member)
      }
    }

    function buildNode(member: TeamMember): OrgTreeNode {
      const kids = childrenMap.get(member.id) || []
      return { member, children: kids.map(buildNode) }
    }

    return roots.map(buildNode)
  })

  return {
    members, relationships, loading,
    loadMembers, loadRelationships,
    addMember, updateMember, deleteMember,
    setParent, removeParent, getParentId, wouldCreateCycle,
    orgTree,
  }
})
