import { useState, useEffect, useCallback } from 'react';
import gradingService from '../services/grading.service';
import { Evaluation, SubmitEvaluationInput } from '../types/grading.types';

export const useGrading = (defenseId?: string, panelistId?: string) => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [myEvaluation, setMyEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvaluations = useCallback(async () => {
    if (!defenseId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await gradingService.getEvaluationsByDefense(defenseId);
      setEvaluations(list);

      if (panelistId) {
        const mine = await gradingService.getEvaluationByPanelist(defenseId, panelistId);
        setMyEvaluation(mine);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch defense evaluations');
    } finally {
      setLoading(false);
    }
  }, [defenseId, panelistId]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const submitEvaluation = async (input: SubmitEvaluationInput): Promise<Evaluation> => {
    setLoading(true);
    try {
      const res = await gradingService.submitEvaluation(input);
      await fetchEvaluations();
      return res;
    } catch (err: any) {
      setError(err.message || 'Failed to submit evaluation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    evaluations,
    myEvaluation,
    loading,
    error,
    refetch: fetchEvaluations,
    submitEvaluation,
  };
};

export default useGrading;
