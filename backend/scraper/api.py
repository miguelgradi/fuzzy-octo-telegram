"""
API for scraping and analyzing Mercado Libre product reviews.

Endpoints:
- POST /scrape   : scrape raw reviews (date, rating, content, useful_count)
- POST /analyze  : scrape + NLP analysis (sentiment, keywords, pros/cons, aspect sentiment)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict

from .scrape_reviews import scrape_reviews
from .analysis      import analyze_reviews

app = FastAPI(
    title="Meli Review Scraper API",
    version="0.1.0",
    description="Scrape Mercado Libre product reviews and perform NLP analysis"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapeRequest(BaseModel):
    url: str

class ReviewModel(BaseModel):
    date: str
    rating: int
    content: str
    useful_count: int

@app.post("/scrape", response_model=List[ReviewModel])
async def scrape_endpoint(request: ScrapeRequest) -> List[ReviewModel]:
    """
    Scrape raw reviews from a Mercado Libre product page.
    """
    try:
        reviews = await scrape_reviews(request.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping error: {e}")
    return [ReviewModel(**r.__dict__) for r in reviews]

@app.post("/analyze", response_model=Dict)
async def analyze_endpoint(request: ScrapeRequest) -> Dict:
    """
    Scrape + analyze:
      - sentiment per review
      - top keywords
      - pros & cons summary
      - aspect-based sentiment breakdown
    """
    try:
        raw = await scrape_reviews(request.url)
        data = analyze_reviews(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {e}")
    return data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
