export type GroupStatus =
  | 'in_progress'
  | 'proposal_defense_passed'
  | 'final_defense_passed'
  | 'completed'
  | 'archived';

export interface GroupMember {
  studentId: string;
  studentName: string;
  email: string;
  role?: 'lead' | 'member';
}

export interface ResearchProject {
  id: string;
  proposalId: string;
  title: string;
  studentId: string;
  members?: GroupMember[];
  adviserId: string;
  adviserName?: string;
  panelistIds: string[];
  department?: string;
  status: GroupStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupInput {
  proposalId: string;
  title: string;
  studentId: string;
  members?: GroupMember[];
  adviserId: string;
  panelistIds?: string[];
  department?: string;
}

export interface UpdateGroupInput extends Partial<Omit<ResearchProject, 'id' | 'createdAt'>> {}
