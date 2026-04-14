<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Plus, Edit2, Trash2, FolderKanban, Users, Calendar, ChevronDown, ChevronUp, Package, Banknote } from 'lucide-vue-next'
import { format } from 'date-fns'
import { useProjectStore } from '@/stores/projectStore'
import { useTeamStore } from '@/stores/teamStore'
import type { Project, Deliverable, ProjectMember } from '@/types'
import * as projectQueries from '@/db/projectQueries'
import Modal from '@/components/Modal.vue'
import StatusBadge from '@/components/StatusBadge.vue'

const projectStore = useProjectStore()
const teamStore = useTeamStore()

const projectColors = ['#4a90d9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']
const emptyProjectForm = { name: '', description: '', funding: '', status: 'active' as Project['status'], start_date: '', end_date: '', color: '#4a90d9' }
const emptyDeliverableForm = { title: '', description: '', due_date: '', status: 'pending' as Deliverable['status'], assigned_to: null as number | null }

const showProjectModal = ref(false)
const showDeliverableModal = ref(false)
const showMemberModal = ref(false)
const editingProjectId = ref<number | null>(null)
const editingDeliverableId = ref<number | null>(null)
const activeProjectId = ref<number | null>(null)
const projectForm = ref({ ...emptyProjectForm })
const deliverableForm = ref({ ...emptyDeliverableForm })
const expandedId = ref<number | null>(null)
const deleteConfirm = ref<{ type: 'project' | 'deliverable'; id: number } | null>(null)
const projectDetails = ref<Record<number, { members: (ProjectMember & { member_name: string })[]; deliverables: Deliverable[] }>>({})

onMounted(() => { projectStore.loadProjects(); teamStore.loadMembers() })

async function loadProjectDetails(projectId: number) {
  const [members, deliverables] = await Promise.all([
    projectQueries.getProjectMembers(projectId),
    projectQueries.getProjectDeliverables(projectId),
  ])
  projectDetails.value[projectId] = { members, deliverables }
}

async function toggleExpand(projectId: number) {
  if (expandedId.value === projectId) { expandedId.value = null; return }
  expandedId.value = projectId
  if (!projectDetails.value[projectId]) await loadProjectDetails(projectId)
}

async function handleProjectSubmit() {
  if (!projectForm.value.name.trim()) return
  if (editingProjectId.value) { await projectStore.updateProject(editingProjectId.value, projectForm.value) }
  else { await projectStore.addProject(projectForm.value) }
  showProjectModal.value = false; editingProjectId.value = null; projectForm.value = { ...emptyProjectForm }
}

function handleEditProject(project: Project) {
  editingProjectId.value = project.id
  projectForm.value = { name: project.name, description: project.description, funding: project.funding, status: project.status, start_date: project.start_date, end_date: project.end_date, color: project.color }
  showProjectModal.value = true
}

async function handleDeliverableSubmit() {
  if (!deliverableForm.value.title.trim() || !activeProjectId.value) return
  if (editingDeliverableId.value) { await projectStore.updateDeliverable(editingDeliverableId.value, deliverableForm.value) }
  else { await projectStore.addDeliverable({ ...deliverableForm.value, project_id: activeProjectId.value }) }
  await loadProjectDetails(activeProjectId.value)
  showDeliverableModal.value = false; editingDeliverableId.value = null; deliverableForm.value = { ...emptyDeliverableForm }
}

function handleEditDeliverable(d: Deliverable) {
  editingDeliverableId.value = d.id; activeProjectId.value = d.project_id
  deliverableForm.value = { title: d.title, description: d.description, due_date: d.due_date, status: d.status, assigned_to: d.assigned_to }
  showDeliverableModal.value = true
}

async function handleAddMember(projectId: number, memberId: number) {
  await projectStore.addProjectMember(projectId, memberId, '')
  await loadProjectDetails(projectId)
}

async function handleRemoveMember(projectId: number, memberId: number) {
  await projectStore.removeProjectMember(projectId, memberId)
  await loadProjectDetails(projectId)
}

async function handleDelete() {
  if (!deleteConfirm.value) return
  if (deleteConfirm.value.type === 'project') { await projectStore.deleteProject(deleteConfirm.value.id) }
  else { await projectStore.deleteDeliverable(deleteConfirm.value.id); if (expandedId.value) await loadProjectDetails(expandedId.value) }
  deleteConfirm.value = null
}

const activeMembers = computed(() => teamStore.members.filter(m => m.is_active))
</script>

