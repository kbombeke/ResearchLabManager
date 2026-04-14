<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Mail, Calendar, Edit2, Trash2, UserCheck, UserX, Users, Network } from 'lucide-vue-next'
import { format } from 'date-fns'
import { useTeamStore } from '@/stores/teamStore'
import type { TeamMember } from '@/types'
import Modal from '@/components/Modal.vue'
import Organigram from '@/components/Organigram.vue'

const teamStore = useTeamStore()

const emptyForm = { name: '', role: '', function_title: '', email: '', photo: '', start_date: '', is_active: 1 }

const currentTab = ref<'members' | 'organigram'>('members')
const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ ...emptyForm })
const reportsTo = ref<number | null>(null)
const showInactive = ref(false)
const deleteConfirm = ref<number | null>(null)

onMounted(() => {
  teamStore.loadMembers()
  teamStore.loadRelationships()
})

const filteredMembers = computed(() =>
  showInactive.value ? teamStore.members : teamStore.members.filter(m => m.is_active)
)

const availableParents = computed(() => {
  return teamStore.members.filter(m => {
    if (!m.is_active) return false
    if (editingId.value !== null && m.id === editingId.value) return false
    if (editingId.value !== null && teamStore.wouldCreateCycle(editingId.value, m.id)) return false
    return true
  })
})

async function handleSubmit() {
  if (!form.value.name.trim()) return
  let memberId: number
  if (editingId.value) {
    await teamStore.updateMember(editingId.value, form.value)
    memberId = editingId.value
  } else {
    memberId = await teamStore.addMember(form.value)
  }

  if (reportsTo.value !== null) {
    await teamStore.setParent(memberId, reportsTo.value)
  } else if (editingId.value) {
    await teamStore.removeParent(memberId)
  }

  closeModal()
}

function handleEdit(member: TeamMember) {
  editingId.value = member.id
  form.value = {
    name: member.name,
    role: member.role,
    function_title: member.function_title,
    email: member.email,
    photo: member.photo,
    start_date: member.start_date,
    is_active: member.is_active,
  }
  reportsTo.value = teamStore.getParentId(member.id)
  showModal.value = true
}

async function handleDelete(id: number) {
  await teamStore.deleteMember(id)
  deleteConfirm.value = null
}

function openNew() {
  form.value = { ...emptyForm }
  editingId.value = null
  reportsTo.value = null
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingId.value = null
  form.value = { ...emptyForm }
  reportsTo.value = null
}
</script>

