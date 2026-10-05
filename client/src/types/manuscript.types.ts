export type ManuscriptStatus =
  | 'new_upload'
  | 'under_review'
  | 'ongoing_revision'
  | 'revisions_required'
  | 'approved'
  | 'accepted'
  | 'pending_publish'
  | 'published'
  | 'archived'
  | 'draft';

export interface ManuscriptComment {
  id: string;
  reviewerId?: string;
  reviewerName?: string;
  authorName?: string;
  authorRole?: string;
  comment?: string;
  text?: string;
  section?: string;
  page?: number;
  createdAt: string;
}

export interface ManuscriptGradeCriteria {
  presentation: number;
  methodology: number;
  results: number;
  manuscriptQuality: number;
}

export interface ManuscriptGrade {
  score: number;
  letter: string;
  remarks?: string;
  criteria?: ManuscriptGradeCriteria;
  updatedAt?: string;
  panelistEvaluations?: any[];
  defenseType?: 'proposal' | 'final' | 'defense';
}

export interface ManuscriptVersion {
  id: string;
  projectId: string;
  projectTitle?: string;
  title?: string;
  versionNumber: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  uploadedBy?: string;
  uploaderName?: string;
  studentName?: string;
  authors?: string[];
  adviserName?: string;
  adviserId?: string;
  department?: string;
  program?: string;
  section?: string;
  abstract?: string;
  keywords?: string[];
  notes?: string;
  commentsCount?: number;
  comments?: ManuscriptComment[];
  status: ManuscriptStatus;
  isArchived?: boolean;
  isBestThesis?: boolean;
  bestThesisNotes?: string;
  grade?: ManuscriptGrade;
  sections?: any[];
  groupId?: string;
  documentId?: string;
  contentHtml?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UploadManuscriptInput {
  projectId: string;
  title?: string;
  versionNumber: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploaderName?: string;
  authors?: string[];
  department?: string;
  abstract?: string;
  keywords?: string[];
}

