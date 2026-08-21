// ─────────────────────────────────────────────────────────────────────────────
// useTitleProposal — React hook for proposal state management
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import titleProposalService from '../services/titleProposal.service';
import {
  TitleProposal,
  CreateProposalInput,
  UpdateProposalInput,
  CoordinatorEvaluationInput,
  ProposalStatus,
} from '../types/proposal.types';

interface UseTitleProposalOptions {
  /** If provided, fetches proposals for this research group (student view) */
  groupId?: string;
  /** If true, fetches ALL submitted/active proposals (coordinator view) */
  coordinatorMode?: boolean;
  /** If provided, fetches submitted/active proposals for these groups (adviser view) */
  adviserGroupIds?: string[];
  /** If true, returns an empty list without querying (e.g. student without a group) */
  fetchNone?: boolean;
}

export const useTitleProposal = (options: UseTitleProposalOptions = {}) => {
  const { groupId, coordinatorMode = false, adviserGroupIds, fetchNone = false } = options;

  const [proposals, setProposals] = useState<TitleProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const adviserGroupIdsKey = adviserGroupIds ? adviserGroupIds.join(',') : '';

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: TitleProposal[] = [];
      if (fetchNone) {
        data = [];
      } else if (coordinatorMode) {
        data = await titleProposalService.getSubmittedProposals();
      } else if (adviserGroupIds && adviserGroupIds.length > 0) {
        data = await titleProposalService.getProposalsByGroupIds(adviserGroupIds);
      } else if (groupId) {
        data = await titleProposalService.getProposalsByGroup(groupId);
      } else {
        data = await titleProposalService.getAllProposals();
      }
      setProposals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  }, [groupId, coordinatorMode, adviserGroupIdsKey, fetchNone]);

  useEffect(() => {
    if (fetchNone) {
      setProposals([]);
      setLoading(false);
      return;
    }

    if (coordinatorMode) {
      setLoading(true);
      const unsubscribe = titleProposalService.subscribeSubmittedProposals(
        (list) => {
          setProposals(list);
          setLoading(false);
        },
        (err) => {
          setError(err.message || 'Failed to load coordinator queue');
          setLoading(false);
        }
      );
      return () => unsubscribe();
    }

    fetchProposals();
  }, [fetchProposals, coordinatorMode, fetchNone]);

  // ── Student Actions ────────────────────────────────────────────────────────

  /**
   * Create a new proposal and save it as a draft.
   */
  const createDraft = async (input: CreateProposalInput): Promise<TitleProposal> => {
    setLoading(true);
    try {
      const created = await titleProposalService.createProposal({
        ...input,
        status: 'draft',
      });
      await fetchProposals();
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new proposal and immediately submit it.
   */
  const createAndSubmit = async (
    input: CreateProposalInput,
    submittedByUid: string,
    submittedByName: string
  ): Promise<TitleProposal> => {
    setLoading(true);
    try {
      // Create as draft first, then submit
      const created = await titleProposalService.createProposal({
        ...input,
        status: 'draft',
      });
      await titleProposalService.submitProposal(created.id, submittedByUid, submittedByName);
      await fetchProposals();
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a draft's content without changing status.
   */
  const saveDraft = async (id: string, updates: UpdateProposalInput): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.saveDraft(id, updates);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit an existing draft proposal for coordinator review.
   */
  const submitExistingDraft = async (
    id: string,
    submittedByUid: string,
    submittedByName: string
  ): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.submitProposal(id, submittedByUid, submittedByName);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update and resubmit a 'needs_revision' proposal.
   */
  const resubmitProposal = async (
    id: string,
    updates: UpdateProposalInput,
    submittedByUid: string,
    submittedByName: string
  ): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.resubmitProposal(id, updates, submittedByUid, submittedByName);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generic field update (auto-save in forms).
   */
  const updateProposal = async (id: string, updates: UpdateProposalInput): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.updateProposal(id, updates);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to update proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a draft proposal.
   */
  const deleteProposal = async (id: string): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.deleteProposal(id);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to delete proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Coordinator Actions ────────────────────────────────────────────────────

  /**
   * Coordinator: request revision with feedback.
   */
  const requestRevision = async (
    id: string,
    evaluation: CoordinatorEvaluationInput
  ): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.requestRevision(id, evaluation);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to request revision');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Coordinator: approve the proposal.
   */
  const approveProposal = async (
    id: string,
    evaluation: CoordinatorEvaluationInput
  ): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.approveProposal(id, evaluation);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to approve proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Permission Helpers ─────────────────────────────────────────────────────

  const canStudentEdit = (status: ProposalStatus): boolean =>
    titleProposalService.canStudentEdit(status);

  const canStudentDelete = (status: ProposalStatus): boolean =>
    titleProposalService.canStudentDelete(status);

  const canCoordinatorReview = (status: ProposalStatus): boolean =>
    titleProposalService.canCoordinatorReview(status);

  // ── Return ─────────────────────────────────────────────────────────────────

  return {
    proposals,
    loading,
    error,
    refetch: fetchProposals,

    // Student
    createDraft,
    createAndSubmit,
    saveDraft,
    submitExistingDraft,
    resubmitProposal,
    updateProposal,
    deleteProposal,

    // Coordinator
    requestRevision,
    approveProposal,

    // Permission helpers
    canStudentEdit,
    canStudentDelete,
    canCoordinatorReview,
  };
};

export default useTitleProposal;
