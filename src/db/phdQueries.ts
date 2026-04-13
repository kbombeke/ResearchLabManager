import { getDb } from './database';
import type { PhdTracker, PhdTrackerWithMember } from '@/types';

export async function getAllPhdTrackers(): Promise<PhdTrackerWithMember[]> {
  const db = await getDb();
  return await db.select<PhdTrackerWithMember[]>(`
    SELECT p.*, t.name as member_name, t.role as member_role
    FROM phd_trackers p
    JOIN team_members t ON p.team_member_id = t.id
    ORDER BY p.phd_start_date
  `);
}

export async function getPhdTrackerByMemberId(memberId: number): Promise<PhdTracker | undefined> {
  const db = await getDb();
  const results = await db.select<PhdTracker[]>(
    'SELECT * FROM phd_trackers WHERE team_member_id = $1',
    [memberId]
  );
  return results[0];
}

export async function createPhdTracker(tracker: Omit<PhdTracker, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO phd_trackers (team_member_id, phd_start_date, expected_end_date, status, milestones, chapters, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [tracker.team_member_id, tracker.phd_start_date, tracker.expected_end_date, tracker.status, tracker.milestones, tracker.chapters, tracker.notes]
  );
  return result.lastInsertId ?? 0;
}

export async function updatePhdTracker(id: number, tracker: Partial<Omit<PhdTracker, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (tracker.phd_start_date !== undefined) { fields.push(`phd_start_date = $${paramIndex++}`); values.push(tracker.phd_start_date); }
  if (tracker.expected_end_date !== undefined) { fields.push(`expected_end_date = $${paramIndex++}`); values.push(tracker.expected_end_date); }
  if (tracker.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(tracker.status); }
  if (tracker.milestones !== undefined) { fields.push(`milestones = $${paramIndex++}`); values.push(tracker.milestones); }
  if (tracker.chapters !== undefined) { fields.push(`chapters = $${paramIndex++}`); values.push(tracker.chapters); }
  if (tracker.notes !== undefined) { fields.push(`notes = $${paramIndex++}`); values.push(tracker.notes); }

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE phd_trackers SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deletePhdTracker(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM phd_trackers WHERE id = $1', [id]);
}
