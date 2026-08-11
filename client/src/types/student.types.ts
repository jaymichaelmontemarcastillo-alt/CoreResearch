export interface StudentProfile {
  uid: string;
  email: string;
  fullName: string;
  studentIdOrEmployeeId: string;
  courseId?: string;
  sectionId?: string;
  yearLevel?: number;
  enrollmentStatus?: 'enrolled' | 'irregular' | 'leave';
  role: 'student';
}

export interface UpdateStudentAcademicInput {
  courseId: string;
  sectionId: string;
  yearLevel?: number;
  enrollmentStatus?: 'enrolled' | 'irregular' | 'leave';
}
