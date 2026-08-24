import { useState, useEffect, useCallback } from 'react';
import researchGroupService from '../services/researchGroup.service';
import {
  ResearchProject,
  CreateGroupInput,
  UpdateGroupInput,
} from '../types/researchGroup.types';

export const useResearchGroups = (studentId?: string, adviserId?: string) => {
  const [groups, setGroups] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: ResearchProject[] = [];
      if (studentId) {
        data = await researchGroupService.getGroupsByStudent(studentId);
      } else if (adviserId) {
        data = await researchGroupService.getGroupsByAdviser(adviserId);
      } else {
        data = await researchGroupService.getAllResearchGroups();
      }
      setGroups(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch research groups');
    } finally {
      setLoading(false);
    }
  }, [studentId, adviserId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (input: CreateGroupInput): Promise<ResearchProject> => {
    setLoading(true);
    try {
      const created = await researchGroupService.createResearchGroup(input);
      await fetchGroups();
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateGroup = async (id: string, updates: UpdateGroupInput): Promise<void> => {
    setLoading(true);
    try {
      await researchGroupService.updateResearchGroup(id, updates);
      await fetchGroups();
    } catch (err: any) {
      setError(err.message || 'Failed to update group');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    groups,
    loading,
    error,
    refetch: fetchGroups,
    createGroup,
    updateGroup,
  };
};

export default useResearchGroups;
