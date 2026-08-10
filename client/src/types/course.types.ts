export interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCourseInput {
  code: string;
  name: string;
  departmentId: string;
  active: boolean;
}

export interface UpdateCourseInput {
  code?: string;
  name?: string;
  departmentId?: string;
  active?: boolean;
}
