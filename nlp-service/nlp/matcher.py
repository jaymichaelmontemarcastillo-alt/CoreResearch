"""
Core Adviser Matching Engine for CoreResearch.

Implements:
- TF-IDF vectorization
- Cosine similarity computation
- Specialization matching (keyword overlap)
- Expertise matching (keyword overlap)
- Research interest matching (keyword overlap)
- Weighted final score calculation
- Match explanation generation
- Adviser ranking

Scoring weights:
    Text Similarity:       50%
    Specialization Match:  25%
    Expertise Match:       15%
    Research Interest:     10%
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field, asdict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .preprocessor import preprocess_text, combine_adviser_text, extract_key_terms

logger = logging.getLogger(__name__)

# ── Scoring Weights ──────────────────────────────────────────────────────────

WEIGHT_TEXT_SIMILARITY = 0.50
WEIGHT_SPECIALIZATION = 0.25
WEIGHT_EXPERTISE = 0.15
WEIGHT_RESEARCH_INTEREST = 0.10

ALGORITHM_VERSION = 'v1.0'


# ── Data Structures ──────────────────────────────────────────────────────────

@dataclass
class AdviserMatchResult:
    """Individual adviser matching result."""
    adviserId: str
    score: float = 0.0
    textSimilarity: float = 0.0
    specializationMatch: float = 0.0
    expertiseMatch: float = 0.0
    researchInterestMatch: float = 0.0
    matchedKeywords: list[str] = field(default_factory=list)
    explanation: str = ''
    algorithmVersion: str = ALGORITHM_VERSION

    def to_dict(self) -> dict:
        return asdict(self)


# ── Matching Functions ───────────────────────────────────────────────────────

def _keyword_overlap_score(research_terms: set[str], adviser_terms: list | str) -> float:
    """
    Calculate keyword overlap score between research terms and adviser field terms.

    Returns a score from 0.0 to 100.0.
    """
    if not research_terms or not adviser_terms:
        return 0.0

    # Normalize adviser terms
    if isinstance(adviser_terms, str):
        adviser_terms = [adviser_terms]

    adviser_normalized = set()
    for term in adviser_terms:
        if term is None or not isinstance(term, str):
            continue
        # Split multi-word items and normalize
        for word in term.lower().split():
            cleaned = ''.join(c for c in word if c.isalpha())
            if cleaned and len(cleaned) > 1:
                adviser_normalized.add(cleaned)

    if not adviser_normalized:
        return 0.0

    # Compute overlap
    overlap = research_terms & adviser_normalized
    if not overlap:
        # Try partial matching (substring containment)
        partial_matches = 0
        for r_term in research_terms:
            for a_term in adviser_normalized:
                if r_term in a_term or a_term in r_term:
                    partial_matches += 1
                    break
        if partial_matches > 0:
            return min((partial_matches / max(len(research_terms), 1)) * 100.0, 100.0)
        return 0.0

    # Score based on proportion of research terms matched
    score = (len(overlap) / max(len(research_terms), 1)) * 100.0
    return min(score, 100.0)


def _compute_text_similarity(research_text: str, adviser_texts: list[str]) -> list[float]:
    """
    Compute TF-IDF cosine similarity between research text and each adviser's combined text.

    Returns list of similarity scores (0.0 to 100.0), one per adviser.
    """
    if not research_text.strip():
        return [0.0] * len(adviser_texts)

    # All documents: research text first, then each adviser's text
    all_docs = [research_text] + adviser_texts

    # Filter out empty documents
    non_empty_indices = [i for i, doc in enumerate(all_docs) if doc.strip()]
    if len(non_empty_indices) <= 1:
        return [0.0] * len(adviser_texts)

    try:
        vectorizer = TfidfVectorizer(
            max_features=500,
            ngram_range=(1, 2),  # Unigrams + bigrams for better phrase matching
            min_df=1,
            max_df=0.95,
            sublinear_tf=True,
            stop_words='english',
        )
        tfidf_matrix = vectorizer.fit_transform(all_docs)

        # Cosine similarity between research (index 0) and each adviser (indices 1..N)
        research_vec = tfidf_matrix[0:1]
        adviser_vecs = tfidf_matrix[1:]

        similarities = cosine_similarity(research_vec, adviser_vecs)[0]

        # Convert to 0-100 scale
        return [round(max(sim * 100.0, 0.0), 2) for sim in similarities]

    except Exception as e:
        logger.warning(f'TF-IDF computation warning: {e}')
        return [0.0] * len(adviser_texts)


def _find_matched_keywords(research_terms: set[str], adviser: dict) -> list[str]:
    """
    Find keywords that match between the research and the adviser's profile.

    Returns human-readable matched keyword phrases.
    """
    matched = []

    # Check against all adviser text fields
    all_adviser_terms = set()
    for field_name in ('specialization', 'expertise', 'researchInterests', 'keywords'):
        field_val = adviser.get(field_name, [])
        if isinstance(field_val, list):
            for item in field_val:
                item_lower = item.lower()
                all_adviser_terms.update(item_lower.split())
                # Also keep the full phrase for display
                for r_term in research_terms:
                    if r_term in item_lower or any(r_term in w for w in item_lower.split()):
                        if item not in matched:
                            matched.append(item)

    # If no phrase-level matches, find word-level overlaps
    if not matched:
        overlap = research_terms & all_adviser_terms
        matched = list(overlap)[:8]

    return matched[:10]  # Cap at 10 keywords


def _generate_explanation(result: AdviserMatchResult, adviser: dict) -> str:
    """
    Generate a human-readable explanation for why this adviser was matched.
    """
    parts = []

    if result.score >= 90:
        parts.append('Exceptional compatibility')
    elif result.score >= 80:
        parts.append('Strong compatibility')
    elif result.score >= 70:
        parts.append('Good compatibility')
    elif result.score >= 60:
        parts.append('Moderate compatibility')
    else:
        parts.append('Partial compatibility')

    reasons = []
    if result.specializationMatch >= 70:
        spec = adviser.get('specialization', [])
        if spec:
            spec_str = spec[0] if isinstance(spec, list) else spec
            reasons.append(f'strong specialization match in {spec_str}')
    elif result.specializationMatch >= 40:
        reasons.append('related specialization area')

    if result.expertiseMatch >= 70:
        reasons.append('high expertise overlap')
    elif result.expertiseMatch >= 40:
        reasons.append('relevant expertise')

    if result.researchInterestMatch >= 70:
        reasons.append('aligned research interests')
    elif result.researchInterestMatch >= 40:
        reasons.append('overlapping research interests')

    if result.textSimilarity >= 70:
        reasons.append('high textual similarity with research focus')

    if result.matchedKeywords:
        kw_str = ', '.join(result.matchedKeywords[:3])
        reasons.append(f'keyword matches: {kw_str}')

    if reasons:
        parts.append('with ' + '; '.join(reasons))
    else:
        parts.append('based on general research domain alignment')

    return '. '.join(parts) + '.'


# ── Main Matching Function ───────────────────────────────────────────────────

def match_advisers(
    title: str,
    description: str,
    advisers: list[dict],
) -> list[dict]:
    """
    Match a research title/description against a list of adviser profiles.

    Args:
        title: Research title text.
        description: Research description/focus text.
        advisers: List of adviser profile dicts, each containing:
            - adviserId (str)
            - specialization (list[str], optional)
            - expertise (list[str], optional)
            - researchInterests (list[str], optional)
            - keywords (list[str], optional)

    Returns:
        List of match result dicts, sorted by score descending.
    """
    if not advisers:
        return []

    # ── Step 1: Preprocess research text ─────────────────────────────────
    research_raw = f'{title}. {description}'.strip()
    research_processed = preprocess_text(research_raw)
    research_terms = set(research_processed.split())

    logger.info(
        f'[AdviserMatching] Processing: "{title[:60]}..." '
        f'| Advisers: {len(advisers)} | Terms: {len(research_terms)}'
    )

    # ── Step 2: Prepare adviser texts ────────────────────────────────────
    adviser_texts = []
    for adv in advisers:
        combined = combine_adviser_text(adv)
        processed = preprocess_text(combined)
        adviser_texts.append(processed)

    # ── Step 3: TF-IDF + Cosine Similarity ───────────────────────────────
    text_similarities = _compute_text_similarity(research_processed, adviser_texts)

    # ── Step 4: Compute per-adviser scores ───────────────────────────────
    results: list[AdviserMatchResult] = []

    for i, adv in enumerate(advisers):
        text_sim = text_similarities[i]

        # Specialization match
        spec_score = _keyword_overlap_score(
            research_terms,
            adv.get('specialization', [])
        )

        # Expertise match
        expertise_score = _keyword_overlap_score(
            research_terms,
            adv.get('expertise', [])
        )

        # Research interest match
        interest_score = _keyword_overlap_score(
            research_terms,
            adv.get('researchInterests', [])
        )

        # Weighted final score
        final_score = (
            text_sim * WEIGHT_TEXT_SIMILARITY
            + spec_score * WEIGHT_SPECIALIZATION
            + expertise_score * WEIGHT_EXPERTISE
            + interest_score * WEIGHT_RESEARCH_INTEREST
        )

        # Normalize to 0-100
        final_score = round(min(max(final_score, 0.0), 100.0), 1)

        # Find matched keywords
        matched_kw = _find_matched_keywords(research_terms, adv)

        adviser_id = adv.get('adviserId', '')
        if not adviser_id:
            logger.warning(f'[AdviserMatching] Skipping adviser at index {i} — missing adviserId')
            continue

        result = AdviserMatchResult(
            adviserId=adviser_id,
            score=final_score,
            textSimilarity=round(text_sim, 1),
            specializationMatch=round(spec_score, 1),
            expertiseMatch=round(expertise_score, 1),
            researchInterestMatch=round(interest_score, 1),
            matchedKeywords=matched_kw,
        )

        # Generate explanation
        result.explanation = _generate_explanation(result, adv)

        results.append(result)

    # ── Step 5: Sort by score descending (tie-break by adviserId for determinism)
    results.sort(key=lambda r: (-r.score, r.adviserId))

    logger.info(
        f'[AdviserMatching] Completed. '
        f'Top score: {results[0].score if results else 0} | '
        f'Algorithm: {ALGORITHM_VERSION}'
    )

    return [r.to_dict() for r in results]
