import { describe, it, expect, vi } from 'vitest';
import api from './api';
import adviserMatchingService from './adviserMatching.service';

// Mock the API module
vi.mock('./api', () => {
  return {
    default: {
      post: vi.fn(),
    },
  };
});

describe('AdviserMatchingService', () => {
  it('should correctly normalize a valid backend response', async () => {
    // 1. Mock api.post() so no real backend/network request occurs
    const mockResponse = {
      data: {
        data: [
          {
            adviserId: 'adv-001',
            adviserName: 'Dr. Juan Dela Cruz',
            department: 'Computer Science',
            compatibilityScore: 92,
            score: 92,
            matchedKeywords: ['NLP', 'Research Management'],
            explanation: 'Strong research compatibility.',
          },
        ],
        meta: {
          algorithmVersion: 'v1',
        },
      },
    };

    (api.post as any).mockResolvedValue(mockResponse);

    // 2. Call adviserMatchingService.getRecommendations()
    const results = await adviserMatchingService.getRecommendations(
      'CoreResearch',
      'Research management system using NLP'
    );

    // 3. Verify that one adviser result is returned
    expect(results).toHaveLength(1);

    // 4. Verify specific fields
    const result = results[0];
    expect(result.adviserId).toBe('adv-001');
    expect(result.adviserName).toBe('Dr. Juan Dela Cruz');
    expect(result.department).toBe('Computer Science');
    expect(result.compatibilityScore).toBe(92);
    expect(result.score).toBe(92);
    expect(result.matchedKeywords).toContain('NLP');
    expect(result.algorithmVersion).toBe('v1');
    
    // Also verify API was called with correct parameters
    expect(api.post).toHaveBeenCalledWith('/adviser-matching/match', {
      title: 'CoreResearch',
      description: 'Research management system using NLP'
    });
  });
});
