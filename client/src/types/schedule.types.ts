export type DefenseType = 'proposal_defense' | 'final_defense';

export type ScheduleStatus =
  | 'scheduled'
  | 'rescheduled'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'for_redefense';

export interface SchedulePanelist {
  id?: string;
  uid?: string;
  name?: string;
  fullName?: string;
  email?: string;
  role?: string;
}

export interface DefenseSchedule {
  id: string;
  projectId: string;
  groupId?: string;
  projectTitle: string;
  studentName?: string;
  memberIds?: string[];
  defenseType: DefenseType;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  location?: string;
  time?: string;
  panelistIds: string[];
  panelistNames?: string[];
  panelists?: SchedulePanelist[];
  adviserId?: string;
  adviserName?: string;
  status: ScheduleStatus;
  attempt?: number;
  defenseStage?: string;
  notes?: string;
  resultStatus?: 'passed' | 're_defense' | 'failed' | 'pending';
  createdAt: string;
  updatedAt?: string;
}

export interface CreateScheduleInput {
  projectId: string;
  projectTitle: string;
  defenseType: DefenseType;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  panelistIds?: string[];
  panelists?: SchedulePanelist[];
  adviserId?: string;
  adviserName?: string;
  status?: ScheduleStatus;
  attempt?: number;
  defenseStage?: string;
  notes?: string;
  resultStatus?: 'passed' | 're_defense' | 'failed' | 'pending';
}
