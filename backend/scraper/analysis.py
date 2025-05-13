"""
Module to analyze scraped Mercado Libre reviews:
- Sentiment analysis via Hugging Face
- Keyword extraction via YAKE
- Pros & cons summarization
- Aspect-based sentiment (shipping, quality, packaging)
"""

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from typing import List, Dict
from transformers import pipeline
import yake

from scrape_reviews import Review

sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="nlptown/bert-base-multilingual-uncased-sentiment"
)

summarizer = pipeline(
    "summarization",
    model="facebook/bart-large-cnn"
)

kw_extractor = yake.KeywordExtractor(lan="es", n=2, top=10, features=None)

ASPECT_KEYWORDS = {
    "Shipping":  ["envío", "shipping", "ship"],
    "Quality":   ["calidad", "quality"],
    "Packaging": ["empaque", "packaging", "pack"]
}

def get_sentiment_category(score: float) -> str:
    if score >= 0.7:
        return "Positive"
    if score >= 0.4:
        return "Neutral"
    return "Negative"

def analyze_sentiment(text: str) -> Dict[str, float]:
    res = sentiment_analyzer(text, truncation=True)[0]
    return {"sentiment_label": res["label"], "sentiment_score": res["score"]}

def extract_keywords(texts: List[str]) -> List[str]:
    joined = " ".join(texts)
    kws = kw_extractor.extract_keywords(joined)
    return [kw for kw, _ in kws]

def summarize_texts(texts: List[str], max_len=60, min_len=20) -> str:
    if not texts:
        return ""
    joined = " ".join(texts)
    chunk = joined if len(joined) < 1000 else joined[:1000]
    return summarizer(chunk, max_length=max_len, min_length=min_len, do_sample=False)[0]["summary_text"]

def aspect_sentiment(detailed_reviews: List[Dict]) -> Dict[str, Dict[str, int]]:
    result: Dict[str, Dict[str, int]] = {}
    for aspect, keywords in ASPECT_KEYWORDS.items():
        hits = [
            r for r in detailed_reviews
            if any(k in r["content"].lower() for k in keywords)
        ]
        pos = sum(1 for r in hits if get_sentiment_category(r["sentiment_score"]) == "Positive")
        neu = sum(1 for r in hits if get_sentiment_category(r["sentiment_score"]) == "Neutral")
        neg = sum(1 for r in hits if get_sentiment_category(r["sentiment_score"]) == "Negative")
        result[aspect] = {
            "positive": pos,
            "neutral": neu,
            "negative": neg,
            "total": len(hits)
        }
    return result

def analyze_reviews(reviews: List[Review]) -> Dict:
    detailed: List[Dict] = []
    for r in reviews:
        sent = analyze_sentiment(r.content)
        detailed.append({
            "date":          r.date,
            "rating":        r.rating,
            "content":       r.content,
            "useful_count":  r.useful_count,
            **sent
        })

    texts = [r["content"] for r in detailed]
    keywords = extract_keywords(texts)

    positives = [r["content"] for r in detailed if get_sentiment_category(r["sentiment_score"]) == "Positive"]
    negatives = [r["content"] for r in detailed if get_sentiment_category(r["sentiment_score"]) == "Negative"]
    pros_summary = summarize_texts(positives)
    cons_summary = summarize_texts(negatives)

    aspects = aspect_sentiment(detailed)

    return {
        "reviews":          detailed,
        "top_keywords":     keywords,
        "pros_summary":     pros_summary,
        "cons_summary":     cons_summary,
        "aspect_sentiment": aspects
    }
