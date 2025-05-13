# backend/scraper/analysis.py

"""
Module to analyze scraped Mercado Libre reviews:
- Sentiment analysis via Hugging Face
- Keyword extraction via YAKE
"""

from typing import List, Dict
from transformers import pipeline
import yake

from scrape_reviews import Review

sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="nlptown/bert-base-multilingual-uncased-sentiment"
)

def analyze_sentiment(text: str) -> Dict[str, float]:
    res = sentiment_analyzer(text, truncation=True)[0]
    return {"sentiment_label": res["label"], "sentiment_score": res["score"]}

kw_extractor = yake.KeywordExtractor(
    lan="es",
    n=2,         
    top=10,  
    features=None
)

def extract_keywords(texts: List[str]) -> List[str]:
    """
    Extract top keywords across all review texts using YAKE.
    """
    joined = " ".join(texts)
    keywords_scores = kw_extractor.extract_keywords(joined)
    return [kw for kw, score in keywords_scores]

def analyze_reviews(reviews: List[Review]) -> Dict:
    texts = [r.content for r in reviews]
    keywords = extract_keywords(texts)
    detailed = []
    for r in reviews:
        sent = analyze_sentiment(r.content)
        detailed.append({
            "date": r.date,
            "rating": r.rating,
            "content": r.content,
            "useful_count": r.useful_count,
            **sent
        })
    return {"reviews": detailed, "top_keywords": keywords}
