import asyncio
import logging
from typing import List, Dict, Optional
from playwright.async_api import async_playwright, Page, Browser
import re

logger = logging.getLogger(__name__)

class FlipkartScraper:
    def __init__(self):
        self.base_urls = [
            "https://www.flipkart.com/offers-store?otracker=hp_omu_Offers_1_Deal%20of%20the%20Day",
        ]
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    async def initialize(self):
        """Initialize browser and page"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            context = await self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self.page = await context.new_page()
            logger.info("Flipkart scraper initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Flipkart scraper: {str(e)}")
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
            logger.info("Flipkart scraper closed")
        except Exception as e:
            logger.error(f"Error closing Flipkart scraper: {str(e)}")

    def extract_price(self, price_text: str) -> Optional[float]:
        """Extract numeric price from text"""
        try:
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
        """Scrape deals from Flipkart using Playwright DOM extraction"""
        deals = []
        
        try:
            await self.initialize()
            
            for url in self.base_urls:
                try:
                    logger.info(f"Scraping Flipkart URL: {url}")
                    await self.page.goto(url, wait_until="networkidle", timeout=30000)
                    
                    # Wait for product cards to load
                    try:
                        await self.page.wait_for_selector('div._1AtVbE, div[class*="product"], a[class*="_1fQZEK"], div._4ddWXP', timeout=10000)
                    except:
                        logger.warning("Primary selectors not found, trying alternatives")
                        try:
                            await self.page.wait_for_selector('div[class*="card"], a[href*="/p/"]', timeout=5000)
                        except:
                            logger.warning("No product cards found")
                    
                    await asyncio.sleep(2)
                    
                    # Scroll to load more
                    for _ in range(3):
                        await self.page.evaluate("window.scrollBy(0, 1000)")
                        await asyncio.sleep(1)
                    
                    # Extract deals using JavaScript
                    page_deals = await self.page.evaluate("""
                        () => {
                            const deals = [];
                            
                            // Multiple selector strategies for Flipkart
                            const containerSelectors = [
                                'div._1AtVbE',
                                'div._4ddWXP',
                                'a._1fQZEK',
                                'div[class*="product"]',
                                'a[href*="/p/"]'
                            ];
                            
                            let productCards = [];
                            for (const selector of containerSelectors) {
                                productCards = document.querySelectorAll(selector);
                                if (productCards.length > 0) {
                                    console.log('Found products with selector:', selector, productCards.length);
                                    break;
                                }
                            }
                            
                            productCards.forEach(card => {
                                try {
                                    // Find title
                                    const titleSelectors = [
                                        'div._4rR01T',
                                        'a[title]',
                                        'div[class*="title"]',
                                        'div._2WkVRV',
                                        'a.s1Q9rs'
                                    ];
                                    
                                    let title = '';
                                    for (const sel of titleSelectors) {
                                        const titleEl = card.querySelector(sel);
                                        if (titleEl) {
                                            title = titleEl.getAttribute('title') || titleEl.innerText.trim();
                                            if (title && title.length > 10) break;
                                        }
                                    }
                                    
                                    if (!title || title.length < 10) return;
                                    
                                    // Find link
                                    const linkEl = card.tagName === 'A' ? card : card.querySelector('a[href*="/p/"]');
                                    let url = linkEl ? linkEl.href : '';
                                    if (!url || !url.includes('/p/')) return;
                                    
                                    // Clean URL
                                    if (url.includes('?')) {
                                        url = url.split('?')[0];
                                    }
                                    
                                    // Find current price
                                    const priceSelectors = [
                                        'div._30jeq3',
                                        'div._3I9_wc',
                                        'div[class*="price"]',
                                        'div._25b18c'
                                    ];
                                    
                                    let priceText = '';
                                    for (const sel of priceSelectors) {
                                        const priceEl = card.querySelector(sel);
                                        if (priceEl) {
                                            priceText = priceEl.innerText || priceEl.textContent || '';
                                            if (priceText.includes('₹') || priceText.match(/\d+/)) {
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // Find original price (strikethrough)
                                    const originalPriceSelectors = [
                                        'div._3I9_wc._27UcVY',
                                        'div[class*="strke"]',
                                        'span[class*="strike"]'
                                    ];
                                    
                                    let originalPriceText = '';
                                    for (const sel of originalPriceSelectors) {
                                        const origEl = card.querySelector(sel);
                                        if (origEl) {
                                            originalPriceText = origEl.innerText || origEl.textContent || '';
                                            if (originalPriceText.includes('₹')) break;
                                        }
                                    }
                                    
                                    // Find discount
                                    let discount = 0;
                                    const discountSelectors = [
                                        'div._3Ay6Sb',
                                        'div[class*="discount"]',
                                        'span[class*="discount"]'
                                    ];
                                    
                                    for (const sel of discountSelectors) {
                                        const discEl = card.querySelector(sel);
                                        if (discEl) {
                                            const discText = discEl.innerText || discEl.textContent || '';
                                            const match = discText.match(/(\d+)%/);
                                            if (match) {
                                                discount = parseInt(match[1]);
                                                break;
                                            }
                                        }
                                    }
                                    
                                    // Find image
                                    const imgEl = card.querySelector('img');
                                    const imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src')) : null;
                                    
                                    // Extract prices
                                    const priceMatch = priceText.match(/([\d,]+)/g);
                                    let price = null;
                                    if (priceMatch && priceMatch.length > 0) {
                                        price = parseFloat(priceMatch[0].replace(/,/g, ''));
                                    }
                                    
                                    let originalPrice = null;
                                    if (originalPriceText) {
                                        const origMatch = originalPriceText.match(/([\d,]+)/g);
                                        if (origMatch && origMatch.length > 0) {
                                            originalPrice = parseFloat(origMatch[0].replace(/,/g, ''));
                                        }
                                    }
                                    
                                    if (price && price > 0) {
                                        deals.push({
                                            title: title,
                                            price: price,
                                            originalPrice: originalPrice,
                                            discount: discount,
                                            url: url,
                                            image: imageUrl
                                        });
                                    }
                                } catch (err) {
                                    console.error('Error parsing product card:', err);
                                }
                            });
                            
                            return deals;
                        }
                    """)
                    
                    logger.info(f"Found {len(page_deals)} potential deals from Flipkart")
                    
                    # Convert to standard format
                    for deal_data in page_deals:
                        try:
                            price = deal_data.get('price', 0)
                            original_price = deal_data.get('originalPrice')
                            discount = deal_data.get('discount', 0)
                            
                            # Calculate if missing
                            if not original_price or original_price <= price:
                                if discount > 0:
                                    original_price = price / (1 - discount / 100)
                                else:
                                    original_price = price * 1.3
                                    discount = 30
                            
                            # Recalculate discount if we have both prices
                            if original_price and price and discount == 0:
                                discount = self.calculate_discount(original_price, price)
                            
                            deal = {
                                'product_title': deal_data.get('title', ''),
                                'product_price': price,
                                'original_price': original_price,
                                'discount_percentage': discount,
                                'product_image': deal_data.get('image'),
                                'product_url': deal_data.get('url', ''),
                                'source': 'Flipkart'
                            }
                            
                            # Validate
                            if deal['product_title'] and deal['product_price'] > 0 and deal['product_url']:
                                deals.append(deal)
                                
                        except Exception as e:
                            logger.debug(f"Error formatting deal: {str(e)}")
                            continue
                    
                    if len(deals) >= max_deals:
                        break
                        
                except Exception as e:
                    logger.error(f"Error scraping {url}: {str(e)}")
                    continue
            
            logger.info(f"Scraped {len(deals)} deals from Flipkart")
            return deals[:max_deals]
            
        except Exception as e:
            logger.error(f"Flipkart scraping failed: {str(e)}")
            return deals
        finally:
            await self.close()
