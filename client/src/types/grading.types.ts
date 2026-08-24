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
