"""
Module to analyze scraped Mercado Libre reviews:
- Sentiment analysis
- Keyword extraction
"""

from typing import List, Dict
from transformers import pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from scrape_reviews import Review 

sentiment_analyzer = pipeline("sentiment-analysis", model="nlptown/bert-base-multilingual-uncased-sentiment")

def analyze_sentiment(text: str) -> Dict:
    """
    Analyze sentiment of a single review text.
    Returns a dict with label and score.
    """
    result = sentiment_analyzer(text)[0]
    return {"sentiment_label": result["label"], "sentiment_score": result["score"]}

def extract_keywords(texts: List[str], top_n: int = 10) -> List[str]:
    """
    Extract top_n keywords across all review texts using TF-IDF.
    """
    vectorizer = TfidfVectorizer(stop_words="spanish", ngram_range=(1,2))
    tfidf_matrix = vectorizer.fit_transform(texts)
    scores = tfidf_matrix.sum(axis=0).A1
    terms = vectorizer.get_feature_names_out()
    top_indices = scores.argsort()[::-1][:top_n]
    return [terms[i] for i in top_indices]

def analyze_reviews(reviews: List[Review]) -> List[Dict]:
    """
    Given a list of Review objects, returns a list of dicts including:
    date, rating, content, useful_count, sentiment_label, sentiment_score
    """
    texts = [r.content for r in reviews]
    keywords = extract_keywords(texts)
    analyzed = []
    for r in reviews:
        sentiment = analyze_sentiment(r.content)
        analyzed.append({
            "date": r.date,
            "rating": r.rating,
            "content": r.content,
            "useful_count": r.useful_count,
            **sentiment,
        })
    return {"reviews": analyzed, "top_keywords": keywords}
