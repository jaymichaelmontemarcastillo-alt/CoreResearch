export interface ResearchGroupMember {
  uid: string;
  fullName: string;
  email: string;
}

export interface ResearchGroup {
  id: string;
  name: string;
  courseId: string;
  sectionId: string;
  memberIds: string[];
  members: ResearchGroupMember[];
  status: 'incomplete' | 'ready' | 'active';
  adviserId?: string;      // UID of the assigned adviser (set by admin/coordinator)
  adviserName?: string;    // Denormalized for display
  createdAt: string;
  updatedAt: string;
}

export interface CreateResearchGroupInput {
  courseId: string;
  sectionId: string;
  memberIds: string[];
  members: ResearchGroupMember[];
  adviserId?: string;
  adviserName?: string;
}
