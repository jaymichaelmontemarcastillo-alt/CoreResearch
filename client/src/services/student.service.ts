import { userService } from './user.service';
import { StudentProfile, UpdateStudentAcademicInput } from '../types/student.types';

export const studentService = {
  /**
   * Fetch all students (users with role = 'student')
   */
  async getAllStudents(): Promise<StudentProfile[]> {
    const users = await userService.getUsersByRole('student');
    return users as StudentProfile[];
  },

  /**
   * Update student academic assignment
   */
  async updateStudentAcademicInfo(uid: string, data: UpdateStudentAcademicInput): Promise<void> {
    await userService.updateUser(uid, data);
  }
};

export default studentService;
