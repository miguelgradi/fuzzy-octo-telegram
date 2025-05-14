"""
Module to analyze scraped Mercado Libre reviews:
- Sentiment analysis via Hugging Face
- Keyword extraction via YAKE
- Pros & cons summarization
- Aspect-based sentiment (Envío, Calidad, Empaque)
"""

import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"

from typing import List, Dict
from transformers import pipeline
import yake

from .scrape_reviews import Review

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
    "Envío":   ["envío", "shipping", "ship"],
    "Calidad": ["calidad", "quality"],
    "Empaque": ["empaque", "packaging", "pack"]
}

def get_label_category(label: str) -> str:
    """
    Convert "1 star"..."5 stars" into Negative/Neutral/Positive.
    """
    stars = int(label.split()[0])
    if stars <= 2:
        return "Negative"
    if stars == 3:
        return "Neutral"
    return "Positive"

def analyze_sentiment(text: str) -> Dict[str, str]:
    """
    Returns the HF label, score and our mapped category.
    """
    res = sentiment_analyzer(text, truncation=True)[0]
    label = res["label"]
    score = res["score"]
    category = get_label_category(label)
    return {
        "sentiment_label":    label,
        "sentiment_score":    score,
        "sentiment_category": category
    }

def extract_keywords(texts: List[str]) -> List[str]:
    joined = " ".join(texts)
    kws = kw_extractor.extract_keywords(joined)
    return [kw for kw, _ in kws]

def summarize_texts(texts: List[str], max_len=60, min_len=20) -> str:
    if not texts:
        return ""
    joined = " ".join(texts)
    chunk = joined if len(joined) < 1000 else joined[:1000]
    return summarizer(
        chunk,
        max_length=max_len,
        min_length=min_len,
        do_sample=False
    )[0]["summary_text"]

def aspect_sentiment(detailed_reviews: List[Dict]) -> Dict[str, Dict[str, int]]:
    """
    Count Positive/Neutral/Negative mentions per aspect.
    """
    result: Dict[str, Dict[str, int]] = {}
    for aspect, keys in ASPECT_KEYWORDS.items():
        hits = [r for r in detailed_reviews if any(k in r["content"].lower() for k in keys)]
        pos = sum(1 for r in hits if r["sentiment_category"] == "Positive")
        neu = sum(1 for r in hits if r["sentiment_category"] == "Neutral")
        neg = sum(1 for r in hits if r["sentiment_category"] == "Negative")
        result[aspect] = {"positive": pos, "neutral": neu, "negative": neg, "total": len(hits)}
    return result

def analyze_reviews(reviews: List[Review]) -> Dict:
    """
    Given a list of Review objects, returns:
    - detailed list with sentiment per review
    - top_keywords
    - pros_summary, cons_summary
    - aspect_sentiment breakdown
    """
    detailed = []
    for r in reviews:
        sent = analyze_sentiment(r.content)
        detailed.append({
            "date":           r.date,
            "rating":         r.rating,
            "content":        r.content,
            "useful_count":   r.useful_count,
            **sent
        })

    texts = [r["content"] for r in detailed]
    keywords    = extract_keywords(texts)
    positives   = [r["content"] for r in detailed if r["sentiment_category"] == "Positive"]
    negatives   = [r["content"] for r in detailed if r["sentiment_category"] == "Negative"]
    pros_summary = summarize_texts(positives)
    cons_summary = summarize_texts(negatives)
    aspects     = aspect_sentiment(detailed)

    return {
        "total_reviews":     len(reviews),
        "reviews":           detailed,
        "top_keywords":      keywords,
        "pros_summary":      pros_summary,
        "cons_summary":      cons_summary,
        "aspect_sentiment":  aspects
    }
