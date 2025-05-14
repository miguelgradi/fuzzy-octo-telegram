"""
Module to scrape Mercado Libre product reviews,
including clicking "Mostrar todas las opiniones" to load the popup.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import List, Set, Tuple

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

REVIEW_SELECTOR = 'article[data-testid="comment-component"]'
SEE_MORE_BUTTON = 'button[data-testid="see-more"]'
POPUP_CONTAINER = 'div.ui-review-capability__mobile__comments'

DATE_SELECTOR = 'span.ui-review-capability-comments__comment__date'
CONTENT_SELECTOR = 'p[data-testid="comment-content-component"]'
FULL_STAR_SELECTOR = (
    'svg.ui-review-capability-comments__comment__rating__star'
    ':not(.ui-review-capability-comments__comment__rating__star-empty)'
)
USEFUL_BUTTON_TEXT_SELECTOR = (
    'button[data-testid="like-button"] '
    '.ui-review-capability-valorizations__button-like__text'
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Review:
    """
    Representation of a product review with its relevant attributes.
    
    Attributes:
        date: When the review was posted
        rating: Star rating (1-5)
        content: Text content of the review
        useful_count: Number of users who found this review helpful
    """
    date: str
    rating: int
    content: str
    useful_count: int

async def fetch_page_content(url: str, timeout: int = 60000) -> str:
    """
    Renders the product page and extracts HTML after loading reviews.
    
    Args:
        url: Mercado Libre product URL to scrape
        timeout: Maximum time in ms to wait for page load
        
    Returns:
        Full HTML content of the page after dynamic content is loaded
        
    Notes:
        - Uses Playwright to handle JavaScript rendering
        - Attempts to click the "see more reviews" button if available
        - Waits for review popup to fully load before extraction
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            logger.info("Navigating to %s", url)
            await page.goto(url, timeout=timeout)

            try:
                await page.click(SEE_MORE_BUTTON, timeout=5000)
                await page.wait_for_selector(POPUP_CONTAINER, timeout=5000)
            except PlaywrightTimeout:
                logger.info("More reviews button not found or timed out")

            await page.wait_for_timeout(1000)
            return await page.content()

        finally:
            await browser.close()


def parse_reviews(html: str) -> List[Review]:
    """
    Extracts review data from the rendered HTML content.
    
    Args:
        html: Full HTML content of the page with reviews
        
    Returns:
        List of unique Review objects extracted from the page
        
    Notes:
        - Uses BeautifulSoup for HTML parsing
        - Deduplicates reviews based on date and content
        - Handles missing elements gracefully
    """
    soup = BeautifulSoup(html, 'html.parser')
    review_elements = soup.select(REVIEW_SELECTOR)

    seen: Set[Tuple[str, str]] = set()
    reviews: List[Review] = []

    for element in review_elements:
        date = element.select_one(DATE_SELECTOR).get_text(strip=True) if element.select_one(DATE_SELECTOR) else ""
        content = element.select_one(CONTENT_SELECTOR).get_text(strip=True) if element.select_one(CONTENT_SELECTOR) else ""
        stars = element.select(FULL_STAR_SELECTOR)
        rating = len(stars)
        
        useful_text = element.select_one(USEFUL_BUTTON_TEXT_SELECTOR).get_text(strip=True) if element.select_one(USEFUL_BUTTON_TEXT_SELECTOR) else "0"
        useful_count = int(useful_text) if useful_text.isdigit() else 0

        review_key = (date, content)
        if review_key in seen:
            continue
        seen.add(review_key)

        reviews.append(Review(date=date, rating=rating, content=content, useful_count=useful_count))

    logger.info("Parsed %d unique reviews", len(reviews))
    return reviews


async def scrape_reviews(url: str) -> List[Review]:
    """
    Main entry point for the scraping process.
    
    Args:
        url: Mercado Libre product URL to scrape
        
    Returns:
        List of unique reviews from the product page
        
    Notes:
        - Orchestrates the full scraping pipeline
        - Handles the asynchronous workflow
    """
    logger.info("Starting scrape for %s", url)
    html = await fetch_page_content(url)
    return parse_reviews(html)