<template>
  <div v-if="teamStore.loading && teamStore.members.length === 0" class="flex items-center justify-center h-64 text-text-secondary">Loading...</div>
  <div v-else>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-text">Team</h1>
        <p class="text-text-secondary mt-2">{{ filteredMembers.length }} members</p>
      </div>
      <div class="flex items-center gap-3">
        <button v-if="currentTab === 'members'" @click="showInactive = !showInactive" class="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">
          <UserX v-if="showInactive" :size="16" />
          <UserCheck v-else :size="16" />
          {{ showInactive ? 'Hide Inactive' : 'Show Inactive' }}
        </button>
        <button @click="openNew" class="flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">
          <Plus :size="16" />
          Add Member
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex items-center gap-1 bg-hover rounded-xl p-1 mb-8 w-fit">
      <button
        @click="currentTab = 'members'"
        :class="['flex items-center gap-2 px-5 py-2 text-sm rounded-lg transition-colors', currentTab === 'members' ? 'bg-card text-text font-medium shadow-sm' : 'text-text-secondary hover:text-text']"
      >
        <Users :size="14" />
        Members
      </button>
      <button
        @click="currentTab = 'organigram'"
        :class="['flex items-center gap-2 px-5 py-2 text-sm rounded-lg transition-colors', currentTab === 'organigram' ? 'bg-card text-text font-medium shadow-sm' : 'text-text-secondary hover:text-text']"
      >
        <Network :size="14" />
        Organigram
      </button>
    </div>

    <!-- Members Grid -->
    <template v-if="currentTab === 'members'">
      <div class="grid grid-cols-3 gap-6">
        <div
          v-for="member in filteredMembers"
          :key="member.id"
          :class="['bg-card rounded-2xl p-8 shadow-sm transition-all hover:shadow-md', !member.is_active ? 'opacity-60' : '']"
        >
          <div class="flex items-start justify-between mb-6">
            <div class="flex items-center gap-5">
              <div class="w-12 h-12 rounded-full bg-hover flex items-center justify-center text-sm font-medium text-text-secondary">
                {{ member.name.split(' ').map((n: string) => n[0]).join('') }}
              </div>
              <div>
                <h3 class="font-semibold text-text text-sm">{{ member.name }}</h3>
                <p v-if="member.function_title" class="text-xs text-blue mt-0.5">{{ member.function_title }}</p>
                <p class="text-xs text-text-secondary mt-0.5">{{ member.role }}</p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <button @click="handleEdit(member)" class="p-2 rounded-lg hover:bg-hover text-text-muted transition-colors">
                <Edit2 :size="14" />
              </button>
              <button @click="deleteConfirm = member.id" class="p-2 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>

          <div v-if="member.email || member.start_date" class="mt-5 bg-hover/60 rounded-xl px-5 py-4 space-y-3">
            <div v-if="member.email" class="flex items-center gap-3 text-xs text-text-secondary">
              <Mail :size="14" class="shrink-0 text-text-muted" />
              <span class="truncate">{{ member.email }}</span>
            </div>
            <div v-if="member.start_date" class="flex items-center gap-3 text-xs text-text-secondary">
              <Calendar :size="14" class="shrink-0 text-text-muted" />
              <span>Joined {{ format(new Date(member.start_date), 'MMM yyyy') }}</span>
            </div>
          </div>

          <div v-if="!member.is_active" class="mt-4 text-xs text-text-muted bg-hover rounded-lg px-4 py-1.5 inline-block">Inactive</div>
        </div>
      </div>

      <div v-if="filteredMembers.length === 0" class="text-center py-20 text-text-secondary">
        <Users :size="48" class="mx-auto mb-4 text-text-muted" />
        <p class="text-lg font-medium mb-1">No team members yet</p>
        <p class="text-sm">Add your first team member to get started.</p>
      </div>
    </template>

    <!-- Organigram -->
    <template v-else>
      <Organigram />
    </template>

    <!-- Add/Edit Modal -->
    <Modal :open="showModal" @close="closeModal" :title="editingId ? 'Edit Team Member' : 'Add Team Member'">
      <form @submit.prevent="handleSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-text mb-2">Name *</label>
          <input type="text" v-model="form.name" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue bg-bg" placeholder="Full name" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Role</label>
          <input type="text" v-model="form.role" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue bg-bg" placeholder="e.g., PhD Researcher, Postdoc, Professor" />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Function Title</label>
          <input type="text" v-model="form.function_title" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue bg-bg" placeholder="e.g., Lab Director, Team Lead, WP Coordinator" />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Email</label>
          <input type="email" v-model="form.email" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue bg-bg" placeholder="email@university.edu" />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Start Date</label>
          <input type="date" v-model="form.start_date" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue bg-bg" />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Reports to</label>
          <select v-model="reportsTo" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 focus:border-blue bg-bg">
            <option :value="null">No one (top level)</option>
            <option v-for="m in availableParents" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="is_active" :checked="form.is_active === 1" @change="form.is_active = ($event.target as HTMLInputElement).checked ? 1 : 0" class="rounded border-border" />
          <label for="is_active" class="text-sm text-text">Active member</label>
        </div>
        <div class="flex justify-end gap-3 pt-3">
          <button type="button" @click="closeModal" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
          <button type="submit" class="px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">{{ editingId ? 'Save Changes' : 'Add Member' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal :open="deleteConfirm !== null" @close="deleteConfirm = null" title="Delete Team Member">
      <p class="text-sm text-text-secondary mb-6">Are you sure you want to delete this team member? This will also remove them from all projects and meetings.</p>
      <div class="flex justify-end gap-3">
        <button @click="deleteConfirm = null" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
        <button @click="deleteConfirm && handleDelete(deleteConfirm)" class="px-5 py-2.5 bg-danger text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors">Delete</button>
      </div>
    </Modal>
  </div>
</template>
