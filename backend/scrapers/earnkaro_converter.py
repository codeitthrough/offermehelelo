import asyncio
import logging
from typing import Optional
from playwright.async_api import async_playwright, Page, Browser
import os

logger = logging.getLogger(__name__)

class EarnKaroConverter:
    def __init__(self):
        self.earnkaro_url = "https://www.earnkaro.com/"
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.is_logged_in = False
        
        # Get credentials from environment
        self.email = os.environ.get('EARNKARO_EMAIL')
        self.password = os.environ.get('EARNKARO_PASSWORD')

    async def initialize(self):
        """Initialize browser and page"""
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            self.page = await self.browser.new_page()
            logger.info("EarnKaro converter initialized")
        except Exception as e:
            logger.error(f"Failed to initialize EarnKaro converter: {str(e)}")
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
            logger.info("EarnKaro converter closed")
        except Exception as e:
            logger.error(f"Error closing EarnKaro converter: {str(e)}")

    async def login(self) -> bool:
        """Login to EarnKaro"""
        try:
            if not self.email or not self.password:
                logger.warning("EarnKaro credentials not provided. Skipping login.")
                return False
            
            logger.info("Attempting to login to EarnKaro...")
            await self.page.goto(self.earnkaro_url, wait_until="networkidle", timeout=30000)
            
            # Click login button
            login_btn = await self.page.wait_for_selector('text=Login', timeout=5000)
            await login_btn.click()
            await asyncio.sleep(2)
            
            # Enter credentials
            await self.page.fill('input[type="email"]', self.email)
            await self.page.fill('input[type="password"]', self.password)
            
            # Submit
            submit_btn = await self.page.wait_for_selector('button[type="submit"]', timeout=5000)
            await submit_btn.click()
            await asyncio.sleep(3)
            
            # Check if login successful
            self.is_logged_in = True
            logger.info("Successfully logged in to EarnKaro")
            return True
            
        except Exception as e:
            logger.error(f"EarnKaro login failed: {str(e)}")
            self.is_logged_in = False
            return False

    async def convert_link(self, product_url: str) -> str:
        """Convert product URL to EarnKaro affiliate link"""
        try:
            if not self.page:
                await self.initialize()
            
            # If credentials not provided, return original URL
            if not self.email or not self.password:
                logger.warning(f"EarnKaro credentials not configured. Returning original URL: {product_url[:50]}...")
                return product_url
            
            # Login if not already logged in
            if not self.is_logged_in:
                login_success = await self.login()
                if not login_success:
                    return product_url
            
            # Navigate to link converter page
            converter_url = "https://www.earnkaro.com/links"
            await self.page.goto(converter_url, wait_until="networkidle", timeout=30000)
            await asyncio.sleep(2)
            
            # Enter product URL
            url_input = await self.page.wait_for_selector('input[placeholder*="link"]', timeout=5000)
            await url_input.fill(product_url)
            await asyncio.sleep(1)
            
            # Click convert/generate button
            convert_btn = await self.page.wait_for_selector('text=Generate', timeout=5000)
            await convert_btn.click()
            await asyncio.sleep(3)
            
            # Get affiliate link
            affiliate_link_elem = await self.page.wait_for_selector('.affiliate-link, [class*="generated"]', timeout=5000)
            affiliate_link = await affiliate_link_elem.inner_text()
            
            if affiliate_link and affiliate_link.startswith('http'):
                logger.info(f"Successfully converted link: {product_url[:50]}... -> {affiliate_link[:50]}...")
                return affiliate_link
            else:
                logger.warning(f"Failed to convert link: {product_url[:50]}...")
                return product_url
            
        except Exception as e:
            logger.error(f"Error converting link: {str(e)}")
            return product_url

    async def convert_links_batch(self, urls: list) -> dict:
        """Convert multiple URLs to affiliate links"""
        results = {}
        
        try:
            await self.initialize()
            
            for url in urls:
                affiliate_link = await self.convert_link(url)
                results[url] = affiliate_link
                await asyncio.sleep(1)  # Rate limiting
            
            return results
            
        except Exception as e:
            logger.error(f"Batch conversion failed: {str(e)}")
            return results
        finally:
            await self.close()
