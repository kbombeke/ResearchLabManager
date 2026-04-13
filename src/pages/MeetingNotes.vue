<script setup lang="ts">
import { ref, onMounted, watchEffect } from 'vue'
import { Plus, FileText, Calendar, Trash2, Search, Users as UsersIcon } from 'lucide-vue-next'
import { format } from 'date-fns'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useMeetingStore } from '@/stores/meetingStore'
import { useTeamStore } from '@/stores/teamStore'
import { useProjectStore } from '@/stores/projectStore'
import type { MeetingNoteWithDetails } from '@/types'
import Modal from '@/components/Modal.vue'

const meetingStore = useMeetingStore()
const teamStore = useTeamStore()
const projectStore = useProjectStore()

const selectedNote = ref<MeetingNoteWithDetails | null>(null)
const showNewModal = ref(false)
const newForm = ref({ title: '', date: format(new Date(), 'yyyy-MM-dd'), project_id: null as number | null })
const selectedAttendees = ref<number[]>([])
const searchQuery = ref('')
const deleteConfirm = ref<number | null>(null)

onMounted(() => { meetingStore.loadNotes(); teamStore.loadMembers(); projectStore.loadProjects() })

const editor = useEditor({
  extensions: [StarterKit, Placeholder.configure({ placeholder: 'Start writing meeting notes...' })],
  content: '',
  onUpdate: ({ editor }) => {
    if (selectedNote.value) {
      meetingStore.updateNote(selectedNote.value.id, { content: editor.getHTML() })
    }
  },
})

function selectNote(note: MeetingNoteWithDetails) {
  selectedNote.value = note
  editor.value?.commands.setContent(note.content || '')
}

watchEffect(() => {
  if (meetingStore.notes.length > 0 && !selectedNote.value && editor.value) {
    selectNote(meetingStore.notes[0])
  }
})

async function handleCreateNote() {
  if (!newForm.value.title.trim()) return
  const id = await meetingStore.addNote(
    { title: newForm.value.title, date: newForm.value.date, content: '', project_id: newForm.value.project_id },
    selectedAttendees.value,
  )
  showNewModal.value = false
  newForm.value = { title: '', date: format(new Date(), 'yyyy-MM-dd'), project_id: null }
  selectedAttendees.value = []
  const newNote = meetingStore.notes.find(n => n.id === id)
  if (newNote) selectNote(newNote)
}

async function handleDelete() {
  if (deleteConfirm.value === null) return
  await meetingStore.deleteNote(deleteConfirm.value)
  if (selectedNote.value?.id === deleteConfirm.value) {
    selectedNote.value = null
    editor.value?.commands.setContent('')
  }
  deleteConfirm.value = null
}

function toggleAttendee(id: number) {
  const idx = selectedAttendees.value.indexOf(id)
  if (idx >= 0) selectedAttendees.value.splice(idx, 1)
  else selectedAttendees.value.push(id)
}

async function updateAttendees(note: MeetingNoteWithDetails, memberId: number) {
  const current = note.attendees.map(a => a.team_member_id)
  const updated = current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId]
  await meetingStore.updateNote(note.id, {}, updated)
  // Refresh selectedNote with updated data
  const refreshed = meetingStore.notes.find(n => n.id === note.id)
  if (refreshed) selectedNote.value = refreshed
}

const filteredNotes = ref<MeetingNoteWithDetails[]>([])
watchEffect(() => {
  filteredNotes.value = searchQuery.value
    ? meetingStore.notes.filter(n => n.title.toLowerCase().includes(searchQuery.value.toLowerCase()))
    : meetingStore.notes
})
</script>

