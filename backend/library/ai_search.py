"""
AI-powered natural language book search using TF-IDF + cosine similarity.

Builds a corpus from all book metadata (title, author, category,
description, edition, isbn) and ranks results against a free-text query.
No API keys or heavy models required — runs entirely in-process.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


# =========================================================
# HELPERS
# =========================================================

def _safe(value):
    """Return a clean string, never None."""
    return str(value).strip() if value else ""


def build_book_corpus(books):
    """
    Build a list of text documents — one per book — that concatenates
    all searchable metadata with field-level boosting (title repeated 3x,
    author 2x, category 2x so they weigh more).
    """
    docs = []

    for book in books:
        title       = _safe(book.title)
        author      = _safe(book.author.name if book.author else "")
        category    = _safe(book.category.name if book.category else "")
        description = _safe(book.description)
        edition     = _safe(book.edition)
        edition_yr  = _safe(book.edition_year)
        isbn        = _safe(book.isbn)

        # Boost important fields by repetition
        doc = " ".join([
            title, title, title,        # 3x weight
            author, author,             # 2x weight
            category, category,         # 2x weight
            description,
            edition,
            edition_yr,
            isbn,
        ])

        docs.append(doc)

    return docs


def ai_search_books(query, books, top_n=20, min_score=0.05):
    """
    Rank `books` by semantic relevance to `query`.

    Returns a list of (book, score) tuples sorted by score descending,
    filtered to results above `min_score`.
    """
    if not books:
        return []

    corpus = build_book_corpus(books)

    # Include the query as the last document so the vectorizer
    # knows its vocabulary context.
    all_docs = corpus + [query]

    vectorizer = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 2),     # unigrams + bigrams
        min_df=1,
        stop_words="english",
        sublinear_tf=True,
    )

    try:
        tfidf_matrix = vectorizer.fit_transform(all_docs)
    except ValueError:
        # Edge case: empty vocabulary (all stop words, etc.)
        return []

    query_vec   = tfidf_matrix[-1]      # last row = query
    book_matrix = tfidf_matrix[:-1]     # everything else = books

    scores = cosine_similarity(query_vec, book_matrix).flatten()

    # Pair each book with its score, filter, sort
    ranked = [
        (book, float(score))
        for book, score in zip(books, scores)
        if float(score) >= min_score
    ]

    ranked.sort(key=lambda x: x[1], reverse=True)

    return ranked[:top_n]
