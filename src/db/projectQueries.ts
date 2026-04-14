import { getDb } from './database';
import type { Project, ProjectMember, Deliverable, DeliverableWithAssignee } from '@/types';

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  return await db.select<Project[]>('SELECT * FROM projects ORDER BY name');
}

export async function getProjectById(id: number): Promise<Project | undefined> {
  const db = await getDb();
  const results = await db.select<Project[]>('SELECT * FROM projects WHERE id = $1', [id]);
  return results[0];
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO projects (name, description, funding, status, start_date, end_date, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [project.name, project.description, project.funding, project.status, project.start_date, project.end_date, project.color]
  );
  return result.lastInsertId ?? 0;
}

export async function updateProject(id: number, project: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (project.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(project.name); }
  if (project.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(project.description); }
  if (project.funding !== undefined) { fields.push(`funding = $${paramIndex++}`); values.push(project.funding); }
  if (project.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(project.status); }
  if (project.start_date !== undefined) { fields.push(`start_date = $${paramIndex++}`); values.push(project.start_date); }
  if (project.end_date !== undefined) { fields.push(`end_date = $${paramIndex++}`); values.push(project.end_date); }
  if (project.color !== undefined) { fields.push(`color = $${paramIndex++}`); values.push(project.color); }

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deleteProject(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM projects WHERE id = $1', [id]);
}

// Project Members
export async function getProjectMembers(projectId: number): Promise<(ProjectMember & { member_name: string })[]> {
  const db = await getDb();
  return await db.select<(ProjectMember & { member_name: string })[]>(
    `SELECT pm.*, t.name as member_name
     FROM project_members pm
     JOIN team_members t ON pm.team_member_id = t.id
     WHERE pm.project_id = $1
     ORDER BY t.name`,
    [projectId]
  );
}

export async function addProjectMember(projectId: number, teamMemberId: number, roleInProject: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    'INSERT INTO project_members (project_id, team_member_id, role_in_project) VALUES ($1, $2, $3)',
    [projectId, teamMemberId, roleInProject]
  );
}

export async function removeProjectMember(projectId: number, teamMemberId: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    'DELETE FROM project_members WHERE project_id = $1 AND team_member_id = $2',
    [projectId, teamMemberId]
  );
}

// Deliverables
export async function getProjectDeliverables(projectId: number): Promise<Deliverable[]> {
  const db = await getDb();
  return await db.select<Deliverable[]>(
    'SELECT * FROM deliverables WHERE project_id = $1 ORDER BY due_date',
    [projectId]
  );
}

export async function getAllUpcomingDeliverables(limit: number = 10): Promise<DeliverableWithAssignee[]> {
  const db = await getDb();
  return await db.select<DeliverableWithAssignee[]>(
    `SELECT d.*, t.name as assignee_name, p.name as project_name, p.color as project_color
     FROM deliverables d
     LEFT JOIN team_members t ON d.assigned_to = t.id
     JOIN projects p ON d.project_id = p.id
     WHERE d.status != 'completed'
     ORDER BY d.due_date ASC
     LIMIT $1`,
    [limit]
  );
}

export async function createDeliverable(deliverable: Omit<Deliverable, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    `INSERT INTO deliverables (project_id, title, description, due_date, status, assigned_to)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [deliverable.project_id, deliverable.title, deliverable.description, deliverable.due_date, deliverable.status, deliverable.assigned_to]
  );
  return result.lastInsertId ?? 0;
}

export async function updateDeliverable(id: number, deliverable: Partial<Omit<Deliverable, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (deliverable.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(deliverable.title); }
  if (deliverable.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(deliverable.description); }
  if (deliverable.due_date !== undefined) { fields.push(`due_date = $${paramIndex++}`); values.push(deliverable.due_date); }
  if (deliverable.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(deliverable.status); }
  if (deliverable.assigned_to !== undefined) { fields.push(`assigned_to = $${paramIndex++}`); values.push(deliverable.assigned_to); }

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  await db.execute(
    `UPDATE deliverables SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

export async function deleteDeliverable(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM deliverables WHERE id = $1', [id]);
}

export async function getProjectCount(): Promise<number> {
  const db = await getDb();
  const result = await db.select<{ count: number }[]>("SELECT COUNT(*) as count FROM projects WHERE status = 'active'");
  return result[0].count;
}
