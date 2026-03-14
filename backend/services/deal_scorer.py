import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class DealScorer:
    def __init__(self, db):
        self.db = db
        self.discount_weight = 0.6
        self.price_drop_weight = 0.2
        self.popularity_weight = 0.2

    async def calculate_score(self, deal: Dict, product_url: str) -> float:
        """Calculate deal score based on multiple factors"""
        try:
            discount_percentage = deal.get('discount_percentage', 0)
            
            # Get price drop percentage
            price_drop_pct = await self.get_price_drop_percentage(product_url, deal['product_price'])
            
            # Get popularity score (based on clicks)
            popularity_score = await self.get_popularity_score(product_url)
            
            # Calculate weighted score
            deal_score = (
                (discount_percentage * self.discount_weight) +
                (price_drop_pct * self.price_drop_weight) +
                (popularity_score * self.popularity_weight)
            )
            
            logger.info(f"Deal score calculated: {deal_score:.2f} (discount: {discount_percentage}%, drop: {price_drop_pct}%, popularity: {popularity_score:.2f})")
            return round(deal_score, 2)
            
        except Exception as e:
            logger.error(f"Error calculating deal score: {str(e)}")
            # Fallback to discount percentage only
            return float(deal.get('discount_percentage', 0))

    async def get_price_drop_percentage(self, product_url: str, current_price: float) -> float:
        """Calculate price drop percentage from price history"""
        try:
            # Get latest price from history (excluding current)
            price_history = await self.db.price_history.find(
                {"product_url": product_url},
                {"_id": 0}
            ).sort("timestamp", -1).limit(2).to_list(2)
            
            if len(price_history) < 2:
                return 0.0
            
            # Compare with previous price
            previous_price = price_history[1]['price']
            
            if previous_price > current_price:
                price_drop_pct = ((previous_price - current_price) / previous_price) * 100
                return round(price_drop_pct, 2)
            
            return 0.0
            
        except Exception as e:
            logger.debug(f"Error getting price drop: {str(e)}")
            return 0.0

    async def get_popularity_score(self, product_url: str) -> float:
        """Calculate popularity score based on affiliate clicks (0-100 scale)"""
        try:
            # Count clicks for this product in last 7 days
            click_count = await self.db.affiliate_clicks.count_documents({
                "product_url": product_url
            })
            
            # Normalize to 0-100 scale (assuming max 50 clicks is 100 score)
            max_clicks = 50
            popularity_score = min((click_count / max_clicks) * 100, 100)
            
            return round(popularity_score, 2)
            
        except Exception as e:
            logger.debug(f"Error getting popularity score: {str(e)}")
            return 0.0

    async def record_price_history(self, product_url: str, price: float, original_price: float):
        """Record price in price history collection"""
        try:
            price_record = {
                "product_url": product_url,
                "price": price,
                "original_price": original_price,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            await self.db.price_history.insert_one(price_record)
            logger.info(f"Price history recorded for: {product_url[:50]}...")
            
        except Exception as e:
            logger.error(f"Error recording price history: {str(e)}")

    async def detect_price_drop(self, product_url: str, current_price: float) -> Dict:
        """Detect if price has dropped and return details"""
        try:
            # Get previous price
            previous_record = await self.db.price_history.find_one(
                {"product_url": product_url},
                {"_id": 0},
                sort=[("timestamp", -1)]
            )
            
            if not previous_record:
                return {"has_dropped": False, "drop_percentage": 0, "previous_price": None}
            
            previous_price = previous_record['price']
            
            if current_price < previous_price:
                drop_pct = ((previous_price - current_price) / previous_price) * 100
                return {
                    "has_dropped": True,
                    "drop_percentage": round(drop_pct, 2),
                    "previous_price": previous_price,
                    "current_price": current_price
                }
            
            return {"has_dropped": False, "drop_percentage": 0, "previous_price": previous_price}
            
        except Exception as e:
            logger.error(f"Error detecting price drop: {str(e)}")
            return {"has_dropped": False, "drop_percentage": 0, "previous_price": None}
