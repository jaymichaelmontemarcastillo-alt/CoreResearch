export type ManuscriptStatus =
  | 'draft'
  | 'under_review'
  | 'revisions_required'
  | 'approved'
  | 'archived';

export interface ManuscriptComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  comment: string;
  section?: string;
  createdAt: string;
}

export interface ManuscriptVersion {
  id: string;
  projectId: string;
  versionNumber: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  commentsCount: number;
  comments?: ManuscriptComment[];
  status: ManuscriptStatus;
  createdAt: string;
}

export interface UploadManuscriptInput {
  projectId: string;
  versionNumber: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
}
