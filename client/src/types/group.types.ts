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
  createdAt: string;
  updatedAt: string;
}

export interface CreateResearchGroupInput {
  courseId: string;
  sectionId: string;
  memberIds: string[];
  members: ResearchGroupMember[];
}
