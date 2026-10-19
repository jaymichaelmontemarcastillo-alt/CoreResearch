import repositorySmartSearchService from '../services/repositorySmartSearchService.js';

/**
 * Repository Smart Search Controller
 * 
 * Handles semantic relevance ranking requests for the Repository search feature.
 * Strictly isolated from standard document-fetching routes.
 */
export const repositorySmartSearch = async (req, res) => {
  try {
    const query = req.body?.query || req.query?.query;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'A non-empty search query is required for Smart Search.'
      });
    }

    const { department, year, minScore } = req.body || {};

    const searchResult = await repositorySmartSearchService.rankPublications(query, {
      department,
      year,
      minScore: minScore ? Number(minScore) : 35
    });

    return res.status(200).json({
      success: true,
      query: searchResult.query,
      totalMatches: searchResult.totalMatches,
      data: searchResult.results
    });
  } catch (error) {
    console.error('[RepositorySmartSearchController] Error during smart search:', error.message);
    return res.status(503).json({
      success: false,
      error: 'SmartSearchUnavailable',
      message: 'The Smart Search semantic ranking service is temporarily unavailable.'
    });
  }
};