<template>
  <div v-if="meetingStore.loading && meetingStore.notes.length === 0" class="flex items-center justify-center h-64 text-text-secondary">Loading...</div>
  <div v-else class="flex gap-6 -ml-20 -mr-16 -my-12 h-screen">
    <!-- Notes List Sidebar -->
    <div class="w-80 bg-card border-r border-border flex flex-col shrink-0">
      <div class="px-8 py-8 border-b border-border">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-base font-bold text-text">Meeting Notes</h1>
          <button @click="showNewModal = true" class="p-2 bg-blue text-white rounded-lg hover:bg-blue-dark transition-colors"><Plus :size="16" /></button>
        </div>
        <div class="relative">
          <Search :size="14" class="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" v-model="searchQuery" placeholder="Search notes..." class="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" />
        </div>
      </div>
      <div class="flex-1 overflow-y-auto">
        <button
          v-for="note in filteredNotes"
          :key="note.id"
          @click="selectNote(note)"
          :class="['w-full text-left px-8 py-7 border-b border-border transition-colors', selectedNote?.id === note.id ? 'bg-blue/5 border-l-2 border-l-blue' : 'hover:bg-hover/50']"
        >
          <p class="text-sm font-medium text-text truncate">{{ note.title }}</p>
          <div class="flex items-center gap-2 mt-1.5">
            <Calendar :size="12" class="text-text-muted" />
            <span class="text-xs text-text-muted">{{ format(new Date(note.date), 'MMM d, yyyy') }}</span>
          </div>
          <span v-if="note.project_name" class="inline-block mt-2.5 text-xs text-blue bg-blue/10 rounded-md px-2.5 py-1">{{ note.project_name }}</span>
          <div v-if="note.attendees.length > 0" class="flex items-center gap-1 mt-2.5">
            <div v-for="a in note.attendees.slice(0, 4)" :key="a.team_member_id" class="w-5 h-5 rounded-full bg-hover flex items-center justify-center text-[8px] font-medium text-text-secondary" :title="a.name">
              {{ a.name.split(' ').map((n: string) => n[0]).join('') }}
            </div>
            <span v-if="note.attendees.length > 4" class="text-[10px] text-text-muted">+{{ note.attendees.length - 4 }}</span>
          </div>
        </button>
        <div v-if="filteredNotes.length === 0" class="p-8 text-center text-text-muted">
          <FileText :size="32" class="mx-auto mb-2" />
          <p class="text-sm">{{ searchQuery ? 'No matching notes' : 'No meeting notes yet' }}</p>
        </div>
      </div>
    </div>

    <!-- Editor Panel -->
    <div class="flex-1 flex flex-col min-w-0">
      <template v-if="selectedNote">
        <div class="flex items-center justify-between px-10 py-7 border-b border-border bg-card">
          <div>
            <h2 class="text-base font-semibold text-text">{{ selectedNote.title }}</h2>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs text-text-secondary">{{ format(new Date(selectedNote.date), 'EEEE, MMMM d, yyyy') }}</span>
              <span v-if="selectedNote.project_name" class="text-xs text-blue bg-blue/10 rounded-md px-2.5 py-1">{{ selectedNote.project_name }}</span>
            </div>
          </div>
          <button @click="deleteConfirm = selectedNote.id" class="p-2 rounded-lg hover:bg-danger/10 text-text-muted hover:text-danger transition-colors"><Trash2 :size="16" /></button>
        </div>

        <!-- Attendees bar -->
        <div class="px-10 py-5 border-b border-border bg-hover/40 flex items-center gap-4">
          <UsersIcon :size="14" class="text-text-muted shrink-0" />
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="a in selectedNote.attendees"
              :key="a.team_member_id"
              @click="updateAttendees(selectedNote!, a.team_member_id)"
              class="inline-flex items-center gap-1.5 bg-card border border-border rounded-full px-3.5 py-1.5 text-xs text-text hover:border-danger hover:text-danger transition-colors"
              :title="`Remove ${a.name}`"
            >{{ a.name }}</button>
            <div class="relative group">
              <button class="inline-flex items-center gap-1 border border-dashed border-border rounded-full px-3.5 py-1.5 text-xs text-text-muted hover:border-blue hover:text-blue transition-colors">+ Add</button>
              <div class="absolute top-full left-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg py-2 hidden group-hover:block z-10 w-52">
                <button
                  v-for="m in teamStore.members.filter(m => m.is_active && !selectedNote!.attendees.some(a => a.team_member_id === m.id))"
                  :key="m.id"
                  @click="updateAttendees(selectedNote!, m.id)"
                  class="w-full text-left px-5 py-2.5 text-sm text-text hover:bg-hover"
                >{{ m.name }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- TipTap Editor Toolbar -->
        <div v-if="editor" class="px-10 py-3.5 border-b border-border bg-card flex items-center gap-1.5">
          <button @click="editor.chain().focus().toggleBold().run()" :class="['px-2.5 py-1 rounded text-sm', editor.isActive('bold') ? 'bg-hover font-bold' : 'hover:bg-hover']">B</button>
          <button @click="editor.chain().focus().toggleItalic().run()" :class="['px-2.5 py-1 rounded text-sm italic', editor.isActive('italic') ? 'bg-hover' : 'hover:bg-hover']">I</button>
          <button @click="editor.chain().focus().toggleStrike().run()" :class="['px-2.5 py-1 rounded text-sm line-through', editor.isActive('strike') ? 'bg-hover' : 'hover:bg-hover']">S</button>
          <div class="w-px h-5 bg-border mx-1" />
          <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="['px-2.5 py-1 rounded text-sm', editor.isActive('heading', { level: 2 }) ? 'bg-hover font-bold' : 'hover:bg-hover']">H2</button>
          <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="['px-2.5 py-1 rounded text-sm', editor.isActive('heading', { level: 3 }) ? 'bg-hover font-bold' : 'hover:bg-hover']">H3</button>
          <div class="w-px h-5 bg-border mx-1" />
          <button @click="editor.chain().focus().toggleBulletList().run()" :class="['px-2.5 py-1 rounded text-sm', editor.isActive('bulletList') ? 'bg-hover' : 'hover:bg-hover']">List</button>
          <button @click="editor.chain().focus().toggleOrderedList().run()" :class="['px-2.5 py-1 rounded text-sm', editor.isActive('orderedList') ? 'bg-hover' : 'hover:bg-hover']">1.</button>
          <button @click="editor.chain().focus().toggleBlockquote().run()" :class="['px-2.5 py-1 rounded text-sm', editor.isActive('blockquote') ? 'bg-hover' : 'hover:bg-hover']">Quote</button>
        </div>

        <div class="flex-1 overflow-y-auto bg-card">
          <EditorContent :editor="editor" class="max-w-none" />
        </div>
      </template>
      <div v-else class="flex-1 flex items-center justify-center text-text-muted">
        <div class="text-center">
          <FileText :size="48" class="mx-auto mb-3" />
          <p class="text-lg font-medium">Select a note or create a new one</p>
        </div>
      </div>
    </div>

    <!-- New Note Modal -->
    <Modal :open="showNewModal" @close="showNewModal = false; selectedAttendees = []" title="New Meeting Note">
      <form @submit.prevent="handleCreateNote" class="space-y-5">
        <div><label class="block text-sm font-medium text-text mb-2">Title *</label><input type="text" v-model="newForm.title" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" placeholder="e.g., Weekly Team Meeting" required /></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-sm font-medium text-text mb-2">Date</label><input type="date" v-model="newForm.date" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg" /></div>
          <div><label class="block text-sm font-medium text-text mb-2">Project</label>
            <select v-model="newForm.project_id" class="w-full border border-border rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/30 bg-bg">
              <option :value="null">No project</option>
              <option v-for="p in projectStore.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Attendees</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="m in teamStore.members.filter(m => m.is_active)"
              :key="m.id"
              type="button"
              @click="toggleAttendee(m.id)"
              :class="['px-3.5 py-1.5 rounded-full text-xs border transition-colors', selectedAttendees.includes(m.id) ? 'bg-blue text-white border-blue' : 'bg-bg text-text border-border hover:border-blue']"
            >{{ m.name }}</button>
          </div>
        </div>
        <div class="flex justify-end gap-3 pt-2">
          <button type="button" @click="showNewModal = false" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
          <button type="submit" class="px-5 py-2.5 bg-blue text-white text-sm font-medium rounded-xl hover:bg-blue-dark transition-colors">Create</button>
        </div>
      </form>
    </Modal>

    <!-- Delete Confirmation -->
    <Modal :open="deleteConfirm !== null" @close="deleteConfirm = null" title="Delete Meeting Note">
      <p class="text-sm text-text-secondary mb-4">Are you sure you want to delete this meeting note?</p>
      <div class="flex justify-end gap-3">
        <button @click="deleteConfirm = null" class="px-5 py-2.5 text-sm text-text-secondary border border-border rounded-xl hover:bg-hover transition-colors">Cancel</button>
        <button @click="handleDelete" class="px-5 py-2.5 bg-danger text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-colors">Delete</button>
      </div>
    </Modal>
  </div>
</template>
