import { getDb } from './database';
import type { TeamMember, TeamMemberRelationship } from '@/types';

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
    `INSERT INTO team_members (name, role, function_title, email, photo, start_date, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [member.name, member.role, member.function_title, member.email, member.photo, member.start_date, member.is_active]
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
  if (member.function_title !== undefined) { fields.push(`function_title = $${paramIndex++}`); values.push(member.function_title); }
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

// Relationships
export async function getAllRelationships(): Promise<TeamMemberRelationship[]> {
  const db = await getDb();
  return await db.select<TeamMemberRelationship[]>('SELECT * FROM team_member_relationships');
}

export async function setParent(memberId: number, parentId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO team_member_relationships (member_id, parent_id) VALUES ($1, $2)
     ON CONFLICT(member_id) DO UPDATE SET parent_id = $2`,
    [memberId, parentId]
  );
}

export async function removeParent(memberId: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM team_member_relationships WHERE member_id = $1', [memberId]);
}
