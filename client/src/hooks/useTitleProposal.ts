import { useState, useEffect, useCallback } from 'react';
import titleProposalService from '../services/titleProposal.service';
import {
  TitleProposal,
  CreateProposalInput,
  UpdateProposalInput,
  ProposalStatus,
  ProposalReviewComment,
} from '../types/proposal.types';

export const useTitleProposal = (
  studentId?: string,
  adviserId?: string,
  groupId?: string
) => {
  const [proposals, setProposals] = useState<TitleProposal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: TitleProposal[] = [];
      if (groupId) {
        data = await titleProposalService.getProposalsByGroup(groupId);
      } else if (studentId) {
        data = await titleProposalService.getProposalsByStudent(studentId);
      } else if (adviserId) {
        data = await titleProposalService.getProposalsByAdviser(adviserId);
      } else {
        data = await titleProposalService.getAllProposals();
      }
      setProposals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load title proposals');
    } finally {
      setLoading(false);
    }
  }, [studentId, adviserId, groupId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const submitProposal = async (input: CreateProposalInput): Promise<TitleProposal> => {
    setLoading(true);
    try {
      const created = await titleProposalService.createProposal(input);
      await fetchProposals();
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to submit proposal');
      throw err;
    } finally {
      setLoading(false);
    }
  };

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

  const updateStatus = async (id: string, status: ProposalStatus): Promise<void> => {
    return updateProposal(id, { status });
  };

  const addComment = async (id: string, comment: ProposalReviewComment): Promise<void> => {
    setLoading(true);
    try {
      await titleProposalService.addComment(id, comment);
      await fetchProposals();
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

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

  const canEdit = (proposal: TitleProposal): boolean => {
    return proposal.status === 'pending' || proposal.status === 'revisions_required';
  };

  const canDelete = (proposal: TitleProposal): boolean => {
    return proposal.status === 'pending';
  };

  return {
    proposals,
    loading,
    error,
    refetch: fetchProposals,
    submitProposal,
    updateProposal,
    updateStatus,
    addComment,
    deleteProposal,
    canEdit,
    canDelete,
  };
};

export default useTitleProposal;
