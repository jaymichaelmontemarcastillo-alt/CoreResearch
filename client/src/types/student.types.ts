export interface StudentProfile {
  uid: string;
  email: string;
  fullName: string;
  studentIdOrEmployeeId: string;
  courseId?: string;
  specializationId?: string;
  sectionId?: string;
  sectionName?: string;
  section?: string;
  yearLevel?: number;
  enrollmentStatus?: 'enrolled' | 'irregular' | 'leave' | 'graduated' | 'withdrawn';
  role: 'student';
  program?: string;
  programCode?: string;
  programSpecialization?: string;
  major?: string;
  majorCode?: string;
  status?: string;
  is_approved?: boolean;
}

export interface UpdateStudentAcademicInput {
  courseId: string;
  specializationId?: string;
  sectionId: string;
  sectionName?: string;
  section?: string;
  program?: string;
  programCode?: string;
  programSpecialization?: string;
  major?: string;
  majorCode?: string;
  yearLevel?: number;
  enrollmentStatus?: 'enrolled' | 'irregular' | 'leave' | 'graduated' | 'withdrawn';
}
