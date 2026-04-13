import { getDb } from './database';
import type { MeetingNote, MeetingNoteWithDetails } from '@/types';

export async function getAllMeetingNotes(): Promise<MeetingNoteWithDetails[]> {
  const db = await getDb();
  const notes = await db.select<(MeetingNote & { project_name: string | null })[]>(
    `SELECT m.*, p.name as project_name
     FROM meeting_notes m
     LEFT JOIN projects p ON m.project_id = p.id
     ORDER BY m.date DESC`
  );

  const result: MeetingNoteWithDetails[] = [];
  for (const note of notes) {
    const attendees = await db.select<{ team_member_id: number; name: string }[]>(
      `SELECT ma.team_member_id, t.name
       FROM meeting_attendees ma
       JOIN team_members t ON ma.team_member_id = t.id
       WHERE ma.meeting_id = $1
       ORDER BY t.name`,
      [note.id]
    );
    result.push({ ...note, attendees });
  }
  return result;
}

export async function getMeetingNoteById(id: number): Promise<MeetingNoteWithDetails | undefined> {
  const db = await getDb();
  const notes = await db.select<(MeetingNote & { project_name: string | null })[]>(
    `SELECT m.*, p.name as project_name
     FROM meeting_notes m
     LEFT JOIN projects p ON m.project_id = p.id
     WHERE m.id = $1`,
    [id]
  );
  if (!notes[0]) return undefined;

  const attendees = await db.select<{ team_member_id: number; name: string }[]>(
    `SELECT ma.team_member_id, t.name
     FROM meeting_attendees ma
     JOIN team_members t ON ma.team_member_id = t.id
     WHERE ma.meeting_id = $1
     ORDER BY t.name`,
    [id]
  );
  return { ...notes[0], attendees };
}

export async function createMeetingNote(
  note: Omit<MeetingNote, 'id' | 'created_at' | 'updated_at'>,
  attendeeIds: number[]
): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO meeting_notes (title, date, content, project_id)
     VALUES ($1, $2, $3, $4)`,
    [note.title, note.date, note.content, note.project_id]
  );
  const meetingId = result.lastInsertId ?? 0;

  for (const memberId of attendeeIds) {
    await db.execute(
      'INSERT INTO meeting_attendees (meeting_id, team_member_id) VALUES ($1, $2)',
      [meetingId, memberId]
    );
  }
  return meetingId;
}

export async function updateMeetingNote(
  id: number,
  note: Partial<Omit<MeetingNote, 'id' | 'created_at' | 'updated_at'>>,
  attendeeIds?: number[]
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (note.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(note.title); }
  if (note.date !== undefined) { fields.push(`date = $${paramIndex++}`); values.push(note.date); }
  if (note.content !== undefined) { fields.push(`content = $${paramIndex++}`); values.push(note.content); }
  if (note.project_id !== undefined) { fields.push(`project_id = $${paramIndex++}`); values.push(note.project_id); }

  if (fields.length > 0) {
    fields.push(`updated_at = datetime('now')`);
    values.push(id);
    await db.execute(
      `UPDATE meeting_notes SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  if (attendeeIds !== undefined) {
    await db.execute('DELETE FROM meeting_attendees WHERE meeting_id = $1', [id]);
    for (const memberId of attendeeIds) {
      await db.execute(
        'INSERT INTO meeting_attendees (meeting_id, team_member_id) VALUES ($1, $2)',
        [id, memberId]
      );
    }
  }
}

export async function deleteMeetingNote(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM meeting_notes WHERE id = $1', [id]);
}

export async function getMeetingNoteCount(): Promise<number> {
  const db = await getDb();
  const result = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM meeting_notes');
  return result[0].count;
}
