import Database from '@tauri-apps/plugin-sql'
import { getCustomDbFolder, buildConnectionString } from '@/utils/dbPath'

let db: Database | null = null
let dbFallback = false

export function isUsingFallback(): boolean {
  return dbFallback
}

export async function getDb(): Promise<Database> {
  if (!db) {
    const folder = await getCustomDbFolder()
    const connectionString = buildConnectionString(folder)
    try {
      db = await Database.load(connectionString)
    } catch (e) {
      if (folder) {
        console.error('Failed to load database from custom path, falling back to default:', e)
        db = await Database.load('sqlite:researchlabmanager.db')
        dbFallback = true
      } else {
        throw e
      }
    }
    await runMigrations(db)
  }
  return db
}

async function runMigrations(database: Database): Promise<void> {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT '',
      email TEXT DEFAULT '',
      photo TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS phd_trackers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_member_id INTEGER NOT NULL,
      phd_start_date TEXT NOT NULL,
      expected_end_date TEXT NOT NULL,
      status TEXT DEFAULT 'on_track',
      milestones TEXT DEFAULT '[]',
      chapters TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
    )
  `)

  // Add chapters column if it doesn't exist (migration for existing databases)
  try {
    await database.execute(`ALTER TABLE phd_trackers ADD COLUMN chapters TEXT DEFAULT '[]'`)
  } catch {
    // Column already exists
  }

  // Add function_title column if it doesn't exist (migration for existing databases)
  try {
    await database.execute(`ALTER TABLE team_members ADD COLUMN function_title TEXT DEFAULT ''`)
  } catch {
    // Column already exists
  }

  await database.execute(`
    CREATE TABLE IF NOT EXISTS team_member_relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL UNIQUE,
      parent_id INTEGER NOT NULL,
      FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES team_members(id) ON DELETE CASCADE
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      color TEXT DEFAULT '#4a90d9',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS project_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      team_member_id INTEGER NOT NULL,
      role_in_project TEXT DEFAULT '',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS deliverables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      assigned_to INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES team_members(id) ON DELETE SET NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS meeting_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      content TEXT DEFAULT '',
      project_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS meeting_attendees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      team_member_id INTEGER NOT NULL,
      FOREIGN KEY (meeting_id) REFERENCES meeting_notes(id) ON DELETE CASCADE,
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
    )
  `)
}
