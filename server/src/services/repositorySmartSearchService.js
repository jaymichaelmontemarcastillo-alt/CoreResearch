import { GoogleGenAI } from '@google/genai';
import { RepositoryPublication } from '../models/RepositoryPublication.js';

/**
 * Repository Smart Search Service
 * 
 * Provides semantic search and topic relevance ranking for repository research papers.
 * Reuses the existing Google Gemini API embedding integration (@google/genai)
 * with in-memory caching to rank documents by meaning and topic rather than
 * keyword matches alone.
 */

// In-memory cache for publication vector embeddings
const publicationEmbeddingCache = new Map();

// Helper to compute cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
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

// Concept expansion mapping for enhanced topic relevance
const TOPIC_EXPANSIONS = {
  'ai': ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'nlp', 'computer vision', 'yolo', 'cnn', 'autonomous', 'intelligent agent'],
  'artificial intelligence': ['ai', 'machine learning', 'deep learning', 'neural network', 'nlp', 'computer vision', 'yolo', 'cnn'],
  'machine learning': ['ml', 'deep learning', 'neural network', 'classification', 'prediction', 'clustering', 'random forest', 'xgboost', 'svm', 'model', 'yolo', 'regression', 'supervised learning'],
  'cybersecurity': ['information security', 'network security', 'vulnerability', 'privacy', 'intrusion', 'authentication', 'encryption', 'threat', 'exploit', 'firewall', 'safe'],
  'chatbot for student support': ['conversational agent', 'virtual assistant', 'student support', 'advising', 'interactive learning', 'feedback', 'academic guidance', 'tutoring', 'learning aid', 'student service', 'nlp', 'sentiment analysis', 'education']
};

class RepositorySmartSearchService {
  constructor() {
    this._ai = null;
  }

  get ai() {
    if (!this._ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[RepositorySmartSearchService] GEMINI_API_KEY is not configured.');
        return null;
      }
      this._ai = new GoogleGenAI({ apiKey });
    }
    return this._ai;
  }

  /**
   * Builds normalized text representation of a publication for embedding.
   */
  _buildPublicationText(doc) {
    const parts = [
      doc.title || '',
      Array.isArray(doc.keywords) ? doc.keywords.join(' ') : (doc.keywords || ''),
      doc.department || '',
      (doc.abstract || '').substring(0, 1000)
    ];
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Generates embedding vector for a given text snippet.
   */
  async _getEmbedding(text) {
    if (!this.ai) {
      throw new Error('Gemini API client is not configured.');
    }
    const cleanText = (text || '').trim();
    if (!cleanText) {
      return new Array(3072).fill(0);
    }
    const response = await this.ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: cleanText
    });
    if (!response?.embeddings?.[0]?.values) {
      throw new Error('Failed to generate embedding vector from Gemini.');
    }
    return response.embeddings[0].values;
  }

  /**
   * Calculate hybrid score combining embedding cosine similarity and concept overlap.
   */
  _calculateScore(cosineSim, query, doc) {
    // Normalizes Gemini cosine similarity (~0.40 baseline to ~0.85 max) into a 0-1 scale
    const normScore = Math.max(0, Math.min(1, (cosineSim - 0.40) / (0.85 - 0.40)));

    const qLower = query.toLowerCase().trim();
    const docText = `${doc.title || ''} ${(doc.keywords || []).join(' ')} ${doc.abstract || ''}`.toLowerCase();

    let conceptBoost = 0;
    for (const [key, synonyms] of Object.entries(TOPIC_EXPANSIONS)) {
      if (qLower.includes(key) || key.includes(qLower)) {
        for (const syn of synonyms) {
          if (docText.includes(syn)) {
            conceptBoost += 0.05;
          }
        }
      }
    }
    conceptBoost = Math.min(0.20, conceptBoost);

    const finalScore = Math.min(1.0, normScore * 0.85 + conceptBoost);
    return Math.round(finalScore * 100);
  }

  /**
   * Ranks repository publications according to semantic relevance against a query.
   * 
   * @param {string} query - The search query (e.g., "AI", "Chatbot for student support")
   * @param {Object} [options] - Optional filter and configuration options
   * @returns {Promise<{ success: boolean, query: string, results: Array<{ id: string, score: number, relevance: string }> }>}
   */
  async rankPublications(query, options = {}) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return { success: true, query: '', results: [] };
    }

    const trimmedQuery = query.trim();

    // 1. Fetch all approved/active repository publications from MongoDB
    const filter = {
      publicationStatus: { $nin: ['pending_publication', 'rejected'] }
    };
    if (options.department && options.department !== 'all') {
      filter.department = options.department;
    }
    if (options.year && options.year !== 'any') {
      filter.publicationYear = Number(options.year);
    }

    const publications = await RepositoryPublication.find(filter).lean();
    if (!publications || publications.length === 0) {
      return { success: true, query: trimmedQuery, results: [] };
    }

    // 2. Ensure embeddings are cached for all publications
    const uncachedDocs = publications.filter(p => !publicationEmbeddingCache.has(p.id));
    if (uncachedDocs.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < uncachedDocs.length; i += batchSize) {
        const batch = uncachedDocs.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (doc) => {
            try {
              const text = this._buildPublicationText(doc);
              const vec = await this._getEmbedding(text);
              publicationEmbeddingCache.set(doc.id, {
                vec,
                updatedAt: Date.now()
              });
            } catch (err) {
              console.warn(`[RepositorySmartSearchService] Embedding cache miss for ${doc.id}:`, err.message);
            }
          })
        );
      }
    }

    // 3. Generate embedding for user query
    const queryVector = await this._getEmbedding(trimmedQuery);

    // 4. Calculate semantic relevance scores
    const scoredResults = [];
    for (const doc of publications) {
      const cached = publicationEmbeddingCache.get(doc.id);
      if (!cached || !cached.vec) continue;

      const cosine = cosineSimilarity(queryVector, cached.vec);
      const score = this._calculateScore(cosine, trimmedQuery, doc);

      // Only include results that have meaningful relevance
      if (score >= (options.minScore || 35)) {
        let relevance = 'Related';
        if (score >= 70) relevance = 'High Relevance';
        else if (score >= 55) relevance = 'Moderate Relevance';

        scoredResults.push({
          id: doc.id,
          score,
          cosine: Number(cosine.toFixed(4)),
          relevance,
          matchType: 'semantic'
        });
      }
    }

    // 5. Sort by relevance score descending
    scoredResults.sort((a, b) => b.score - a.score);

    return {
      success: true,
      query: trimmedQuery,
      totalMatches: scoredResults.length,
      results: scoredResults
    };
  }

  /**
   * Invalidate cached embedding for a specific publication (e.g. after edit/delete).
   */
  invalidateCache(publicationId) {
    if (publicationId) {
      publicationEmbeddingCache.delete(publicationId);
    }
  }

  /**
   * Clear entire embedding cache.
   */
  clearCache() {
    publicationEmbeddingCache.clear();
  }
}

export const repositorySmartSearchService = new RepositorySmartSearchService();
export default repositorySmartSearchService;
