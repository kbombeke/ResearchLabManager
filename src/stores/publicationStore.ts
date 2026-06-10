import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Publication, MemberPublications, TeamMember } from '@/types'

// Base path for the UGent Biblio API. In production a reverse proxy
// (e.g. nginx `location /biblio-api/`) forwards this to
// https://biblio.ugent.be to avoid browser CORS restrictions. During
// local dev the Vite server proxy does the same (see vite.config.ts).
const BIBLIO_BASE = (import.meta.env.VITE_BIBLIO_BASE ?? '/biblio-api').replace(/\/$/, '')

function firstStr(v: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const val = v[k]
    if (typeof val === 'string' && val.length > 0) return val
  }
  return ''
}

function parseYear(v: Record<string, unknown>): number | null {
  const raw = v.year
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const digits = raw.match(/^\d+/)?.[0]
    return digits ? Number(digits) : null
  }
  return null
}

function parsePublication(obj: unknown): Publication | null {
  if (!obj || typeof obj !== 'object') return null
  const v = obj as Record<string, unknown>

  const parent = v.parent as Record<string, unknown> | undefined
  const journal = typeof parent?.title === 'string' ? parent.title : ''

  const authorArr = Array.isArray(v.author) ? (v.author as Record<string, unknown>[]) : []
  const authors = authorArr
    .map((a) => {
      if (typeof a.full_name === 'string' && a.full_name) return a.full_name
      const last = typeof a.last_name === 'string' ? a.last_name : ''
      const first = typeof a.first_name === 'string' ? a.first_name : ''
      return `${first} ${last}`.trim()
    })
    .filter((s) => s.length > 0)

  return {
    biblio_id: firstStr(v, ['biblio_id', '_id', 'id']),
    title: firstStr(v, ['title']),
    year: parseYear(v),
    type: firstStr(v, ['type']),
    publication_status: firstStr(v, ['publication_status', 'status']),
    classification: firstStr(v, ['classification', 'vabb_type']),
    doi: firstStr(v, ['doi']),
    journal,
    authors,
    handle: firstStr(v, ['handle']),
  }
}

// The Biblio export endpoint returns newline-delimited JSON (one object
// per line). Some responses may be a single JSON array, so handle both.
function parsePublications(body: string): Publication[] {
  const trimmed = body.trim()
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed)
      if (Array.isArray(arr)) {
        return arr.map(parsePublication).filter((p): p is Publication => p !== null)
      }
    } catch {
      // fall through to line-based parsing
    }
  }
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => {
      try {
        return parsePublication(JSON.parse(line))
      } catch {
        return null
      }
    })
    .filter((p): p is Publication => p !== null)
}

export const usePublicationStore = defineStore('publication', () => {
  const byMember = ref<Record<number, MemberPublications>>({})
  const loadingIds = ref<Set<number>>(new Set())

  function setLoading(memberId: number, loading: boolean) {
    const next = new Set(loadingIds.value)
    if (loading) next.add(memberId)
    else next.delete(memberId)
    loadingIds.value = next
  }

  function isLoading(memberId: number): boolean {
    return loadingIds.value.has(memberId)
  }

  async function fetchForMember(member: TeamMember): Promise<MemberPublications> {
    const ugentId = (member.ugent_id ?? '').trim()
    const base: MemberPublications = {
      member_id: member.id,
      member_name: member.name,
      ugent_id: ugentId,
      publications: [],
      fetched_at: new Date().toISOString(),
    }

    if (!ugentId) {
      const result = { ...base, error: 'No UGent ID set for this member.' }
      byMember.value[member.id] = result
      return result
    }

    if (!/^[A-Za-z0-9-]+$/.test(ugentId)) {
      const result = { ...base, error: 'UGent ID must be a numeric ID or a UUID-style identifier.' }
      byMember.value[member.id] = result
      return result
    }

    setLoading(member.id, true)
    try {
      const url = `${BIBLIO_BASE}/person/${encodeURIComponent(ugentId)}/publication/export?format=json`
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) {
        throw new Error(`Biblio API returned status ${response.status}`)
      }
      const body = await response.text()
      const publications = parsePublications(body)
      const result = { ...base, publications }
      byMember.value[member.id] = result
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const result = { ...base, error: message }
      byMember.value[member.id] = result
      return result
    } finally {
      setLoading(member.id, false)
    }
  }

  async function fetchForMembers(members: TeamMember[]) {
    await Promise.all(members.map(m => fetchForMember(m)))
  }

  function clear() {
    byMember.value = {}
  }

  return { byMember, loadingIds, isLoading, fetchForMember, fetchForMembers, clear }
})
