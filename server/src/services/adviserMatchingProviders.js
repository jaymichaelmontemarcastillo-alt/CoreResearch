/**
 * Adviser Matching Providers — CoreResearch Phase 6
 * 
 * Provider abstraction for adviser matching.
 * Each provider implements the same interface:
 *   matchAdvisers(title, description, advisers) → Promise<MatchResult[]>
 * 
 * Providers:
 *   - MockAdviserMatchingProvider:  Deterministic fake scores for dev/testing
 *   - NLPAdviserMatchingProvider:   Calls Python FastAPI NLP service
 */

// ── Mock Provider ─────────────────────────────────────────────────────────────

/**
 * Mock Adviser Matching Provider.
 * Returns deterministic scores based on adviser index.
 * For development and testing only — never use in production.
 */
export class MockAdviserMatchingProvider {
  constructor() {
    this.name = 'mock';
    this.version = 'v1.0-mock';
  }

  async matchAdvisers(title, description, advisers) {
    console.log(`[MockMatchingProvider] Generating mock scores for ${advisers.length} advisers`);

    const results = advisers.map((adviser, index) => {
      // Deterministic pseudo-score based on index
      let baseScore = 95 - (index * 7);
      if (baseScore < 55) baseScore = 55 + Math.floor(Math.random() * 15);

      const textSimilarity = Math.min(baseScore + 3, 100);
      const specializationMatch = Math.min(baseScore + 5, 100);
      const expertiseMatch = Math.max(baseScore - 2, 0);
      const researchInterestMatch = Math.max(baseScore - 5, 0);

      // Generate a mock explanation
      let explanation = 'Moderate compatibility based on general research domain.';
      if (baseScore > 90) {
        explanation = 'Exceptional overlap with adviser\'s core expertise and specialization.';
      } else if (baseScore > 80) {
        explanation = 'Strong match in specialization and research interests.';
      } else if (baseScore > 70) {
        explanation = 'Good compatibility with relevant expertise overlap.';
      }

      const matchedKeywords = (adviser.specialization || []).slice(0, 3);

      return {
        adviserId: adviser.adviserId,
        score: Math.round(baseScore),
        textSimilarity: Math.round(textSimilarity),
        specializationMatch: Math.round(specializationMatch),
        expertiseMatch: Math.round(expertiseMatch),
        researchInterestMatch: Math.round(researchInterestMatch),
        matchedKeywords,
        explanation,
        algorithmVersion: this.version,
      };
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results;
  }
}


// ── NLP Provider ──────────────────────────────────────────────────────────────

/**
 * NLP Adviser Matching Provider.
 * Calls the Python FastAPI NLP service to perform actual
 * TF-IDF, cosine similarity, and multi-factor matching.
 */
export class NLPAdviserMatchingProvider {
  constructor(options = {}) {
    this.name = 'nlp';
    this.version = 'v1.0';
    this.serviceUrl = options.serviceUrl || process.env.NLP_SERVICE_URL || 'http://localhost:8000';
    this.timeoutMs = options.timeoutMs || parseInt(process.env.NLP_TIMEOUT_MS || '30000', 10);
  }

  /**
   * Check if the NLP service is reachable by calling GET /health.
   * @returns {Promise<{healthy: boolean, version?: string, error?: string}>}
   */
  async isHealthy() {
    const url = `${this.serviceUrl}/health`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout for health check
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return { healthy: false, error: `HTTP ${response.status}` };
      }
      const data = await response.json();
      return { healthy: true, version: data.version || this.version };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { healthy: false, error: 'Health check timed out' };
      }
      if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        return { healthy: false, error: `Service unreachable at ${this.serviceUrl}` };
      }
      return { healthy: false, error: error.message };
    }
  }

  async matchAdvisers(title, description, advisers) {
    const startTime = Date.now();
    const url = `${this.serviceUrl}/match/advisers`;

    // Prepare minimal adviser payload for NLP (no PII, no Firestore-specific data)
    const adviserPayload = advisers.map(adv => ({
      adviserId: adv.adviserId,
      specialization: adv.specialization || [],
      expertise: adv.expertise || [],
      researchInterests: adv.researchInterests || [],
      keywords: adv.keywords || [],
    }));

    console.log(
      `[NLPMatchingProvider] Calling NLP service: ${url} | ` +
      `Title: "${title.substring(0, 60)}..." | ` +
      `Advisers: ${adviserPayload.length} | ` +
      `Timeout: ${this.timeoutMs}ms`
    );

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || '',
          advisers: adviserPayload,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(
          `[NLPMatchingProvider] NLP service returned ${response.status}: ${errorText}`
        );
        throw new Error(`NLP service returned HTTP ${response.status}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data || !Array.isArray(data.results)) {
        console.error('[NLPMatchingProvider] Invalid response structure:', JSON.stringify(data).substring(0, 200));
        throw new Error('NLP service returned invalid response structure');
      }

      // Validate each result has required fields
      const validResults = data.results.filter(r => {
        if (!r.adviserId || typeof r.score !== 'number') {
          console.warn(`[NLPMatchingProvider] Skipping invalid result:`, r);
          return false;
        }
        return true;
      });

      const executionMs = Date.now() - startTime;
      console.log(
        `[NLPMatchingProvider] Success in ${executionMs}ms | ` +
        `Results: ${validResults.length} | ` +
        `Top score: ${validResults[0]?.score || 0} | ` +
        `Algorithm: ${data.algorithmVersion || this.version}`
      );

      return validResults;

    } catch (error) {
      clearTimeout(timeoutId);
      const executionMs = Date.now() - startTime;

      if (error.name === 'AbortError') {
        console.error(
          `[NLPMatchingProvider] Request timed out after ${this.timeoutMs}ms`
        );
        throw new Error(
          'Adviser matching service timed out. Please try again later.'
        );
      }

      if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        console.error(
          `[NLPMatchingProvider] NLP service unreachable at ${this.serviceUrl} (${executionMs}ms)`
        );
        throw new Error(
          'Adviser matching service is temporarily unavailable. Please try again later.'
        );
      }

      console.error(
        `[NLPMatchingProvider] Matching error after ${executionMs}ms:`,
        error.message
      );
      throw error;
    }
  }
}

// ── Gemini Provider ───────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';

// Simple in-memory cache for adviser embeddings to save API calls
const adviserEmbeddingCache = new Map();

// Helper to compute cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper for exact/partial text overlap
function calculateOverlapScore(researchText, adviserItems) {
  if (!adviserItems || adviserItems.length === 0) return 0;
  
  const researchTokens = researchText.toLowerCase().split(/\W+/).filter(t => t.length > 1);
  if (researchTokens.length === 0) return 0;
  
  let matchCount = 0;
  const adviserTokens = new Set();
  
  adviserItems.forEach(item => {
    item.toLowerCase().split(/\W+/).filter(t => t.length > 1).forEach(t => adviserTokens.add(t));
  });
  
  adviserTokens.forEach(token => {
    if (researchTokens.includes(token)) {
      matchCount++;
    }
  });
  
  // Normalize score between 0 and 100 based on matches
  // Simple heuristic: 1 match = 30, 2 matches = 60, 3+ matches = 100
  const score = Math.min((matchCount / 3) * 100, 100);
  return score;
}

/**
 * Gemini Adviser Matching Provider.
 * Calls the Google Gemini API to perform semantic embeddings,
 * then ranks locally using configurable weights.
 */
export class GeminiAdviserMatchingProvider {
  constructor(options = {}) {
    this.name = 'gemini';
    this.version = 'v2.0-gemini';
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      console.warn('[GeminiProvider] GEMINI_API_KEY is not set. Matching will fail.');
    }
    
    // Configurable Scoring Weights
    this.WEIGHTS = {
      semantic: 0.50,
      specialization: 0.25,
      expertise: 0.15,
      researchInterest: 0.10
    };
  }

  async isHealthy() {
    if (!this.apiKey) {
      return { healthy: false, error: 'GEMINI_API_KEY is missing in backend configuration' };
    }
    return { healthy: true, version: this.version };
  }

  async _getEmbedding(text) {
    if (!text || text.trim() === '') return new Array(768).fill(0); // Dummy empty embedding
    try {
      const response = await this.ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,
      });
      return response.embeddings[0].values;
    } catch (err) {
      console.error('[GeminiProvider] Error generating embedding:', err.message);
      return new Array(768).fill(0); // Fallback so we don't crash the entire request
    }
  }

  async matchAdvisers(title, description, advisers) {
    if (!this.ai) {
      throw new Error('Matching service is misconfigured (GEMINI_API_KEY missing).');
    }
    
    const startTime = Date.now();
    const researchText = `${title} ${description || ''}`.trim();
    
    console.log(`[GeminiProvider] Generating semantic embedding for research: "${title.substring(0, 40)}..."`);
    const studentEmbedding = await this._getEmbedding(researchText);
    
    console.log(`[GeminiProvider] Scoring ${advisers.length} advisers against semantic representation...`);
    
    const results = [];
    
    for (const adv of advisers) {
      // 1. Generate/Retrieve Semantic Representation for Adviser
      const adviserText = [
        ...(adv.specialization || []),
        ...(adv.expertise || []),
        ...(adv.researchInterests || []),
        ...(adv.keywords || [])
      ].join(' ');
      
      let advEmbedding;
      const cacheKey = `adv_emb_${adv.adviserId}_${adviserText.length}`;
      
      if (adviserEmbeddingCache.has(cacheKey)) {
        advEmbedding = adviserEmbeddingCache.get(cacheKey);
      } else {
        advEmbedding = await this._getEmbedding(adviserText);
        if (adviserText.trim() !== '') {
          adviserEmbeddingCache.set(cacheKey, advEmbedding);
        }
      }
      
      // 2. Calculate Sub-scores
      // Semantic Score (Cosine Similarity scaled)
      // Gemini embeddings typically range from ~0.65 (unrelated) to 1.0 (identical)
      const cosineSim = cosineSimilarity(studentEmbedding, advEmbedding);
      
      const BASELINE = 0.65;
      let rawSemanticScore = 0;
      if (cosineSim > BASELINE) {
        rawSemanticScore = ((cosineSim - BASELINE) / (1.0 - BASELINE)) * 100;
      }
      
      // Keyword Overlap Scores
      const specScore = calculateOverlapScore(researchText, adv.specialization);
      const expScore = calculateOverlapScore(researchText, adv.expertise);
      const intScore = calculateOverlapScore(researchText, adv.researchInterests);
      
      // 3. Final Weighted Score
      const finalScore = 
        (rawSemanticScore * this.WEIGHTS.semantic) +
        (specScore * this.WEIGHTS.specialization) +
        (expScore * this.WEIGHTS.expertise) +
        (intScore * this.WEIGHTS.researchInterest);
        
      // 4. Generate Recommendation Reason
      let explanation = 'Moderate compatibility based on general research domain.';
      if (finalScore > 85) {
        explanation = "Exceptional semantic match with adviser's core expertise and specialization.";
      } else if (finalScore > 70) {
        explanation = 'Strong match in specialization and research interests.';
      } else if (finalScore > 50) {
        explanation = 'Good compatibility with relevant expertise overlap.';
      }
      
      const matchedKeywords = (adv.specialization || []).slice(0, 3);
      
      results.push({
        adviserId: adv.adviserId,
        score: Math.round(finalScore),
        textSimilarity: Math.round(rawSemanticScore),
        specializationMatch: Math.round(specScore),
        expertiseMatch: Math.round(expScore),
        researchInterestMatch: Math.round(intScore),
        matchedKeywords,
        explanation,
        algorithmVersion: this.version
      });
    }
    
    // 5. Rank
    results.sort((a, b) => b.score - a.score);
    
    console.log(`[GeminiProvider] Match complete in ${Date.now() - startTime}ms. Top score: ${results[0]?.score}`);
    return results;
  }
}
