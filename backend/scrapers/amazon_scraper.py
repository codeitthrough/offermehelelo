import asyncio
import logging
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page, Browser
from bs4 import BeautifulSoup
import re

logger = logging.getLogger(__name__)

class AmazonScraper:
    def __init__(self):
        self.base_urls = [
            "https://www.amazon.in/gp/goldbox",
            "https://www.amazon.in/deals"
        ]
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    async def initialize(self):
        """Initialize browser and page"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            self.page = await self.browser.new_page()
            logger.info("Amazon scraper initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Amazon scraper: {str(e)}")
            raise

    async def close(self):
        """Close browser and cleanup"""
        try:
            if self.page:
                await self.page.close()
            if self.browser:
                await self.browser.close()
            if hasattr(self, 'playwright'):
                await self.playwright.stop()
            logger.info("Amazon scraper closed")
        except Exception as e:
            logger.error(f"Error closing Amazon scraper: {str(e)}")

    def extract_price(self, price_text: str) -> Optional[float]:
        """Extract numeric price from text"""
        try:
            # Remove currency symbols and commas
            price_str = re.sub(r'[^0-9.]', '', price_text)
            return float(price_str) if price_str else None
        except:
            return None

    def calculate_discount(self, original_price: float, discounted_price: float) -> int:
        """Calculate discount percentage"""
        try:
            if original_price and discounted_price and original_price > discounted_price:
                return int(((original_price - discounted_price) / original_price) * 100)
            return 0
        except:
            return 0

    async def scrape_deals(self, max_deals: int = 50) -> List[Dict]:
        """Scrape deals from Amazon"""
        deals = []
        
        try:
            await self.initialize()
            
            for url in self.base_urls:
                try:
                    logger.info(f"Scraping Amazon URL: {url}")
                    await self.page.goto(url, wait_until="networkidle", timeout=30000)
                    await asyncio.sleep(2)
                    
                    # Scroll to load more deals
                    for _ in range(3):
                        await self.page.evaluate("window.scrollBy(0, 800)")
                        await asyncio.sleep(1)
                    
                    html = await self.page.content()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Find deal cards - Amazon uses various selectors
                    deal_cards = soup.find_all(['div'], class_=re.compile(r'(DealCard|dealCard|deal-card|Grid-module)'))
                    
                    logger.info(f"Found {len(deal_cards)} potential deal cards")
                    
                    for card in deal_cards[:max_deals]:
                        try:
                            deal = self.parse_deal_card(card)
                            if deal:
                                deals.append(deal)
                        except Exception as e:
                            logger.debug(f"Error parsing deal card: {str(e)}")
                            continue
                    
                except Exception as e:
                    logger.error(f"Error scraping {url}: {str(e)}")
                    continue
            
            logger.info(f"Scraped {len(deals)} deals from Amazon")
            return deals
            
        except Exception as e:
            logger.error(f"Amazon scraping failed: {str(e)}")
            return deals
        finally:
            await self.close()

    def parse_deal_card(self, card) -> Optional[Dict]:
        """Parse individual deal card"""
        try:
            # Extract title
            title_elem = card.find(['a', 'span'], class_=re.compile(r'(title|Title|product|Product)'))
            if not title_elem:
                title_elem = card.find(['h2', 'h3', 'h4'])
            
            title = title_elem.get_text(strip=True) if title_elem else None
            if not title or len(title) < 10:
                return None
            
            # Extract URL
            link_elem = card.find('a', href=True)
            url = None
            if link_elem:
                href = link_elem.get('href', '')
                if href.startswith('http'):
                    url = href
                elif href.startswith('/'):
                    url = f"https://www.amazon.in{href}"
            
            if not url:
                return None
            
            # Clean Amazon URL (remove tracking parameters)
            if '?' in url:
                url = url.split('?')[0]
            
            # Extract prices
            price_elem = card.find(['span', 'div'], class_=re.compile(r'(price|Price)'))
            price_text = price_elem.get_text(strip=True) if price_elem else None
            discounted_price = self.extract_price(price_text) if price_text else None
            
            # Extract original price / MRP
            original_price_elem = card.find(['span', 'div'], class_=re.compile(r'(mrp|MRP|original|Original|strikethrough)'))
            original_price_text = original_price_elem.get_text(strip=True) if original_price_elem else None
            original_price = self.extract_price(original_price_text) if original_price_text else None
            
            # If no original price, use 1.5x of discounted price as estimate
            if not original_price and discounted_price:
                original_price = discounted_price * 1.5
            
            # Extract discount percentage
            discount_elem = card.find(['span', 'div'], string=re.compile(r'\d+%\s*(off|Off|OFF)'))
            discount = 0
            if discount_elem:
                discount_text = discount_elem.get_text(strip=True)
                discount_match = re.search(r'(\d+)%', discount_text)
                if discount_match:
                    discount = int(discount_match.group(1))
            
            # Calculate discount if not found
            if discount == 0 and original_price and discounted_price:
                discount = self.calculate_discount(original_price, discounted_price)
            
            # Extract image
            img_elem = card.find('img')
            image_url = None
            if img_elem:
                image_url = img_elem.get('src') or img_elem.get('data-src')
            
            # Validate required fields
            if not all([title, url, discounted_price]):
                return None
            
            return {
                'product_title': title[:500],
                'product_price': discounted_price,
                'original_price': original_price or discounted_price,
                'discount_percentage': discount,
                'product_image': image_url,
                'product_url': url,
                'source': 'Amazon'
            }
            
        except Exception as e:
            logger.debug(f"Error parsing deal card: {str(e)}")
            return None
