export interface EnrollmentInvitation {
  id: string; // Used as the inviteCode in the URL
  courseId: string;
  specializationId?: string;
  sectionId: string;
  createdBy: string; // UID of the coordinator
  createdAt: string; // ISO string
  active: boolean;
}

export interface CreateEnrollmentInvitationInput {
  courseId: string;
  specializationId?: string;
  sectionId: string;
  createdBy: string;
  active: boolean;
}
