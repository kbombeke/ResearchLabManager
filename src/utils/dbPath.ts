import { load } from '@tauri-apps/plugin-store'

const STORE_FILE = 'settings.json'
const DB_PATH_KEY = 'databaseFolder'

export const DB_FILENAME = 'researchlabmanager.db'

let storeInstance: Awaited<ReturnType<typeof load>> | null = null

async function getStore() {
  if (!storeInstance) {
    storeInstance = await load(STORE_FILE)
  }
  return storeInstance
}

export async function getCustomDbFolder(): Promise<string | null> {
  try {
    const store = await getStore()
    const value = await store.get<string>(DB_PATH_KEY)
    return value ?? null
  } catch {
    return null
  }
}

export async function setCustomDbFolder(folder: string | null): Promise<void> {
  const store = await getStore()
  if (folder) {
    await store.set(DB_PATH_KEY, folder)
  } else {
    await store.delete(DB_PATH_KEY)
  }
  await store.save()
}

export function buildConnectionString(folder: string | null): string {
  if (folder) {
    return `sqlite:${folder}/${DB_FILENAME}`
  }
  return `sqlite:${DB_FILENAME}`
}
