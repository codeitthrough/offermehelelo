import logging
from typing import Dict, List
from datetime import datetime, timezone
from services.deal_scorer import DealScorer

logger = logging.getLogger(__name__)

class DealProcessor:
    def __init__(self, db):
        self.db = db
        self.min_discount = 30
        self.deal_scorer = DealScorer(db)

    def validate_deal(self, deal: Dict) -> bool:
        """Validate deal meets minimum requirements"""
        try:
            # Check required fields
            if not deal.get('product_title'):
                logger.debug("Deal rejected: Missing title")
                return False
            
            if not deal.get('product_price'):
                logger.debug("Deal rejected: Missing price")
                return False
            
            if not deal.get('product_url'):
                logger.debug("Deal rejected: Missing URL")
                return False
            
            # Check minimum discount
            discount = deal.get('discount_percentage', 0)
            if discount < self.min_discount:
                logger.debug(f"Deal rejected: Discount {discount}% < {self.min_discount}%")
                return False
            
            logger.info(f"Deal validated: {deal['product_title'][:50]}... ({discount}% off)")
            return True
            
        except Exception as e:
            logger.error(f"Error validating deal: {str(e)}")
            return False

    async def is_duplicate(self, product_url: str) -> bool:
        """Check if deal already exists in database"""
        try:
            # Check by product_url in affiliate_link field
            existing = await self.db.deals.find_one({"affiliate_link": {"$regex": product_url}}, {"_id": 0})
            if existing:
                logger.info(f"Duplicate deal detected: {product_url[:50]}...")
                return True
            return False
        except Exception as e:
            logger.error(f"Error checking duplicate: {str(e)}")
            return False

    async def save_deal(self, deal: Dict, category_id: str, affiliate_link: str, deal_score: float, price_drop_info: Dict) -> bool:
        """Save deal to database with scoring"""
        try:
            # Generate ID
            count = await self.db.deals.count_documents({})
            deal_id = f"deal-{count + 1}"
            
            now = datetime.now(timezone.utc).isoformat()
            
            deal_doc = {
                "id": deal_id,
                "title": deal['product_title'],
                "description": None,
                "category_id": category_id,
                "image_url": deal.get('product_image'),
                "original_price": deal['original_price'],
                "discounted_price": deal['product_price'],
                "discount_percentage": deal['discount_percentage'],
                "deal_score": deal_score,
                "price_drop_percentage": price_drop_info.get('drop_percentage', 0),
                "has_price_dropped": price_drop_info.get('has_dropped', False),
                "affiliate_link": affiliate_link,
                "product_url": deal['product_url'],
                "platform": deal.get('source', 'Unknown'),
                "is_active": True,
                "created_at": now,
                "updated_at": now
            }
            
            await self.db.deals.insert_one(deal_doc)
            logger.info(f"Deal saved: {deal['product_title'][:50]}... (ID: {deal_id}, Score: {deal_score})")
            return True
            
        except Exception as e:
            logger.error(f"Error saving deal: {str(e)}")
            return False

    async def process_deals(self, scraped_deals: List[Dict], category_mapper, earnkaro_converter) -> Dict:
        """Process scraped deals: validate, filter duplicates, assign categories, convert links, score, save"""
        stats = {
            'total_scraped': len(scraped_deals),
            'validated': 0,
            'duplicates': 0,
            'inserted': 0,
            'failed': 0
        }
        
        try:
            for deal in scraped_deals:
                try:
                    # Validate deal
                    if not self.validate_deal(deal):
                        stats['failed'] += 1
                        continue
                    
                    stats['validated'] += 1
                    
                    # Check for duplicates
                    if await self.is_duplicate(deal['product_url']):
                        stats['duplicates'] += 1
                        continue
                    
                    # Record price history
                    await self.deal_scorer.record_price_history(
                        deal['product_url'],
                        deal['product_price'],
                        deal['original_price']
                    )
                    
                    # Detect price drop
                    price_drop_info = await self.deal_scorer.detect_price_drop(
                        deal['product_url'],
                        deal['product_price']
                    )
                    
                    # Calculate deal score
                    deal_score = await self.deal_scorer.calculate_score(deal, deal['product_url'])
                    
                    # Assign category
                    category_id = category_mapper.assign_category(deal['product_title'])
                    
                    # Convert to EarnKaro affiliate link
                    affiliate_link = await earnkaro_converter.convert_link(deal['product_url'])
                    
                    # Save to database with score and price drop info
                    saved = await self.save_deal(deal, category_id, affiliate_link, deal_score, price_drop_info)
                    
                    if saved:
                        stats['inserted'] += 1
                    else:
                        stats['failed'] += 1
                    
                except Exception as e:
                    logger.error(f"Error processing deal: {str(e)}")
                    stats['failed'] += 1
                    continue
            
            logger.info(f"Deal processing complete: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"Error in process_deals: {str(e)}")
            return stats
