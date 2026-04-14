export interface TeamMember {
  id: number;
  name: string;
  role: string;
  function_title: string;
  email: string;
  photo: string;
  start_date: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PhdTracker {
  id: number;
  team_member_id: number;
  phd_start_date: string;
  expected_end_date: string;
  status: 'on_track' | 'at_risk' | 'overdue' | 'completed';
  milestones: string; // JSON string of Milestone[]
  chapters: string; // JSON string of DissertationChapter[]
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DissertationChapter {
  id: string;
  title: string;
  reference: string;
  status: 'finished' | 'in_progress' | 'not_started';
}

export interface Project {
  id: number;
  name: string;
  description: string;
  funding: string;
  status: 'active' | 'completed' | 'on_hold' | 'planned';
  start_date: string;
  end_date: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  team_member_id: number;
  role_in_project: string;
}

export interface Deliverable {
  id: number;
  project_id: number;
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: number;
  title: string;
  date: string;
  content: string;
  project_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendee {
  id: number;
  meeting_id: number;
  team_member_id: number;
}

export interface TeamMemberRelationship {
  id: number;
  member_id: number;
  parent_id: number;
}

export interface OrgTreeNode {
  member: TeamMember;
  children: OrgTreeNode[];
}

// Extended types with joins
export interface PhdTrackerWithMember extends PhdTracker {
  member_name: string;
  member_role: string;
}

export interface ProjectWithMembers extends Project {
  members: (ProjectMember & { member_name: string })[];
  deliverables: Deliverable[];
}

export interface DeliverableWithAssignee extends Deliverable {
  assignee_name: string | null;
  project_name: string;
  project_color: string;
}

export interface MeetingNoteWithDetails extends MeetingNote {
  attendees: { team_member_id: number; name: string }[];
  project_name: string | null;
}
