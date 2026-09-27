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

// ─── Final Oral Defense Rubric ──────────────────────────────────────────────

export interface FinalDefenseRubricScores {
  // Manuscript (30%)
  format: number;                   // max 5
  researchProblems: number;         // max 5
  relatedLiterature: number;        // max 5
  methodology: number;              // max 5
  technicalBackground: number;      // max 5
  summaryConclusions: number;       // max 5
  // Oral Defense (20%)
  presentation: number;             // max 10
  defense: number;                  // max 10
  // Capstone Project / Thesis (50%)
  functionality: number;            // max 15
  usability: number;                // max 20
  reliability: number;              // max 15
}

export interface FinalDefenseSubTotals {
  manuscript: number; // max 30
  oral: number;       // max 20
  project: number;    // max 50
  overall: number;    // max 100
}

export type FinalDefenseVerdict =
  | 'PASSED'                      // 95-100
  | 'PASSED_WITH_MINOR_REVISIONS' // 85-94
  | 'PASSED_WITH_MAJOR_REVISIONS' // 75-84
  | 'REDEFENSE'                   // 70-74
  | 'DISAPPROVED';                // BELOW 70

export interface FinalDefenseEvaluation {
  id: string;
  defenseId: string;
  workspaceId?: string;
  projectId?: string;
  panelistId: string;
  panelistName: string;
  scores: FinalDefenseRubricScores;
  subTotals: FinalDefenseSubTotals;
  verdict: FinalDefenseVerdict;
  submittedAt: string;
}

export interface SubmitFinalDefenseEvaluationInput {
  defenseId: string;
  workspaceId?: string;
  projectId?: string;
  panelistId: string;
  panelistName: string;
  scores: FinalDefenseRubricScores;
  subTotals: FinalDefenseSubTotals;
  verdict: FinalDefenseVerdict;
}
