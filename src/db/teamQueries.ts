import { getDb } from './database';
import type { TeamMember } from '@/types';

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const db = await getDb();
  return await db.select<TeamMember[]>('SELECT * FROM team_members ORDER BY name');
}

export async function getActiveTeamMembers(): Promise<TeamMember[]> {
  const db = await getDb();
  return await db.select<TeamMember[]>('SELECT * FROM team_members WHERE is_active = 1 ORDER BY name');
}

export async function getTeamMemberById(id: number): Promise<TeamMember | undefined> {
  const db = await getDb();
  const results = await db.select<TeamMember[]>('SELECT * FROM team_members WHERE id = $1', [id]);
  return results[0];
}

export async function createTeamMember(member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO team_members (name, role, email, photo, start_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [member.name, member.role, member.email, member.photo, member.start_date, member.is_active]
  );
  return result.lastInsertId ?? 0;
}

export async function updateTeamMember(id: number, member: Partial<Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (member.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(member.name); }
  if (member.role !== undefined) { fields.push(`role = $${paramIndex++}`); values.push(member.role); }
  if (member.email !== undefined) { fields.push(`email = $${paramIndex++}`); values.push(member.email); }
  if (member.photo !== undefined) { fields.push(`photo = $${paramIndex++}`); values.push(member.photo); }
  if (member.start_date !== undefined) { fields.push(`start_date = $${paramIndex++}`); values.push(member.start_date); }
  if (member.is_active !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(member.is_active); }

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE team_members SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deleteTeamMember(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM team_members WHERE id = $1', [id]);
}

export async function getTeamMemberCount(): Promise<number> {
  const db = await getDb();
  const result = await db.select<{ count: number }[]>('SELECT COUNT(*) as count FROM team_members WHERE is_active = 1');
  return result[0].count;
}
