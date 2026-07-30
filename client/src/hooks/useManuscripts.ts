import { useState, useEffect, useCallback } from 'react';
import manuscriptService from '../services/manuscript.service';
import {
  ManuscriptVersion,
  UploadManuscriptInput,
  ManuscriptStatus,
  ManuscriptComment,
} from '../types/manuscript.types';

export const useManuscripts = (projectId?: string) => {
  const [manuscripts, setManuscripts] = useState<ManuscriptVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchManuscripts = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await manuscriptService.getManuscriptsByProject(projectId);
      setManuscripts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch manuscripts');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchManuscripts();
  }, [fetchManuscripts]);

  const uploadManuscript = async (input: UploadManuscriptInput): Promise<ManuscriptVersion> => {
    setLoading(true);
    try {
      const created = await manuscriptService.createManuscriptVersion(input);
      await fetchManuscripts();
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to record manuscript version');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ManuscriptStatus): Promise<void> => {
    setLoading(true);
    try {
      await manuscriptService.updateManuscriptStatus(id, status);
      await fetchManuscripts();
    } catch (err: any) {
      setError(err.message || 'Failed to update manuscript status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (id: string, comment: ManuscriptComment): Promise<void> => {
    setLoading(true);
    try {
      await manuscriptService.addComment(id, comment);
      await fetchManuscripts();
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    manuscripts,
    loading,
    error,
    refetch: fetchManuscripts,
    uploadManuscript,
    updateStatus,
    addComment,
  };
};

export default useManuscripts;
