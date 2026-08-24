export interface AdviserProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  department: string;
  specialization?: string[];
  expertise?: string[];
  researchInterests?: string[];
  keywords?: string[];
  maxCapacity: number;
  activeGroupsCount: number;
  isAvailable: boolean;
}

export interface FacultyAssignment {
  groupId: string;
  adviserId: string;
  assignedAt: string;
  assignedBy: string;
}
