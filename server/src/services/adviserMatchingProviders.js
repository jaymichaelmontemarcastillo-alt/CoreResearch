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
import { AdviserResearchDocument } from '../models/AdviserResearchDocument.js';

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

// Helper for phrase-based overlap similarity
function calculateOverlapScore(researchText, adviserItems) {
  if (!adviserItems || adviserItems.length === 0) return 0;
  if (!researchText || researchText.trim() === '') return 0;
  
  const researchTextLower = researchText.toLowerCase();
  
  // Normalize adviser items into cleaned multi-word phrases
  const adviserPhrases = new Set();
  adviserItems.forEach(item => {
    if (typeof item === 'string' && item.trim()) {
      const cleaned = item.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
      if (cleaned.length > 2) adviserPhrases.add(cleaned);
    }
  });

  if (adviserPhrases.size === 0) return 0;
  
  let matchScore = 0;
  adviserPhrases.forEach(phrase => {
    // Exact phrase match
    if (researchTextLower.includes(phrase)) {
      matchScore += 1.0;
    } else {
      // Partial match: if more than half the words >3 chars are found
      const words = phrase.split(' ');
      if (words.length > 1) {
        const significantWords = words.filter(w => w.length > 3);
        const matchedWords = significantWords.filter(w => researchTextLower.includes(w)).length;
        if (significantWords.length > 0 && matchedWords / significantWords.length > 0.5) {
          matchScore += 0.5;
        }
      }
    }
  });
  
  // Scale proportionally. Dynamic cap based on phrases.
  const cap = Math.max(3, adviserPhrases.size * 0.25);
  return Math.min((matchScore / cap) * 100, 100);
}

/**
 * Gemini Adviser Matching Provider.
 * Calls the Google Gemini API to perform semantic embeddings,
 * then ranks locally using configurable weights.
 */
export class GeminiAdviserMatchingProvider {
  constructor(options = {}) {
    this.name = 'gemini';
    this.version = 'v2.2-gemini-multisignal';
    this._ai = null; // Lazy — initialized on first use
    
    // Configurable Scoring Constants
    this.MATCHING_CONFIG = {
      WEIGHTS: {
        semantic: 0.40,    // Embedding cosine similarity (primary)
        topic: 0.20,       // Topic phrase overlap (supporting)
        concept: 0.15,     // Keyword/concept overlap (supporting)
        methodology: 0.10, // Methodology overlap (supporting)
        profile: 0.15      // Adviser profile compatibility (supporting)
      },
      SEMANTIC_BASELINE: 0.65,
      // Multi-paper aggregation weights
      PAPER_WEIGHTS: [0.70, 0.20, 0.10],  // Best, 2nd best, 3rd best
      MAX_MATCHED_PAPERS: 3,
      MIN_PAPER_RELEVANCE: 30,  // Minimum score to be considered "relevant"
    };
  }

