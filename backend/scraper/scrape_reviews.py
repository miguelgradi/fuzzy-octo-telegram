"""
Module to scrape product reviews from Mercado Libre pages.
"""

import asyncio
import logging
from dataclasses import dataclass
from typing import List

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

REVIEW_ARTICLE_SELECTOR = 'article[data-testid="comment-component"]'
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
    """Data class representing a product review."""
    date: str
    rating: int
    content: str
    useful_count: int


async def fetch_page_content(url: str, timeout: int = 60000) -> str:
    """
    Fetch the rendered HTML content of the given URL using Playwright.

    Args:
        url: The product page URL to navigate to.
        timeout: Maximum navigation time in milliseconds.

    Returns:
        The page's fully rendered HTML content.
    """
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, timeout=timeout)
            html = await page.content()
        finally:
            await browser.close()
    return html


def parse_reviews(html: str) -> List[Review]:
    """
    Parse review elements from HTML and convert them into Review objects.

    Args:
        html: The HTML content as a string.

    Returns:
        A list of Review instances.
    """
    soup = BeautifulSoup(html, 'html.parser')
    elements = soup.select(REVIEW_ARTICLE_SELECTOR)
    reviews: List[Review] = []

    for elem in elements:
        date_el = elem.select_one(DATE_SELECTOR)
        date_text = date_el.get_text(strip=True) if date_el else ''

        content_el = elem.select_one(CONTENT_SELECTOR)
        content_text = content_el.get_text(strip=True) if content_el else ''

        stars = elem.select(FULL_STAR_SELECTOR)
        rating = len(stars)

        useful_el = elem.select_one(USEFUL_BUTTON_TEXT_SELECTOR)
        useful_text = useful_el.get_text(strip=True) if useful_el else '0'
        useful_count = int(useful_text) if useful_text.isdigit() else 0

        reviews.append(Review(
            date=date_text,
            rating=rating,
            content=content_text,
            useful_count=useful_count
        ))

    return reviews


async def scrape_reviews(url: str) -> List[Review]:
    """
    Orchestrates fetching and parsing of reviews for a given URL.

    Args:
        url: The Mercado Libre product page URL.

    Returns:
        A list of Review objects.
    """
    logger.info("Starting scrape for %s", url)
    html = await fetch_page_content(url)
    return parse_reviews(html)


def main():
    """Main entry point."""
    test_url = "https://www.mercadolibre.com.co/xiaomi-redmi-note-14-pro-5g-negro-256gb-8ram-200mpx/p/MCO45748930?pdp_filters=deal%3AMCO779366-1#polycard_client=homes-korribanSearchPromotions&searchVariation=MCO45748930&wid=MCO2808701988&position=4&search_layout=grid&type=product&tracking_id=652a53a4-89ad-4d5c-a6b6-4bc7b5017005&sid=search&c_id=/home/promotions-recommendations/element&c_uid=0faf7082-ce62-49c3-b660-82144f9b9a80"
    reviews = asyncio.run(scrape_reviews(test_url))
    for review in reviews:
        logger.info(review)


if __name__ == "__main__":
    main()
