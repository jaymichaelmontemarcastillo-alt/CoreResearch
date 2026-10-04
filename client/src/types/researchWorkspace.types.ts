// src/types/researchWorkspace.types.ts

export type ManuscriptWorkspaceStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted_for_review'
  | 'revision_required'
  | 'under_review'
  | 'approved'
  | 'completed';

export type ResearchPhase =
  | 'CHAPTERS_1_3'
  | 'PROPOSAL_DEFENSE'
  | 'CHAPTERS_4_5'
  | 'FINAL_MANUSCRIPT'
  | 'COMPLETED';

export type SectionStatus =
  | 'not_started'
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

export type TaskType = 'anchored' | 'general';

export interface TaskAnchor {
  selectedText: string;
  contentControlId?: string; // ONLYOFFICE Content Control ID for navigation
  commentId?: string; // ONLYOFFICE native comment ID
  chapterId?: string;
}

export interface TaskRevisionEntry {
  action: 'submitted' | 'approved' | 'revision_requested';
  by: string;
  byName?: string;
  comment?: string;
  timestamp: string;
}

export type FeedbackStatus = 'open' | 'addressed' | 'resolved';

export interface ManuscriptSection {
  id: string; // 'chapter_1' | 'chapter_2' | 'chapter_3' | 'chapter_4' | 'chapter_5'
  name: string;
  order: number;
  status: SectionStatus;
  progress: number; // 0 - 100
  submittedAt?: string;
  reviewedAt?: string;
  completedAt?: string;
  feedbackComment?: string;
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
  courseId?: string;
  academicYear?: string;
  semester?: string;
  status: ManuscriptWorkspaceStatus;
  researchPhase: ResearchPhase;
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
  documentId?: string;
  studentId: string;
  studentName?: string;
  adviserId: string;
  adviserName?: string;
  sectionId?: string;
  title: string;
  description: string;
  type: TaskType;
  source?: 'native_comment' | 'manual';
  anchor?: TaskAnchor;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  submissionNote?: string;
  adviserFeedback?: string;
  revisionHistory?: TaskRevisionEntry[];
  submittedAt?: string;
  completedAt?: string;
  reviewedAt?: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  workspaceId: string;
  proposalId?: string;
  projectId?: string;
  documentId?: string;
  studentId: string;
  studentName?: string;
  adviserId: string;
  adviserName?: string;
  sectionId?: string;
  title: string;
  description: string;
  type: TaskType;
  source?: 'native_comment' | 'manual';
  anchor?: TaskAnchor;
  priority: TaskPriority;
  dueDate: string;
  createdBy?: string;
  createdByName?: string;
  createdByRole?: string;
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
  status?: SectionStatus;
  order?: number;
  submittedAt?: string;
  reviewedAt?: string;
  completedAt?: string;
}

export const DEFAULT_MANUSCRIPT_SECTIONS: ManuscriptSection[] = [
  {
    id: 'chapter_1',
    name: 'Chapter 1: The Problem and Its Background',
    order: 1,
    status: 'not_started',
    progress: 0,
  },
  {
    id: 'chapter_2',
    name: 'Chapter 2: Review of Related Literature and Studies',
    order: 2,
    status: 'not_started',
    progress: 0,
  },
  {
    id: 'chapter_3',
    name: 'Chapter 3: Methodology',
    order: 3,
    status: 'not_started',
    progress: 0,
  },
  {
    id: 'chapter_4',
    name: 'Chapter 4: Results and Discussion',
    order: 4,
    status: 'not_started',
    progress: 0,
  },
  {
    id: 'chapter_5',
    name: 'Chapter 5: Summary, Conclusions, and Recommendations',
    order: 5,
    status: 'not_started',
    progress: 0,
  },
];
