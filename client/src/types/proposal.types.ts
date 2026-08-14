// ─────────────────────────────────────────────────────────────────────────────
// Title Proposal Types — CoreResearch Phase 1
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 4-state lifecycle for a Title Proposal:
 *   DRAFT → SUBMITTED → NEEDS_REVISION → SUBMITTED (repeat) → APPROVED
 */
export type ProposalStatus =
  | 'draft'
  | 'submitted'
  | 'needs_revision'
  | 'approved';

// ─── Attachment ───────────────────────────────────────────────────────────────

export interface ProposalAttachment {
  fileName: string;
  downloadUrl: string;
  fullPath: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
}

// ─── Core Proposal Document ──────────────────────────────────────────────────

export interface TitleProposal {
  id: string;

  // ── Content (required fields from the proposal form) ──
  title: string;
  researchCategory?: string;      // now optional — removed from form
  categoryId?: string;            // optional ref to research_categories/{id}
  rationale: string;              // Rationale / Background
  objectives: string;             // Specific Research Objectives
  scopeAndDelimitation: string;   // Scope and Delimitation
  methodology: string;            // Methodology

  // ── Supporting documents ──
  attachments?: ProposalAttachment[];  // uploaded files (PDF, DOCX, PPT)

  // ── Ownership — belongs to the RESEARCH GROUP ──
  groupId: string;                // research_groups/{id}
  groupName: string;              // denormalized for display (e.g. "Group 01")

  // ── Academic context (denormalized for coordinator filtering) ──
  courseId: string;
  courseName: string;             // e.g. "BSIT"
  sectionId: string;
  sectionName: string;            // e.g. "Section A"

  // ── Submission tracking ──
  submittedByUid: string;         // which member clicked submit
  submittedByName: string;

  // ── Status ──
  status: ProposalStatus;

  // ── Timestamps ──
  createdAt: string;              // when the draft/proposal was first created
  updatedAt: string;              // last edit timestamp
  submittedAt?: string;           // when first submitted (set once)
  lastSubmittedAt?: string;       // updated on every (re-)submission
  approvedAt?: string;            // set when coordinator approves

  // ── Coordinator Review ──
  coordinatorId?: string;         // uid of the reviewing coordinator
  coordinatorName?: string;
  coordinatorFeedback?: string;   // written feedback for the group
  reviewedAt?: string;            // when coordinator submitted their evaluation

  // ── Revision tracking ──
  revisionCount: number;          // starts at 0, incremented on each resubmission

  // ── Future manuscript hook (Phase 2+) ──
  manuscriptWorkspaceId?: string; // set when an approved proposal activates a manuscript
}

// ─── Input Types ─────────────────────────────────────────────────────────────

/**
 * Fields required to create a new proposal (initially as draft).
 */
export interface CreateProposalInput {
  title: string;
  researchCategory?: string;
  categoryId?: string;
  rationale: string;
  objectives: string;
  scopeAndDelimitation: string;
  methodology: string;

  attachments?: ProposalAttachment[];

  groupId: string;
  groupName: string;

  courseId: string;
  courseName: string;
  sectionId: string;
  sectionName: string;

  submittedByUid: string;
  submittedByName: string;

  // If provided, overrides the default 'draft' status
  status?: ProposalStatus;
}

/**
 * All proposal fields (except id and createdAt) are patchable.
 */
export interface UpdateProposalInput
  extends Partial<Omit<TitleProposal, 'id' | 'createdAt'>> {}

// ─── Coordinator Review ───────────────────────────────────────────────────────

export interface CoordinatorEvaluationInput {
  coordinatorId: string;
  coordinatorName: string;
  coordinatorFeedback: string;
  decision: 'needs_revision' | 'approved';
}

// ─── Status Display Helpers ───────────────────────────────────────────────────

export interface ProposalStatusConfig {
  label: string;
  variant: 'gray' | 'amber' | 'blue' | 'emerald' | 'rose';
  description: string;
}

export const PROPOSAL_STATUS_CONFIG: Record<ProposalStatus, ProposalStatusConfig> = {
  draft: {
    label: 'Draft',
    variant: 'gray',
    description: 'Saved but not yet submitted for review.',
  },
  submitted: {
    label: 'Submitted',
    variant: 'amber',
    description: 'Awaiting coordinator review.',
  },
  needs_revision: {
    label: 'Needs Revision',
    variant: 'blue',
    description: 'The coordinator has requested changes.',
  },
  approved: {
    label: 'Approved',
    variant: 'emerald',
    description: 'Approved. Ready for Chapter 1–3 manuscript development.',
  },
};