<template>
  <div v-if="projectStore.loading && projectStore.projects.length === 0" class="flex items-center justify-center h-64 text-text-secondary">Loading...</div>
  <div v-else>
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-text">Projects</h1>
        <p class="text-text-secondary mt-2">{{ projectStore.projects.length }} projects</p>
      </div>
      <button @click="projectForm = { ...emptyProjectForm }; editingProjectId = null; showProjectModal = true" class="flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">
        <Plus :size="16" /> New Project
      </button>
    </div>

    <div class="space-y-8">
      <div v-for="project in projectStore.projects" :key="project.id" class="bg-card rounded-2xl overflow-hidden shadow-sm">
        <div class="flex items-center justify-between px-8 py-6 cursor-pointer hover:bg-hover/50 transition-colors" @click="toggleExpand(project.id)">
          <div class="flex items-center gap-5">
            <div class="w-3 h-10 rounded-full shrink-0" :style="{ backgroundColor: project.color }" />
            <div>
              <h3 class="font-semibold text-text">{{ project.name }}</h3>
              <p v-if="project.description" class="text-sm text-text-secondary mt-0.5 line-clamp-1">{{ project.description }}</p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <StatusBadge :status="project.status" />
            <span v-if="project.funding" class="text-xs text-text-muted flex items-center gap-1">
              <Banknote :size="12" />
              {{ project.funding }}
            </span>
            <span v-if="project.start_date" class="text-xs text-text-muted flex items-center gap-1">
              <Calendar :size="12" />
              {{ format(new Date(project.start_date), 'MMM yyyy') }}{{ project.end_date ? ` - ${format(new Date(project.end_date), 'MMM yyyy')}` : '' }}
            </span>
            <div class="flex items-center gap-1">
              <button @click.stop="handleEditProject(project)" class="p-1.5 rounded-md hover:bg-hover text-text-muted transition-colors"><Edit2 :size="14" /></button>
              <button @click.stop="deleteConfirm = { type: 'project', id: project.id }" class="p-1.5 rounded-md hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"><Trash2 :size="14" /></button>
              <ChevronUp v-if="expandedId === project.id" :size="16" class="text-text-muted" />
              <ChevronDown v-else :size="16" class="text-text-muted" />
            </div>
          </div>
        </div>

        <div v-if="expandedId === project.id" class="px-8 pb-8 border-t border-border">
          <div class="grid grid-cols-2 gap-8 mt-6">
            <!-- Team Members -->
            <div>
              <div class="flex items-center justify-between mb-5">
                <h4 class="text-sm font-semibold text-text flex items-center gap-2"><Users :size="14" /> Team Members</h4>
                <button @click="activeProjectId = project.id; showMemberModal = true" class="text-xs text-blue hover:text-blue-dark">+ Add</button>
              </div>
              <p v-if="projectDetails[project.id]?.members.length === 0" class="text-sm text-text-muted">No members assigned yet.</p>
              <div class="space-y-2.5">
                <div v-for="pm in projectDetails[project.id]?.members" :key="pm.id" class="flex items-center justify-between group bg-hover/50 rounded-xl px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-hover flex items-center justify-center text-xs font-medium text-text-secondary">{{ pm.member_name.split(' ').map((n: string) => n[0]).join('') }}</div>
                    <span class="text-sm text-text">{{ pm.member_name }}</span>
                  </div>
                  <button @click="handleRemoveMember(project.id, pm.team_member_id)" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-all"><Trash2 :size="12" /></button>
                </div>
              </div>
            </div>
            <!-- Deliverables -->
            <div>
              <div class="flex items-center justify-between mb-5">
                <h4 class="text-sm font-semibold text-text flex items-center gap-2"><Package :size="14" /> Deliverables</h4>
                <button @click="activeProjectId = project.id; deliverableForm = { ...emptyDeliverableForm }; editingDeliverableId = null; showDeliverableModal = true" class="text-xs text-blue hover:text-blue-dark">+ Add</button>
              </div>
              <p v-if="projectDetails[project.id]?.deliverables.length === 0" class="text-sm text-text-muted">No deliverables yet.</p>
              <div class="space-y-2.5">
                <div v-for="d in projectDetails[project.id]?.deliverables" :key="d.id" class="flex items-center justify-between group bg-hover/50 rounded-xl px-6 py-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-text truncate">{{ d.title }}</span>
                      <StatusBadge :status="d.status" />
                    </div>
                    <p v-if="d.due_date" class="text-xs text-text-muted mt-0.5">{{ format(new Date(d.due_date), 'MMM d, yyyy') }}</p>
                  </div>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="handleEditDeliverable(d)" class="p-1 rounded hover:bg-hover text-text-muted transition-colors"><Edit2 :size="12" /></button>
                    <button @click="deleteConfirm = { type: 'deliverable', id: d.id }" class="p-1 rounded hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"><Trash2 :size="12" /></button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="projectStore.projects.length === 0" class="text-center py-20 text-text-secondary">
      <FolderKanban :size="48" class="mx-auto mb-4 text-text-muted" />
      <p class="text-lg font-medium mb-1">No projects yet</p>
      <p class="text-sm">Create your first project to start tracking deliverables.</p>
    </div>

    <!-- Project Modal -->
    <Modal :open="showProjectModal" @close="showProjectModal = false; editingProjectId = null; projectForm = { ...emptyProjectForm }" :title="editingProjectId ? 'Edit Project' : 'New Project'">
      <form @submit.prevent="handleProjectSubmit" class="space-y-5">
        <div>
          <label class="block text-sm font-medium text-text mb-2">Name *</label>
          <input type="text" v-model="projectForm.name" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Description</label>
          <textarea v-model="projectForm.description" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg resize-none" rows="3" />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Funding</label>
          <input type="text" v-model="projectForm.funding" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" placeholder="e.g., ERC Starting Grant, FWO, Internal" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text mb-2">Status</label>
            <select v-model="projectForm.status" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg">
              <option value="active">Active</option><option value="planned">Planned</option><option value="on_hold">On Hold</option><option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text mb-2">Color</label>
            <div class="flex gap-2 mt-1.5">
              <button v-for="c in projectColors" :key="c" type="button" @click="projectForm.color = c" :class="['w-7 h-7 rounded-full border-2 transition-all', projectForm.color === c ? 'border-text scale-110' : 'border-transparent']" :style="{ backgroundColor: c }" />
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-text mb-2">Start Date</label><input type="date" v-model="projectForm.start_date" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" /></div>
          <div><label class="block text-sm font-medium text-text mb-2">End Date</label><input type="date" v-model="projectForm.end_date" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" /></div>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showProjectModal = false; editingProjectId = null" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
          <button type="submit" class="px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">{{ editingProjectId ? 'Save' : 'Create' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Deliverable Modal -->
    <Modal :open="showDeliverableModal" @close="showDeliverableModal = false; editingDeliverableId = null" :title="editingDeliverableId ? 'Edit Deliverable' : 'Add Deliverable'">
      <form @submit.prevent="handleDeliverableSubmit" class="space-y-5">
        <div><label class="block text-sm font-medium text-text mb-2">Title *</label><input type="text" v-model="deliverableForm.title" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" required /></div>
        <div><label class="block text-sm font-medium text-text mb-2">Description</label><textarea v-model="deliverableForm.description" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg resize-none" rows="2" /></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-text mb-2">Due Date</label><input type="date" v-model="deliverableForm.due_date" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" /></div>
          <div><label class="block text-sm font-medium text-text mb-2">Status</label>
            <select v-model="deliverableForm.status" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg">
              <option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="overdue">Overdue</option>
            </select>
          </div>
        </div>
        <div><label class="block text-sm font-medium text-text mb-2">Assigned To</label>
          <select v-model="deliverableForm.assigned_to" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg">
            <option :value="null">Unassigned</option>
            <option v-for="m in activeMembers" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showDeliverableModal = false" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
          <button type="submit" class="px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">{{ editingDeliverableId ? 'Save' : 'Add' }}</button>
        </div>
      </form>
    </Modal>

    <!-- Add Member to Project -->
    <Modal :open="showMemberModal" @close="showMemberModal = false" title="Add Team Member">
      <div class="space-y-2.5">
        <button
          v-for="m in activeMembers"
          :key="m.id"
          @click="!projectDetails[activeProjectId!]?.members.some(pm => pm.team_member_id === m.id) && activeProjectId && (handleAddMember(activeProjectId, m.id), showMemberModal = false)"
          :disabled="projectDetails[activeProjectId!]?.members.some(pm => pm.team_member_id === m.id)"
          :class="['w-full flex items-center gap-4 p-5 rounded-xl text-left transition-colors', projectDetails[activeProjectId!]?.members.some(pm => pm.team_member_id === m.id) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-hover']"
        >
          <div class="w-8 h-8 rounded-full bg-hover flex items-center justify-center text-xs font-medium text-text-secondary">{{ m.name.split(' ').map((n: string) => n[0]).join('') }}</div>
          <div><p class="text-sm font-medium text-text">{{ m.name }}</p><p class="text-xs text-text-muted">{{ m.role }}</p></div>
          <span v-if="projectDetails[activeProjectId!]?.members.some(pm => pm.team_member_id === m.id)" class="ml-auto text-xs text-text-muted">Already added</span>
        </button>
      </div>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal :open="deleteConfirm !== null" @close="deleteConfirm = null" :title="`Delete ${deleteConfirm?.type === 'project' ? 'Project' : 'Deliverable'}`">
      <p class="text-sm text-text-secondary mb-4">
        {{ deleteConfirm?.type === 'project' ? 'Are you sure? This will delete all deliverables and member assignments for this project.' : 'Are you sure you want to delete this deliverable?' }}
      </p>
      <div class="flex justify-end gap-3">
        <button @click="deleteConfirm = null" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
        <button @click="handleDelete" class="px-5 py-2.5 bg-danger text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors">Delete</button>
      </div>
    </Modal>
  </div>
</template>
