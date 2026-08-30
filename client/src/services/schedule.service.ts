import { db } from '../firebase/firebase';
import api from './api';
import {
  DefenseSchedule,
  CreateScheduleInput,
  ScheduleStatus,
} from '../types/schedule.types';

const COLLECTION_NAME = 'schedules';

export const scheduleService = {
  /**
   * Create a new defense schedule.
   */
  async createSchedule(input: CreateScheduleInput): Promise<DefenseSchedule> {
    const { data } = await api.post('/schedules', input);
    return data.data;
  },

  /**
   * Fetch a defense schedule by ID.
   */
  async getScheduleById(id: string): Promise<DefenseSchedule | null> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.find(s => s.id === id) || null;
  },

  /**
   * Fetch all defense schedules.
   */
  async getAllSchedules(): Promise<DefenseSchedule[]> {
    const { data } = await api.get('/schedules');
    return data.data;
  },

  /**
   * Fetch defense schedules for a specific project.
   */
  async getSchedulesByProject(projectId: string): Promise<DefenseSchedule[]> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.filter(s => s.projectId === projectId);
  },

  /**
   * Update full schedule (Admin only)
   */
  async updateSchedule(scheduleId: string, updates: Partial<DefenseSchedule>): Promise<DefenseSchedule> {
    const { data } = await api.put(`/schedules/${scheduleId}`, updates);
    return data.data;
  },

  /**
   * Update schedule status (Admin & Adviser)
   */
  async updateScheduleStatus(id: string, status: ScheduleStatus): Promise<void> {
    await api.patch(`/schedules/${id}/status`, { status });
  },

  /**
   * Delete a defense schedule.
   */
  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/schedules/${id}`);
  },

  /**
   * Generate schedule preview using Node API
   */
  async generateSchedulePreview(payload: { groups: any[], config: any }) {
    const response = await api.post('/schedules/preview', payload);
    return response.data.data;
  },

  /**
   * Bulk create schedules using Node API
   */
  async bulkCreateSchedules(schedules: any[]) {
    const response = await api.post('/schedules/bulk', { schedules });
    return response.data;
  }
};

export default scheduleService;
