export interface ResearchGroupMember {
  uid: string;
  fullName: string;
  email: string;
  studentNumber?: string;
  studentIdOrEmployeeId?: string;
}

export interface ResearchGroup {
  id: string;
  name: string;
  courseId: string;
  courseName?: string;
  sectionId: string;
  sectionName?: string;
  yearLevel?: number;
  memberIds: string[];
  members: ResearchGroupMember[];
  status: 'incomplete' | 'ready' | 'active' | 'completed' | 'archived';
  adviserId?: string;      // UID of the assigned adviser (set by admin/coordinator)
  adviserName?: string;    // Denormalized for display
  title?: string;          // Research title
  manuscriptId?: string;   // Associated manuscript ID
  panelists?: any[];
  panelistIds?: string[];
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedByName?: string;
  archiveReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResearchGroupInput {
  courseId: string;
  courseName?: string;
  sectionId: string;
  sectionName?: string;
  yearLevel?: number;
  name?: string;
  memberIds: string[];
  members: ResearchGroupMember[];
  adviserId?: string;
  adviserName?: string;
}
