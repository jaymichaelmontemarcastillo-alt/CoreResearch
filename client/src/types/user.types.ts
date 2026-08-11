export type UserRole = 'student' | 'adviser' | 'panelist' | 'admin';

export type UserStatus = 'active' | 'inactive' | 'pending';

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
  specializationId?: string;
  sectionId?: string;
  yearLevel?: number;
  status: UserStatus;
  is_approved: boolean;
  profile_image?: string;
  created_at: string;
  updated_at: string;
  needsOnboarding?: boolean;
}

export interface CreateUserInput extends Omit<UserProfile, 'created_at' | 'updated_at'> {
  created_at?: string;
  updated_at?: string;
}

export interface UpdateUserInput extends Partial<Omit<UserProfile, 'uid'>> {
  [key: string]: any;
}
