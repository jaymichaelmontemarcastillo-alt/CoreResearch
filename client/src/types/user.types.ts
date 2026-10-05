export type UserRole = 'student' | 'adviser' | 'panelist' | 'admin' | 'research_coordinator';

export type UserStatus = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
  fullName: string;
  role: UserRole;
  role_id: UserRole;
  department: string;
  department_id: string;
  studentIdOrEmployeeId?: string;
  courseId?: string;
  program?: string;
  programCode?: string;
  specializationId?: string;
  programSpecialization?: string;
  sectionId?: string;
  sectionName?: string;
  groupId?: string;
  groupName?: string;
  projectTitle?: string;
  researchTitle?: string;
  adviserId?: string;
  adviserName?: string;
  yearLevel?: number; // Deprecated - replaced by Program + Major + Section
  status: UserStatus;
  is_approved: boolean;
  profile_image?: string;
  created_at: string;
  updated_at: string;
  needsOnboarding?: boolean;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface CreateUserInput extends Omit<UserProfile, 'created_at' | 'updated_at'> {
  created_at?: string;
  updated_at?: string;
}

export interface UpdateUserInput extends Partial<Omit<UserProfile, 'uid'>> {
  [key: string]: any;
}
