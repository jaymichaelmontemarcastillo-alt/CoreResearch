import api from './api';

export interface AdviserMatchResult {
  adviserId: string;
  adviserName: string;
  department: string;
  compatibilityScore: number;
  score: number;
  textSimilarity?: number;
  specializationMatch?: number;
  expertiseMatch?: number;
  researchInterestMatch?: number;
  matchedKeywords?: string[];
  matchedAreas: string[];
  explanation: string;
  algorithmVersion?: string;
}

export interface MatchMeta {
  provider: string;
  algorithmVersion: string;
  advisersEvaluated: number;
  executionTimeMs: number;
  generatedAt: string;
}

/**
 * Service boundary for Adviser Matching.
 * Calls the Node.js backend which delegates to the configured matching provider
 * (NLP service in production, mock provider in development).
 * 
 * The frontend does NOT know or care about the underlying provider implementation.
 */
class AdviserMatchingService {
  async getRecommendations(title: string, description: string): Promise<AdviserMatchResult[]> {
    try {
      const response = await api.post('/adviser-matching/match', {
        title,
        description,
      });

      const { data: results, meta } = response.data;

      if (!results || !Array.isArray(results)) {
        return [];
      }

      // Normalize results to the AdviserMatchResult interface
      return results.map((r: any) => ({
        adviserId: r.adviserId,
        adviserName: r.adviserName || 'Unknown Adviser',
        department: r.department || 'N/A',
        compatibilityScore: r.compatibilityScore ?? r.score ?? 0,
        score: r.score ?? r.compatibilityScore ?? 0,
        textSimilarity: r.textSimilarity,
        specializationMatch: r.specializationMatch,
        expertiseMatch: r.expertiseMatch,
        researchInterestMatch: r.researchInterestMatch,
        matchedKeywords: r.matchedKeywords || [],
        matchedAreas: r.matchedKeywords || r.matchedAreas || [],
        explanation: r.explanation || 'Match based on research compatibility analysis.',
        algorithmVersion: r.algorithmVersion || meta?.algorithmVersion,
      }));
    } catch (error: any) {
      // Re-throw with user-friendly messages based on status
      if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.message;

        if (status === 503) {
          throw new Error(message || 'Adviser matching service is temporarily unavailable. Please try again later.');
        }
        if (status === 400) {
          throw new Error(message || 'Invalid research title. Please check your input.');
        }
        throw new Error(message || 'Failed to generate adviser recommendations.');
      }

      // Network error (service unreachable)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Unable to reach the matching service. Please check your connection and try again.');
      }

      console.error('Error fetching adviser recommendations:', error);
      throw new Error('Failed to generate adviser recommendations.');
    }
  }
}

export const adviserMatchingService = new AdviserMatchingService();
export default adviserMatchingService;
