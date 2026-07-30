import { useState, useEffect, useCallback } from 'react';
import scheduleService from '../services/schedule.service';
import {
  DefenseSchedule,
  CreateScheduleInput,
  ScheduleStatus,
} from '../types/schedule.types';

export const useSchedules = (projectId?: string) => {
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: DefenseSchedule[] = [];
      if (projectId) {
        data = await scheduleService.getSchedulesByProject(projectId);
      } else {
        data = await scheduleService.getAllSchedules();
      }
      setSchedules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch defense schedules');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = async (input: CreateScheduleInput): Promise<DefenseSchedule> => {
    setLoading(true);
    try {
      const created = await scheduleService.createSchedule(input);
      await fetchSchedules();
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to create schedule');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ScheduleStatus): Promise<void> => {
    setLoading(true);
    try {
      await scheduleService.updateScheduleStatus(id, status);
      await fetchSchedules();
    } catch (err: any) {
      setError(err.message || 'Failed to update schedule status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    schedules,
    loading,
    error,
    refetch: fetchSchedules,
    createSchedule,
    updateStatus,
  };
};

export default useSchedules;
