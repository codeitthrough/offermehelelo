import asyncio
import logging
from typing import List, Dict, Optional
#from playwright.async_api import async_playwright, Page, Browser
import re

logger = logging.getLogger(__name__)

class AmazonScraper:
    def __init__(self):
        self.base_urls = [
            "https://www.amazon.in/gp/goldbox",
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
            # Remove currency symbols, commas, and extract number
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
        """Scrape deals from Amazon using Playwright DOM extraction"""
        deals = []
        
        try:
            await self.initialize()
            
            for url in self.base_urls:
                try:
                    logger.info(f"Scraping Amazon URL: {url}")
                    await self.page.goto(url, wait_until="networkidle", timeout=30000)
                    
                    # Wait for deals to load - try multiple possible selectors
                    try:
                        await self.page.wait_for_selector('div[data-testid="deal-card"], div.DealCard-module, div[class*="DealCard"], div[class*="dealCard"]', timeout=10000)
                    except:
                        logger.warning("Primary deal selectors not found, trying alternative selectors")
                        try:
                            await self.page.wait_for_selector('div[id^="deal_"], div.a-section.dealContainer', timeout=5000)
                        except:
                            logger.warning("No deal containers found with standard selectors")
                    
                    await asyncio.sleep(2)
                    
                    # Scroll to load more deals
                    for _ in range(3):
                        await self.page.evaluate("window.scrollBy(0, 1000)")
                        await asyncio.sleep(1)
                    
                    # Extract deals using JavaScript evaluation
                    page_deals = await self.page.evaluate("""
                        () => {
                            const deals = [];
                            
                            // Try multiple selector strategies
                            const selectors = [
                                'div[data-testid="deal-card"]',
                                'div.DealCard-module__card',
                                'div[class*="DealCard"]',
                                'div[id^="deal_"]',
                                'div.a-section.dealContainer',
                                'div[class*="dealCard"]',
                                'div.Grid-module__grid-item'
                            ];
                            
                            let dealElements = [];
                            for (const selector of selectors) {
                                dealElements = document.querySelectorAll(selector);
                                if (dealElements.length > 0) {
                                    console.log('Found deals with selector:', selector, dealElements.length);
                                    break;
                                }
                            }
                            
                            dealElements.forEach(card => {
                                try {
                                    // Find title
                                    const titleEl = card.querySelector('a[aria-label], h3, h2, div[data-testid="deal-title"], span[class*="title"]');
                                    const title = titleEl ? (titleEl.getAttribute('aria-label') || titleEl.innerText.trim()) : '';
                                    
                                    if (!title || title.length < 10) return;
                                    
                                    // Find link
                                    const linkEl = card.querySelector('a[href*="/dp/"], a[href*="/gp/"]');
                                    let url = linkEl ? linkEl.href : '';
                                    if (!url) return;
                                    
                                    // Clean URL
                                    if (url.includes('?')) {
                                        url = url.split('?')[0];
                                    }
                                    
                                    // Find prices
                                    const priceSelectors = [
                                        'span.a-price-whole',
                                        'span[class*="price"]',
                                        'div[data-testid="deal-price"]',
                                        'span.a-offscreen'
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
                                    
                                    // Find discount badge
                                    let discount = 0;
                                    const discountSelectors = [
                                        'span.savingsPercentage',
                                        'span[class*="badge"]',
                                        'div[class*="badge"]',
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
                                    
                                    // Extract price value
                                    const priceMatch = priceText.match(/([\d,]+)/g);
                                    let price = null;
                                    if (priceMatch && priceMatch.length > 0) {
                                        price = parseFloat(priceMatch[0].replace(/,/g, ''));
                                    }
                                    
                                    if (price && price > 0) {
                                        deals.push({
                                            title: title,
                                            price: price,
                                            discount: discount,
                                            url: url,
                                            image: imageUrl
                                        });
                                    }
                                } catch (err) {
                                    console.error('Error parsing deal card:', err);
                                }
                            });
                            
                            return deals;
                        }
                    """)
                    
                    logger.info(f"Found {len(page_deals)} potential deals from Amazon")
                    
                    # Convert to standard format
                    for deal_data in page_deals:
                        try:
                            price = deal_data.get('price', 0)
                            discount = deal_data.get('discount', 0)
                            
                            # Calculate original price from discount
                            if discount > 0:
                                original_price = price / (1 - discount / 100)
                            else:
                                # Estimate if no discount found
                                original_price = price * 1.3
                                discount = 30
                            
                            deal = {
                                'product_title': deal_data.get('title', ''),
                                'product_price': price,
                                'original_price': original_price,
                                'discount_percentage': discount,
                                'product_image': deal_data.get('image'),
                                'product_url': deal_data.get('url', ''),
                                'source': 'Amazon'
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
            
            logger.info(f"Scraped {len(deals)} deals from Amazon")
            return deals[:max_deals]
            
        except Exception as e:
            logger.error(f"Amazon scraping failed: {str(e)}")
            return deals
        finally:
            await self.close()
