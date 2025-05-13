from analysis import analyze_reviews
from fastapi import FastAPI, HTTPException
from typing import Dict
from pydantic import BaseModel
from typing import List

from fastapi.middleware.cors import CORSMiddleware

from scrape_reviews import scrape_reviews

app = FastAPI(
    title="Meli Review Scrapper",
    version="0.1.0",
    description="API to scrape Mercado Libre product reviews and analize them"
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
async def scrape_endpoint(request: ScrapeRequest):
    """
    POST /scrape
    Body: { "url": "https://articulo.mercadolibre.com.co/MLC-XXXXXXX" }
    Returns: list of reviews with date, rating, content, useful_count.
    """
    try:
        reviews = await scrape_reviews(request.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return [ReviewModel(**r.__dict__) for r in reviews]


@app.post("/analyze", response_model=Dict)
async def analyze_endpoint(request: ScrapeRequest):
    """
    Scrape & analyze:
    - Sentiment per review
    - Top keywords
    - Pros & Cons summary
    - Aspect-based sentiment breakdown
    """
    try:
        raw = await scrape_reviews(request.url)
        result = analyze_reviews(raw)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
