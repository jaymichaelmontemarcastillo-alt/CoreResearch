export type ProposalStatus =
  | 'pending'
  | 'approved'
  | 'revisions_required'
  | 'rejected'
  | 'archived';

export interface ProposalReviewComment {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'adviser' | 'panelist' | 'admin';
  comment: string;
  createdAt: string;
}

export interface TitleProposal {
  id: string;
  title: string;
  rationale: string;
  objectives: string;
  scopeAndDelimitation: string;
  methodology: string;
  researchCategory: string;
  abstract?: string;
  keywords?: string[];
  studentId: string;
  studentName: string;
  submittedBy?: string;
  groupId?: string;
  department?: string;
  courseId?: string;
  categoryId?: string;
  adviserId?: string;
  adviserName?: string;
  adviserComment?: string;
  comments?: ProposalReviewComment[];
  status: ProposalStatus;
  submittedAt: string;
  updatedAt: string;
}

export interface CreateProposalInput {
  title: string;
  rationale: string;
  objectives: string;
  scopeAndDelimitation: string;
  methodology: string;
  researchCategory: string;
  abstract?: string;
  keywords?: string[];
  studentId: string;
  studentName: string;
  submittedBy?: string;
  groupId?: string;
  department?: string;
  courseId?: string;
  categoryId?: string;
  adviserId?: string;
}

export interface UpdateProposalInput extends Partial<Omit<TitleProposal, 'id' | 'submittedAt'>> {}
