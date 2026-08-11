export interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  specializations?: Specialization[];
}

export interface Specialization {
  id: string;
  code: string;
  name: string;
}

export interface CreateCourseInput {
  code: string;
  name: string;
  departmentId: string;
  active: boolean;
  specializations?: Specialization[];
}

export interface UpdateCourseInput {
  code?: string;
  name?: string;
  departmentId?: string;
  active?: boolean;
  specializations?: Specialization[];
}
