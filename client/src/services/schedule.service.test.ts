import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
}));

vi.mock('./api', () => ({ default: apiMock }));

import { scheduleService } from './schedule.service';

describe('scheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the schedule persisted by the API', async () => {
    const persistedSchedule = { id: 'schedule-1', status: 'scheduled' };
    apiMock.post.mockResolvedValue({ data: { data: persistedSchedule } });

    const result = await scheduleService.createSchedule({
      projectId: 'project-1',
      projectTitle: 'Research project',
      defenseType: 'proposal_defense',
      date: '2026-10-01',
      startTime: '10:00',
      endTime: '11:00',
      venue: 'Room 1'
    });

    expect(apiMock.post).toHaveBeenCalledWith(
      '/schedules',
      expect.objectContaining({ projectId: 'project-1', id: expect.any(String) })
    );
    expect(result.id).toBe('schedule-1');
  });

  it('propagates API failures instead of treating a local Firestore write as success', async () => {
    apiMock.post.mockRejectedValue(new Error('API unavailable'));

    await expect(scheduleService.createSchedule({
      projectId: 'project-1',
      projectTitle: 'Research project',
      defenseType: 'proposal_defense',
      date: '2026-10-01',
      startTime: '10:00',
      endTime: '11:00',
      venue: 'Room 1'
    })).rejects.toThrow('API unavailable');
  });
});
