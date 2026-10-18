import api from './api';
import { userService } from './user.service';
import { StudentProfile, UpdateStudentAcademicInput } from '../types/student.types';

export const studentService = {
  /**
   * Normalize raw student record to guarantee courseId, specializationId, section, and enrollmentStatus
   */
  normalizeStudent(student: any): StudentProfile {
    // 1. Resolve courseId & programCode
    let courseId = student.courseId;
    let programCode = student.programCode;
    
    if (!courseId || courseId.length > 10) {
      if (
        programCode?.toUpperCase() === 'BSCS' ||
        student.program?.toLowerCase().includes('computer science')
      ) {
        courseId = 'bscs';
        programCode = 'BSCS';
      } else {
        courseId = 'bsit';
        programCode = 'BSIT';
      }
    } else {
      courseId = courseId.toLowerCase();
      if (!programCode) {
        programCode = courseId.toUpperCase();
      }
    }

    // 2. Resolve specializationId & majorCode
    let specializationId = student.specializationId;
    let majorCode = student.majorCode;

    if (!specializationId || specializationId.length > 10) {
      const specStr = (majorCode || student.programSpecialization || student.major || '').toUpperCase();
      if (specStr.includes('WMAD')) {
        specializationId = 'wmad';
        majorCode = 'WMAD';
      } else if (specStr.includes('AMG')) {
        specializationId = 'amg';
        majorCode = 'AMG';
      } else if (specStr.includes('SMP')) {
        specializationId = 'smp';
        majorCode = 'SMP';
      } else if (specStr.includes('IS')) {
        specializationId = 'is';
        majorCode = 'IS';
      } else {
        specializationId = '';
      }
    } else {
      specializationId = specializationId.toLowerCase();
      if (!majorCode) {
        majorCode = specializationId.toUpperCase();
      }
    }

    // 3. Resolve sectionName & sectionId
    let sectionName = student.sectionName || student.section || '';
    let sectionId = student.sectionId;

    if (!sectionName && sectionId) {
      const match = String(sectionId).match(/-sec-([a-z0-9]+)$/i);
      if (match) {
        sectionName = match[1].toUpperCase();
      }
    }
    if (!sectionName) {
      sectionName = 'A';
    }
    if (!sectionId || sectionId === sectionName) {
      sectionId = `${courseId}-sec-${sectionName.toLowerCase()}`;
    }

    // 4. Resolve enrollmentStatus
    const enrollmentStatus =
      student.enrollmentStatus ||
      (student.status === 'rejected' ? 'leave' : 'enrolled');

    return {
      ...student,
      courseId,
      programCode,
      specializationId,
      majorCode,
      sectionName,
      section: sectionName,
      sectionId,
      enrollmentStatus,
    };
  },

  /**
   * Fetch all students (users with role = 'student')
   */
  async getAllStudents(): Promise<StudentProfile[]> {
    const users = await userService.getUsersByRole('student');
    return users.map((u) => this.normalizeStudent(u));
  },

  /**
   * Fetch section classmates for the logged-in student (strictly in the same program, specialization, and section)
   */
  async getClassmates(): Promise<{
    classmates: StudentProfile[];
    groups: any[];
    course?: any;
    section?: any;
    specialization?: any;
  }> {
    try {
      const res = await api.get('/users/classmates');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const normalized = res.data.data.map((s: any) => this.normalizeStudent(s));
        return {
          classmates: normalized,
          groups: res.data.groups || [],
          course: res.data.course,
          section: res.data.section,
          specialization: res.data.specialization,
        };
      }
    } catch (err) {
      console.warn('[studentService] getClassmates API fallback to local:', err);
    }

    const all = await this.getAllStudents();
    return {
      classmates: all,
      groups: [],
    };
  },

  /**
   * Update student academic assignment
   */
  async updateStudentAcademicInfo(uid: string, data: UpdateStudentAcademicInput): Promise<void> {
    await userService.updateUser(uid, data);
  }
};

export default studentService;


