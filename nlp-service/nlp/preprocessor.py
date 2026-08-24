"""
Text Preprocessing Pipeline for CoreResearch NLP Adviser Matching.
"""

import re

# Additional academic stop words that don't contribute to matching
_academic_stop_words = {
    'system', 'development', 'based', 'using', 'study', 'research',
    'proposed', 'approach', 'application', 'method', 'analysis',
    'design', 'implementation', 'evaluation', 'model', 'framework',
    'paper', 'thesis', 'project', 'online', 'web', 'mobile', 'development', 'an', 'of'
}

def preprocess_text(text: str, remove_academic_stops: bool = False) -> str:
    """
    Full preprocessing pipeline for a text string.
    """
    if not text or not text.strip():
        return ''

    # 1. Lowercase
    text = text.lower()

    # 2. Remove punctuation, numbers, and special chars (keep letters and spaces)
    text = re.sub(r'[^a-z\s]', ' ', text)

    # 3. Tokenize
    tokens = text.split()

    # 4. Remove basic academic stop words if requested
    if remove_academic_stops:
        tokens = [t for t in tokens if t not in _academic_stop_words and len(t) > 1]
    else:
        tokens = [t for t in tokens if len(t) > 1]

    # 5. Rejoin
    return ' '.join(tokens)


def extract_key_terms(text: str, max_terms: int = 15) -> list[str]:
    """
    Extract unique key terms from preprocessed text.
    """
    processed = preprocess_text(text, remove_academic_stops=True)
    if not processed:
        return []

    seen = set()
    terms = []
    for token in processed.split():
        if token not in seen:
            seen.add(token)
            terms.append(token)
        if len(terms) >= max_terms:
            break
    return terms


def combine_adviser_text(adviser: dict) -> str:
    """
    Combine all text fields of an adviser profile into a single
    matchable text string.

    Handles None values, non-string items, and both list and string formats
    for each field. Specialization is weighted 2x (repeated) to boost its
    influence in TF-IDF similarity.
    """
    parts = []

    def _safe_join(items: list) -> str:
        """Join list items, filtering out None and non-string values."""
        return ' '.join(
            str(item).strip()
            for item in items
            if item is not None and str(item).strip()
        )

    # Specialization (weighted 2x for TF-IDF boost)
    spec = adviser.get('specialization', [])
    if isinstance(spec, list) and spec:
        text = _safe_join(spec)
        if text:
            parts.append(text)
            parts.append(text)  # 2x weight
    elif isinstance(spec, str) and spec.strip():
        parts.append(spec.strip())
        parts.append(spec.strip())  # 2x weight

    # Expertise
    expertise = adviser.get('expertise', [])
    if isinstance(expertise, list) and expertise:
        text = _safe_join(expertise)
        if text:
            parts.append(text)
    elif isinstance(expertise, str) and expertise.strip():
        parts.append(expertise.strip())

    # Research Interests
    interests = adviser.get('researchInterests', [])
    if isinstance(interests, list) and interests:
        text = _safe_join(interests)
        if text:
            parts.append(text)
    elif isinstance(interests, str) and interests.strip():
        parts.append(interests.strip())

    # Keywords
    keywords = adviser.get('keywords', [])
    if isinstance(keywords, list) and keywords:
        text = _safe_join(keywords)
        if text:
            parts.append(text)
    elif isinstance(keywords, str) and keywords.strip():
        parts.append(keywords.strip())

    return ' '.join(parts)

