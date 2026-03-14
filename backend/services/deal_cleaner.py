import logging
from datetime import datetime, timezone, timedelta
from typing import Dict
import asyncio
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

class DealCleaner:
    def __init__(self, db):
        self.db = db
        self.min_discount_threshold = 20

    async def cleanup_expired_deals(self) -> Dict:
        """Remove deals with discount below threshold or invalid URLs"""
        stats = {
            'checked': 0,
            'removed_low_discount': 0,
            'removed_invalid_url': 0,
            'total_removed': 0
        }
        
        try:
            # Get all active deals
            deals = await self.db.deals.find({"is_active": True}, {"_id": 0}).to_list(1000)
            stats['checked'] = len(deals)
            
            logger.info(f"Checking {len(deals)} deals for expiry...")
            
            for deal in deals:
                try:
                    # Check discount percentage
                    if deal.get('discount_percentage', 0) < self.min_discount_threshold:
                        await self.db.deals.update_one(
                            {"id": deal['id']},
                            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
                        )
                        stats['removed_low_discount'] += 1
                        logger.info(f"Deactivated deal (low discount): {deal['title'][:50]}...")
                        continue
                    
                    # Check if product URL is still valid (optional - can be expensive)
                    # Skipping URL validation for now to save resources
                    # url_valid = await self.check_url_validity(deal.get('affiliate_link'))
                    # if not url_valid:
                    #     await self.db.deals.delete_one({"id": deal['id']})
                    #     stats['removed_invalid_url'] += 1
                    #     continue
                    
                except Exception as e:
                    logger.error(f"Error processing deal {deal.get('id')}: {str(e)}")
                    continue
            
            stats['total_removed'] = stats['removed_low_discount'] + stats['removed_invalid_url']
            logger.info(f"Cleanup complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error in cleanup_expired_deals: {str(e)}")
            return stats

    async def check_url_validity(self, url: str) -> bool:
        """Check if URL is still accessible"""
        try:
            playwright = await async_playwright().start()
            browser = await playwright.chromium.launch(headless=True)
            page = await browser.new_page()
            
            response = await page.goto(url, timeout=10000, wait_until="domcontentloaded")
            is_valid = response.status < 400
            
            await browser.close()
            await playwright.stop()
            
            return is_valid
        except Exception as e:
            logger.debug(f"URL validation failed for {url}: {str(e)}")
            return False

    async def cleanup_old_deals(self, days: int = 7) -> int:
        """Remove deals older than specified days"""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            cutoff_iso = cutoff_date.isoformat()
            
            result = await self.db.deals.delete_many({
                "created_at": {"$lt": cutoff_iso}
            })
            
            logger.info(f"Removed {result.deleted_count} deals older than {days} days")
            return result.deleted_count
            
        except Exception as e:
            logger.error(f"Error removing old deals: {str(e)}")
            return 0
