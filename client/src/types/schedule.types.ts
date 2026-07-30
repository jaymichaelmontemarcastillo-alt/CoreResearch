export type DefenseType = 'proposal_defense' | 'final_defense';

export type ScheduleStatus = 'scheduled' | 'rescheduled' | 'completed' | 'cancelled';

export interface DefenseSchedule {
  id: string;
  projectId: string;
  projectTitle: string;
  defenseType: DefenseType;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  panelistIds: string[];
  status: ScheduleStatus;
  createdAt: string;
}

export interface CreateScheduleInput {
  projectId: string;
  projectTitle: string;
  defenseType: DefenseType;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  panelistIds: string[];
}
