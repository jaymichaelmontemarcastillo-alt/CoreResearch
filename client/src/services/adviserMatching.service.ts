import api from './api';

export interface PublishedWork {
  id: string;
  title: string;
  abstract?: string;
  keywords?: string[];
  researchTopics?: string[];
  methodologies?: string[];
  fileUrl?: string;
}

export interface AdviserMatchResult {
  adviserId: string;
  adviserName: string;
  department: string;
  compatibilityScore: number;
  score: number;
  textSimilarity?: number;
  topicMatch?: number;
  conceptMatch?: number;
  methodologyMatch?: number;
  profileMatch?: number;
  matchedKeywords?: string[];
  matchedAreas: string[];
  matchedPaperTitle?: string | null;
  matchedResearch?: Array<{
    documentId: string;
    title: string;
    similarity: number;
    relevance: string;
  }>;
  explanation: string;
  algorithmVersion?: string;
  maxCapacity?: number;
  activeGroupsCount?: number;
  availableSlots?: number;
  isFull?: boolean;
  isAvailable?: boolean;
  profile_image?: string;
  publishedWorks?: PublishedWork[];
}

export interface RecommendationResponse {
  matches: AdviserMatchResult[];
  availableAlternatives: AdviserMatchResult[];
  allTopMatchesFull: boolean;
  totalAvailableAdvisers: number;
  meta?: any;
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
  async getRecommendations(title: string, description: string): Promise<RecommendationResponse> {
    try {
      const response = await api.post('/adviser-matching/match', {
        title,
        description,
      });

      const { data: results, availableAlternatives = [], meta } = response.data;

      const normalizeAdviser = (r: any): AdviserMatchResult => ({
        adviserId: r.adviserId,
        adviserName: r.adviserName || 'Unknown Adviser',
        department: r.department || 'N/A',
        compatibilityScore: r.compatibilityScore ?? r.score ?? 0,
        score: r.score ?? r.compatibilityScore ?? 0,
        textSimilarity: r.textSimilarity,
        topicMatch: r.topicMatch,
        conceptMatch: r.conceptMatch,
        methodologyMatch: r.methodologyMatch,
        profileMatch: r.profileMatch,
        matchedKeywords: r.matchedKeywords || [],
        matchedAreas: r.matchedKeywords || r.matchedAreas || [],
        matchedPaperTitle: r.matchedPaperTitle,
        matchedResearch: r.matchedResearch || [],
        explanation: r.explanation || 'Match based on research compatibility analysis.',
        algorithmVersion: r.algorithmVersion || meta?.algorithmVersion,
        maxCapacity: r.maxCapacity ?? 5,
        activeGroupsCount: r.activeGroupsCount ?? 0,
        availableSlots: r.availableSlots ?? Math.max(0, (r.maxCapacity ?? 5) - (r.activeGroupsCount ?? 0)),
        isFull: r.isFull ?? ((r.activeGroupsCount ?? 0) >= (r.maxCapacity ?? 5)),
        isAvailable: r.isAvailable ?? true,
        profile_image: r.profile_image || '',
        publishedWorks: r.publishedWorks || [],
      });

      const matches = Array.isArray(results) ? results.map(normalizeAdviser) : [];
      const alternatives = Array.isArray(availableAlternatives) ? availableAlternatives.map(normalizeAdviser) : [];

      return {
        matches,
        availableAlternatives: alternatives,
        allTopMatchesFull: Boolean(meta?.allTopMatchesFull || (matches.length > 0 && matches.every(m => m.isFull))),
        totalAvailableAdvisers: meta?.totalAvailableAdvisers ?? alternatives.length,
        meta,
      };
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

  async getAvailableAdvisers(): Promise<AdviserMatchResult[]> {
    try {
      const response = await api.get('/adviser-matching/available');
      const data = response.data?.data || [];
      return data.map((r: any) => ({
        adviserId: r.adviserId,
        adviserName: r.adviserName || 'Unknown Adviser',
        department: r.department || 'N/A',
        compatibilityScore: r.compatibilityScore ?? 0,
        score: r.score ?? 0,
        matchedKeywords: r.matchedKeywords || [],
        matchedAreas: r.matchedAreas || [],
        explanation: r.explanation || '',
        maxCapacity: r.maxCapacity ?? 5,
        activeGroupsCount: r.activeGroupsCount ?? 0,
        availableSlots: r.availableSlots ?? Math.max(0, (r.maxCapacity ?? 5) - (r.activeGroupsCount ?? 0)),
        isFull: false,
        isAvailable: true,
        profile_image: r.profile_image || '',
        publishedWorks: r.publishedWorks || [],
      }));
    } catch (err: any) {
      console.warn('[adviserMatchingService] getAvailableAdvisers error:', err);
      return [];
    }
  }

  async extractDocument(file: File): Promise<{ title: string; abstract: string; keywords: string[] }> {
    try {
      const formData = new FormData();
      formData.append('document', file);

      const response = await api.post('/adviser-matching/extract-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(error.response.data?.message || 'Failed to extract document content.');
      }
      throw new Error('Unable to reach the service. Please check your connection and try again.');
    }
  }
}

export const adviserMatchingService = new AdviserMatchingService();
export default adviserMatchingService;
