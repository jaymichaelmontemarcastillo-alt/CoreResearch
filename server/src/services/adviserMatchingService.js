/**
 * Adviser Matching Service — CoreResearch Phase 6
 * 
 * Abstraction layer between the application and the matching provider.
 * The rest of the Research Workflow calls this service without knowing
 * whether matching is done via Mock, NLP, Semantic Embeddings, or AI.
 * 
 * Provider selection is controlled by the MATCHING_PROVIDER env var:
 *   - 'mock'  → MockAdviserMatchingProvider
 *   - 'nlp'   → NLPAdviserMatchingProvider (default)
 * 
 * Architecture:
 *   AdviserMatchingService
 *       ├── MockAdviserMatchingProvider   (dev/testing)
 *       └── NLPAdviserMatchingProvider    (production)
 */

import {
  MockAdviserMatchingProvider,
  NLPAdviserMatchingProvider,
  GeminiAdviserMatchingProvider,
} from './adviserMatchingProviders.js';

class AdviserMatchingService {
  constructor() {
    this.provider = null;
    this._initProvider();
  }

  /**
   * Initialize the matching provider based on MATCHING_PROVIDER env var.
   */
  _initProvider() {
    const providerType = (process.env.MATCHING_PROVIDER || 'nlp').toLowerCase().trim();

    switch (providerType) {
      case 'mock':
        this.provider = new MockAdviserMatchingProvider();
        console.log('[AdviserMatchingService] Initialized with MockAdviserMatchingProvider');
        break;

      case 'gemini':
        this.provider = new GeminiAdviserMatchingProvider();
        console.log('[AdviserMatchingService] Initialized with GeminiAdviserMatchingProvider');
        break;

      case 'nlp':
      default:
        this.provider = new NLPAdviserMatchingProvider({
          serviceUrl: process.env.NLP_SERVICE_URL,
          timeoutMs: parseInt(process.env.NLP_TIMEOUT_MS || '30000', 10),
        });
        console.log(
          `[AdviserMatchingService] Initialized with NLPAdviserMatchingProvider ` +
          `(URL: ${process.env.NLP_SERVICE_URL || 'http://localhost:8000'})`
        );
        break;
    }
  }

  /**
   * Get the current provider name.
   */
  getProviderName() {
    return this.provider?.name || 'unknown';
  }

  /**
   * Get the algorithm version.
   */
  getAlgorithmVersion() {
    return this.provider?.version || 'unknown';
  }

  /**
   * Check if the matching provider's external service is healthy.
   * For Mock provider, always returns healthy.
   * For NLP provider, calls the Python service's /health endpoint.
   */
  async checkHealth() {
    if (this.provider?.isHealthy) {
      return await this.provider.isHealthy();
    }
    // Mock provider has no external dependency
    return { healthy: true, version: this.getAlgorithmVersion(), provider: this.getProviderName() };
  }

  /**
   * Match a research title/description against a list of adviser profiles.
   * 
   * This is the ONLY method the Research Workflow should call.
   * 
   * @param {string} title          - Research title
   * @param {string} description    - Research description/focus
   * @param {Array}  advisers       - List of adviser profile objects
   * @returns {Promise<Array>}      - Ranked match results
   */
  async matchAdvisers(title, description, advisers) {
    if (!title || title.trim().length < 3) {
      throw new Error('Research title is required (minimum 3 characters).');
    }

    if (!advisers || advisers.length === 0) {
      return [];
    }

    const startTime = Date.now();

    console.log(
      `[AdviserMatchingService] Starting match | ` +
      `Provider: ${this.getProviderName()} | ` +
      `Title: "${title.substring(0, 60)}..." | ` +
      `Advisers: ${advisers.length}`
    );

    try {
      const results = await this.provider.matchAdvisers(title, description, advisers);

      const executionMs = Date.now() - startTime;
      console.log(
        `[AdviserMatchingService] Match complete | ` +
        `Provider: ${this.getProviderName()} | ` +
        `Results: ${results.length} | ` +
        `Top score: ${results[0]?.score || 0} | ` +
        `Execution: ${executionMs}ms | ` +
        `Algorithm: ${this.getAlgorithmVersion()}`
      );

      return results;
    } catch (error) {
      const executionMs = Date.now() - startTime;
      console.error(
        `[AdviserMatchingService] Match failed after ${executionMs}ms | ` +
        `Provider: ${this.getProviderName()} | ` +
        `Error: ${error.message}`
      );
      throw error;
    }
  }
}

// Singleton instance
const adviserMatchingService = new AdviserMatchingService();
export default adviserMatchingService;
