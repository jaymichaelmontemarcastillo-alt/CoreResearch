// src/types/researchWorkspace.types.ts

export type ManuscriptWorkspaceStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted_for_review'
  | 'revision_required'
  | 'under_review'
  | 'approved'
  | 'completed';

export type SectionStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'revision_required'
  | 'completed';

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'submitted'
  | 'completed'
  | 'revision_required';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type FeedbackStatus = 'open' | 'addressed' | 'resolved';

export interface ManuscriptSection {
  id: string; // 'chapter_1' | 'chapter_2' | 'chapter_3' | 'chapter_4' | 'chapter_5' | 'references' | 'final_manuscript'
  name: string;
  order: number;
  status: SectionStatus;
  progress: number; // 0 - 100
  submittedAt?: string;
  reviewedAt?: string;
  updatedAt?: string;
}

export interface ManuscriptWorkspace {
  id: string;
  proposalId: string;
  projectId?: string;
  documentId?: string; // Reference to existing TipTap / Firestore document
  title: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  adviserId: string;
  adviserName: string;
  department?: string;
  status: ManuscriptWorkspaceStatus;
  sections: ManuscriptSection[];
  overallProgress: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
}

export interface ResearchTask {
  id: string;
  workspaceId: string;
  proposalId?: string;
  projectId?: string;
  studentId: string;
  studentName?: string;
  adviserId: string;
  adviserName?: string;
  sectionId?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  submissionNote?: string;
  submittedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  workspaceId: string;
  proposalId?: string;
  projectId?: string;
  studentId: string;
  studentName?: string;
  adviserId: string;
  adviserName?: string;
  sectionId?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
}

export interface ResearchFeedback {
  id: string;
  workspaceId: string;
  authorId: string;
  authorName: string;
  authorRole: 'adviser' | 'panelist' | 'coordinator' | 'admin';
  studentId: string;
  sectionId?: string;
  taskId?: string;
  comment: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackInput {
  workspaceId: string;
  studentId: string;
  authorId: string;
  authorName: string;
  authorRole: 'adviser' | 'panelist' | 'coordinator' | 'admin';
  sectionId?: string;
  taskId?: string;
  comment: string;
}

export interface ResearchMilestone {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  completedAt?: string;
}

export const DEFAULT_MANUSCRIPT_SECTIONS: ManuscriptSection[] = [
  {
    id: 'chapter_1',
    name: 'Chapter 1: Introduction & Background',
    order: 1,
    status: 'in_progress',
    progress: 25,
  },
  {
    id: 'chapter_2',
    name: 'Chapter 2: Review of Related Literature',
    order: 2,
    status: 'pending',
    progress: 0,
  },
  {
    id: 'chapter_3',
    name: 'Chapter 3: Methodology & System Architecture',
    order: 3,
    status: 'pending',
    progress: 0,
  },
  {
    id: 'chapter_4',
    name: 'Chapter 4: Results, Implementation & Discussion',
    order: 4,
    status: 'pending',
    progress: 0,
  },
  {
    id: 'chapter_5',
    name: 'Chapter 5: Summary, Conclusions & Recommendations',
    order: 5,
    status: 'pending',
    progress: 0,
  },
  {
    id: 'references',
    name: 'References & Appendices',
    order: 6,
    status: 'pending',
    progress: 0,
  },
  {
    id: 'final_manuscript',
    name: 'Final Integrated Manuscript',
    order: 7,
    status: 'pending',
    progress: 0,
  },
];
