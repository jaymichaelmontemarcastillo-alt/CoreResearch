"""
CoreResearch NLP Adviser Matching Service.

FastAPI application that exposes the NLP matching pipeline as a REST API.
This service is called exclusively by the Node.js backend — never by the frontend.

Endpoints:
    GET  /health            — Health check
    POST /match/advisers    — Match research title against adviser profiles
"""

import logging
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from nlp.matcher import match_advisers, ALGORITHM_VERSION

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger('nlp-service')

# ── FastAPI App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title='CoreResearch NLP Service',
    description='NLP-based adviser matching service for CoreResearch.',
    version=ALGORITHM_VERSION,
)

# CORS — restrict to Node.js backend origins only
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5000',
        'http://127.0.0.1:5000',
    ],
    allow_credentials=False,
    allow_methods=['GET', 'POST'],
    allow_headers=['Content-Type'],
)


# ── Request / Response Models ────────────────────────────────────────────────

class AdviserProfile(BaseModel):
    """Adviser profile data required for matching (subset of full profile)."""
    adviserId: str
    specialization: list[str] = Field(default_factory=list)
    expertise: list[str] = Field(default_factory=list)
    researchInterests: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)


class MatchRequest(BaseModel):
    """Incoming matching request from Node.js backend."""
    title: str = Field(..., min_length=3, description='Research title')
    description: str = Field(default='', description='Research description or focus')
    advisers: list[AdviserProfile] = Field(..., min_length=1, description='Adviser profiles to match against')


class MatchResultItem(BaseModel):
    """Individual adviser match result."""
    adviserId: str
    score: float
    textSimilarity: float
    specializationMatch: float
    expertiseMatch: float
    researchInterestMatch: float
    matchedKeywords: list[str]
    explanation: str
    algorithmVersion: str


class MatchResponse(BaseModel):
    """Response from the matching endpoint."""
    success: bool = True
    results: list[MatchResultItem]
    algorithmVersion: str = ALGORITHM_VERSION
    executionTimeMs: int = 0


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get('/health')
def health_check():
    """Health check endpoint."""
    return {
        'status': 'ok',
        'service': 'CoreResearch NLP Service',
        'version': ALGORITHM_VERSION,
    }


@app.post('/match/advisers', response_model=MatchResponse)
def match_advisers_endpoint(request: MatchRequest):
    """
    Match a research title/description against adviser profiles.

    Called by the Node.js backend. Returns ranked adviser matches
    with compatibility scores, matched keywords, and explanations.
    """
    start_time = time.time()

    title = request.title.strip()
    description = request.description.strip()

    if not title:
        raise HTTPException(status_code=400, detail='Research title is required.')

    # Convert Pydantic models to dicts for the matcher
    adviser_dicts = [adv.model_dump() for adv in request.advisers]

    logger.info(
        f'[/match/advisers] Received request: '
        f'title="{title[:60]}..." | '
        f'advisers={len(adviser_dicts)}'
    )

    try:
        results = match_advisers(title, description, adviser_dicts)
    except Exception as e:
        logger.error(f'[/match/advisers] Matching error: {e}', exc_info=True)
        raise HTTPException(
            status_code=500,
            detail='Internal NLP processing error. Please try again later.',
        )

    execution_ms = int((time.time() - start_time) * 1000)

    logger.info(
        f'[/match/advisers] Completed in {execution_ms}ms | '
        f'Results: {len(results)} | '
        f'Top score: {results[0]["score"] if results else 0}'
    )

    return MatchResponse(
        success=True,
        results=results,
        algorithmVersion=ALGORITHM_VERSION,
        executionTimeMs=execution_ms,
    )

# ── Startup Self-Test ────────────────────────────────────────────────────────

@app.on_event('startup')
def startup_self_test():
    """
    Verify the NLP engine works at boot time.
    This catches import errors, missing dependencies, or broken algorithms
    before the service starts accepting requests.
    """
    logger.info(f'[Startup] CoreResearch NLP Service v{ALGORITHM_VERSION}')
    try:
        test_results = match_advisers(
            'Test Research Title',
            'Test description',
            [{'adviserId': '_selftest', 'specialization': ['Testing'], 'expertise': [], 'researchInterests': [], 'keywords': []}]
        )
        if not test_results or not isinstance(test_results, list):
            raise RuntimeError('Self-test returned invalid results')
        logger.info(f'[Startup] NLP engine self-test passed (score: {test_results[0]["score"]})')
    except Exception as e:
        logger.error(f'[Startup] NLP engine self-test FAILED: {e}', exc_info=True)
        raise RuntimeError(f'NLP engine failed self-test: {e}') from e


# ── Development Server ──────────────────────────────────────────────────────

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=8000,
        reload=True,
        log_level='info',
    )
