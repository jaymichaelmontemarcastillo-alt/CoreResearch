export interface Section {
  id: string;
  name: string;
  courseId: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSectionInput {
  name: string;
  courseId: string;
  active: boolean;
}

export interface UpdateSectionInput {
  name?: string;
  active?: boolean;
}
