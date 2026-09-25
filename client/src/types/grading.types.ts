export interface RubricScore {
  presentation: number;
  methodology: number;
  results: number;
  manuscriptQuality: number;
}

export interface Evaluation {
  id: string;
  defenseId: string;
  projectId: string;
  panelistId: string;
  scores: RubricScore;
  totalScore: number;
  remarks: string;
  submittedAt: string;
}

export interface SubmitEvaluationInput {
  defenseId: string;
  projectId: string;
  panelistId: string;
  scores: RubricScore;
  remarks: string;
}

// ─── Proposal Defense Rubric ────────────────────────────────────────────────

export interface ProposalRubricScores {
  // Manuscript (30%)
  format: number;             // max 7
  researchProblems: number;   // max 8
  relatedLiterature: number;  // max 7
  methodology: number;        // max 8
  // Oral Defense (30%)
  presentation: number;       // max 15
  defense: number;            // max 15
  // Capstone/Thesis Project (40%)
  innovation: number;         // max 15
  application: number;        // max 15
  impact: number;             // max 10
}

export interface ProposalSubTotals {
  manuscript: number; // max 30
  oral: number;       // max 30
  project: number;    // max 40
  overall: number;    // max 100
}

export type ProposalVerdict =
  | 'APPROVED'               // 86–100
  | 'APPROVED_WITH_REVISIONS' // 75–85
  | 'DISAPPROVED';           // below 75

export interface ProposalEvaluation {
  id: string;
  defenseId: string;
  workspaceId?: string;
  projectId?: string;
  panelistId: string;
  panelistName: string;
  scores: ProposalRubricScores;
  subTotals: ProposalSubTotals;
  verdict: ProposalVerdict;
  submittedAt: string;
}

export interface SubmitProposalEvaluationInput {
  defenseId: string;
  workspaceId?: string;
  projectId?: string;
  panelistId: string;
  panelistName: string;
  scores: ProposalRubricScores;
  subTotals: ProposalSubTotals;
  verdict: ProposalVerdict;
}