  /** Lazy-init Gemini client so env vars are guaranteed to be loaded */
  get ai() {
    if (!this._ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[GeminiProvider] GEMINI_API_KEY is not set. Matching will fail.');
        return null;
      }
      this._ai = new GoogleGenAI({ apiKey });
    }
    return this._ai;
  }

  get apiKey() {
    return process.env.GEMINI_API_KEY;
  }

  async isHealthy() {
    if (!this.apiKey) {
      return { healthy: false, error: 'GEMINI_API_KEY is missing in backend configuration' };
    }
    return { healthy: true, version: this.version };
  }

  async _getEmbedding(text) {
    if (!text || text.trim() === '') return new Array(3072).fill(0); // Dummy empty embedding
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
    const researchText = `${title}\n\n${description || ''}`.trim();
    
    console.log(`[GeminiProvider] Analyzing student proposal: "${title.substring(0, 40)}..."`);

    // 1. Analyze student proposal with same schema
    const prompt = `
Analyze the following student research proposal and extract structured metadata.
Focus on identifying the research concepts, methodologies, and specific domain keywords.
Do NOT extract generic academic terms.

STUDENT PROPOSAL:
---
${researchText.substring(0, 5000)}
---
`;

    const responseSchema = {
      type: "OBJECT",
      properties: {
        abstract: { type: "STRING" },
        keywords: { type: "ARRAY", items: { type: "STRING" } },
        keyPhrases: { type: "ARRAY", items: { type: "STRING" } },
        researchTopics: { type: "ARRAY", items: { type: "STRING" } },
        researchConcepts: { type: "ARRAY", items: { type: "STRING" } },
        methodologies: { type: "ARRAY", items: { type: "STRING" } },
        researchDomain: { type: "STRING" },
        researchProblem: { type: "STRING" }
      },
      required: ["abstract", "keywords", "researchTopics", "researchConcepts", "methodologies", "researchDomain", "researchProblem"]
    };

    let studentData = {
      abstract: '', keywords: [], keyPhrases: [], researchTopics: [],
      researchConcepts: [], methodologies: [], researchDomain: '', researchProblem: ''
    };

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });
      studentData = JSON.parse(response.text);
    } catch (err) {
      console.warn('[GeminiProvider] Failed to parse student proposal with Gemini:', err.message);
      // Fallback: just use raw text for simple overlap if Gemini structured output fails
    }

    const studentRepresentation = [
      title,
      studentData.abstract || description || '',
      ...(studentData.researchTopics || []),
      ...(studentData.keywords || []),
      ...(studentData.keyPhrases || []),
      ...(studentData.researchConcepts || []),
      ...(studentData.methodologies || []),
      studentData.researchDomain || '',
      studentData.researchProblem || ''
    ].join(' ');

    console.log(`[GeminiProvider] Generating semantic embedding for student proposal.`);
    const studentEmbedding = await this._getEmbedding(studentRepresentation);
    
    // 2. Fetch all READY research documents for the eligible advisers
    const eligibleAdviserIds = advisers.map(a => a.adviserId);
    const researchDocs = await AdviserResearchDocument.find({
      adviserId: { $in: eligibleAdviserIds },
      processingStatus: 'READY'
    }).lean();

    console.log(`[GeminiProvider] Found ${researchDocs.length} processed research documents for eligible advisers.`);

    const adviserDocScores = new Map();
    const studentAllTerms = [
      ...(studentData.keywords || []),
      ...(studentData.researchTopics || []),
      ...(studentData.researchConcepts || []),
      ...(studentData.methodologies || [])
    ];
    // Fallback string if parse failed
    const fallbackTerms = studentAllTerms.length > 0 ? studentAllTerms.join(' ') : researchText;

    // 3. Score each document
    for (const doc of researchDocs) {
      if (!doc.embedding || doc.embedding.length === 0) continue;

      // a. Semantic Score (40%)
      const cosineSim = cosineSimilarity(studentEmbedding, doc.embedding);
      const BASELINE = this.MATCHING_CONFIG.SEMANTIC_BASELINE;
      let rawSemanticScore = 0;
      if (cosineSim > BASELINE) {
        rawSemanticScore = ((cosineSim - BASELINE) / (1.0 - BASELINE)) * 100;
      }

      // b. Topic Similarity (20%)
      const topicScore = calculateOverlapScore(
        studentData.researchTopics?.join(' ') || fallbackTerms, 
        doc.researchTopics || doc.keywords || []
      );

      // c. Keyword/Concept Similarity (15%)
      const conceptScore = calculateOverlapScore(
        [...(studentData.keywords || []), ...(studentData.researchConcepts || [])].join(' ') || fallbackTerms, 
        [...(doc.keywords || []), ...(doc.researchConcepts || [])]
      );

      // d. Methodology Similarity (10%)
      const methodScore = calculateOverlapScore(
        studentData.methodologies?.join(' ') || fallbackTerms, 
        doc.methodologies || doc.methodologyTerms || []
      );
      
      const docBaseScore = 
        (rawSemanticScore * this.MATCHING_CONFIG.WEIGHTS.semantic) +
        (topicScore * this.MATCHING_CONFIG.WEIGHTS.topic) +
        (conceptScore * this.MATCHING_CONFIG.WEIGHTS.concept) +
        (methodScore * this.MATCHING_CONFIG.WEIGHTS.methodology);

      // Out of 85 points so far. Remaining 15 points come from adviser profile.

      const scoreEntry = {
        docBaseScore, // Max 85
        rawSemanticScore,
        topicScore,
        conceptScore,
        methodScore,
        documentId: doc.id,
        documentTitle: doc.originalFilename || doc.title,
        matchedKeywords: (doc.researchConcepts || doc.keywords || []).slice(0, 4)
      };

      if (!adviserDocScores.has(doc.adviserId)) {
        adviserDocScores.set(doc.adviserId, []);
      }
      adviserDocScores.get(doc.adviserId).push(scoreEntry);
    }

    // 4. Aggregate by adviser
    const results = [];
    
    for (const adv of advisers) {
      let docScores = adviserDocScores.get(adv.adviserId) || [];
      
      // Calculate Profile Field Compatibility (15%)
      const advProfileTerms = [
        ...(adv.specialization || []),
        ...(adv.expertise || []),
        ...(adv.researchInterests || [])
      ];
      const profileScore = calculateOverlapScore(fallbackTerms, advProfileTerms);
      const profilePoints = profileScore * this.MATCHING_CONFIG.WEIGHTS.profile; // Max 15

      // Filter out irrelevant papers
      docScores = docScores.filter(d => d.docBaseScore > this.MATCHING_CONFIG.MIN_PAPER_RELEVANCE);
      docScores.sort((a, b) => b.docBaseScore - a.docBaseScore);

      if (docScores.length === 0) {
        // Fallback: If no relevant documents, give a low score based on profile only
        if (profileScore > 30) {
           results.push({
             adviserId: adv.adviserId,
             score: Math.round(profilePoints), // Max 15
             textSimilarity: 0,
             topicMatch: 0,
             conceptMatch: 0,
             methodologyMatch: 0,
             profileMatch: Math.round(profileScore),
             matchedKeywords: (adv.specialization || []).slice(0, 4),
             matchedPaperTitle: null,
             matchedResearch: [],
             explanation: 'Moderate compatibility based solely on general profile specialization (no relevant research documents uploaded).',
             algorithmVersion: this.version
           });
        }
        continue;
      }

      // Multi-paper aggregation (70/20/10)
      let aggregatedDocBaseScore = 0;
      let weightSum = 0;
      const matchedResearch = [];

      for (let i = 0; i < Math.min(docScores.length, this.MATCHING_CONFIG.MAX_MATCHED_PAPERS); i++) {
        const doc = docScores[i];
        const weight = this.MATCHING_CONFIG.PAPER_WEIGHTS[i];
        aggregatedDocBaseScore += doc.docBaseScore * weight;
        weightSum += weight;

        // Convert docBaseScore out of 85 back to a rough 100-scale similarity for display
        const displaySimilarity = Math.round((doc.docBaseScore / 85) * 100);
        matchedResearch.push({
          documentId: doc.documentId,
          title: doc.documentTitle,
          similarity: displaySimilarity,
          relevance: displaySimilarity > 80 ? 'strong' : displaySimilarity > 60 ? 'moderate' : 'partial'
        });
      }
      
      // Normalize if they had fewer than 3 relevant papers
      aggregatedDocBaseScore = aggregatedDocBaseScore / weightSum;

      const bestDoc = docScores[0];
      const finalScore = aggregatedDocBaseScore + profilePoints; // Max 100

      // Explanation generation using paper citations
      let explanation = 'Moderate compatibility based on general research domain.';
      if (finalScore > 85) {
        explanation = `Exceptional match: Adviser's paper '${bestDoc.documentTitle}' shows strong research similarity.`;
      } else if (finalScore > 70) {
        explanation = `Strong match: Adviser's research concepts in '${bestDoc.documentTitle}' align well with your proposal.`;
      } else if (finalScore > 50) {
        explanation = `Good compatibility: Overlapping topics found in '${bestDoc.documentTitle}'.`;
      }
      
      if (bestDoc.matchedKeywords && bestDoc.matchedKeywords.length > 0) {
          explanation += ` Shared topics: ${bestDoc.matchedKeywords.slice(0, 2).join(', ')}.`;
      }

      results.push({
        adviserId: adv.adviserId,
        score: Math.round(finalScore),
        textSimilarity: Math.round(bestDoc.rawSemanticScore),
        topicMatch: Math.round(bestDoc.topicScore),
        conceptMatch: Math.round(bestDoc.conceptScore),
        methodologyMatch: Math.round(bestDoc.methodScore),
        profileMatch: Math.round(profileScore),
        matchedKeywords: bestDoc.matchedKeywords,
        matchedPaperTitle: bestDoc.documentTitle,
        matchedResearch,
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
