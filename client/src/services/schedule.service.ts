import api from './api';
import {
  DefenseSchedule,
  CreateScheduleInput,
  ScheduleStatus,
} from '../types/schedule.types';

export const scheduleService = {
  /**
   * Create a new defense schedule.
   */
  async createSchedule(input: CreateScheduleInput): Promise<DefenseSchedule> {
    if (input.adviserId && Array.isArray(input.panelistIds) && input.panelistIds.includes(input.adviserId)) {
      throw new Error('Invalid Panelist Assignment: The assigned adviser of this research group cannot serve as a panelist for the same group.');
    }
    const id = `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const { data } = await api.post('/schedules', { ...input, id });
    const createdData = data.data;
    if (!createdData || typeof createdData.id !== 'string') {
      throw new Error('The schedules API returned an invalid created schedule.');
    }

    const scheduleData: DefenseSchedule = {
      id: createdData.id,
      ...input,
      ...createdData,
      status: createdData?.status || input.status || 'scheduled',
      attempt: createdData?.attempt || input.attempt || 1,
      defenseStage:
        createdData?.defenseStage ||
        input.defenseStage ||
        (input.attempt && input.attempt > 1
          ? `Re-defense (Attempt ${input.attempt})`
          : 'Title Defense'),
      createdAt: createdData?.createdAt || now,
      updatedAt: createdData?.updatedAt || now,
    };

    return scheduleData;
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
    if (!Array.isArray(data?.data)) {
      throw new Error('The schedules API returned an invalid response.');
    }
    return data.data;
  },

  /**
   * Fetch defense schedules for a specific project.
   */
  async getSchedulesByProject(projectId: string): Promise<DefenseSchedule[]> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.filter(s => s.projectId === projectId || s.groupId === projectId);
  },

  /**
   * Fetch defense schedules for a student dashboard.
   */
  async getSchedulesForStudent(
    studentId: string, 
    groupId?: string | null,
    studentName?: string | null,
    projectTitle?: string | null
  ): Promise<DefenseSchedule[]> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.filter(s => {
      if (studentId && s.memberIds?.includes(studentId)) return true;
      if (groupId && (s.projectId === groupId || s.groupId === groupId)) return true;
      if (studentName && s.studentName === studentName) return true;
      if (projectTitle && s.projectTitle === projectTitle) return true;
      return false;
    });
  },

  /**
   * Fetch defense schedules for an adviser dashboard.
   */
  async getSchedulesForAdviser(adviserId: string, groupIds: string[] = []): Promise<DefenseSchedule[]> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.filter(s => {
      if (adviserId && s.adviserId === adviserId) return true;
      if (groupIds && groupIds.length > 0) {
        if (groupIds.includes(s.projectId) || (s.groupId && groupIds.includes(s.groupId))) return true;
      }
      return false;
    });
  },

  /**
   * Update full schedule (Admin only)
   */
  async updateSchedule(scheduleId: string, updates: Partial<DefenseSchedule>): Promise<DefenseSchedule> {
    if (updates.adviserId && Array.isArray(updates.panelists) && updates.panelists.some((p: any) => (p.id || p.uid) === updates.adviserId)) {
      throw new Error('Invalid Panelist Assignment: The assigned adviser of this research group cannot serve as a panelist for the same group.');
    }

    const { data } = await api.put(`/schedules/${scheduleId}`, updates);
    if (!data?.data || data.data.id !== scheduleId) {
      throw new Error('The schedules API returned an invalid updated schedule.');
    }
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
   * Bulk create schedules through the authoritative Node API.
   */
  async bulkCreateSchedules(schedules: any[]) {
    // Validate that no group's adviser is in its panelists
    for (const s of schedules) {
      if (s.adviserId && Array.isArray(s.panelists) && s.panelists.some((p: any) => (p.id || p.uid) === s.adviserId)) {
        throw new Error(`Invalid Panelist Assignment: The assigned adviser cannot serve as a panelist for group "${s.projectTitle || s.projectId}".`);
      }
    }

    const response = await api.post('/schedules/bulk', { schedules });
    if (!response.data?.success || !Array.isArray(response.data.data)) {
      throw new Error('The schedules API returned an invalid bulk-create response.');
    }
    return response.data;
  }
};

export default scheduleService;
