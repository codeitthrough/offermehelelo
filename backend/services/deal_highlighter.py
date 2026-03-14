import logging
from typing import List, Dict
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

class DealHighlighter:
    def __init__(self, db):
        self.db = db

    async def get_best_deals_today(self, limit: int = 10) -> List[Dict]:
        """Get highest scoring deals"""
        try:
            deals = await self.db.deals.find(
                {"is_active": True},
                {"_id": 0}
            ).sort("deal_score", -1).limit(limit).to_list(limit)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} best deals today")
            return deals
        except Exception as e:
            logger.error(f"Error getting best deals today: {str(e)}")
            return []

    async def get_lightning_deals(self, limit: int = 10) -> List[Dict]:
        """Get deals with 50%+ discount"""
        try:
            deals = await self.db.deals.find(
                {"is_active": True, "discount_percentage": {"$gte": 50}},
                {"_id": 0}
            ).sort("deal_score", -1).limit(limit).to_list(limit)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} lightning deals")
            return deals
        except Exception as e:
            logger.error(f"Error getting lightning deals: {str(e)}")
            return []

    async def get_biggest_price_drops(self, limit: int = 10) -> List[Dict]:
        """Get deals with highest price drop percentage"""
        try:
            deals = await self.db.deals.find(
                {"is_active": True, "has_price_dropped": True},
                {"_id": 0}
            ).sort("price_drop_percentage", -1).limit(limit).to_list(limit)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} biggest price drops")
            return deals
        except Exception as e:
            logger.error(f"Error getting biggest price drops: {str(e)}")
            return []

    async def get_trending_deals_24h(self, limit: int = 10) -> List[Dict]:
        """Get most clicked deals in last 24 hours"""
        try:
            # Get clicks from last 24 hours
            yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            
            pipeline = [
                {"$match": {"timestamp": {"$gte": yesterday}}},
                {"$group": {"_id": "$deal_id", "clicks": {"$sum": 1}}},
                {"$sort": {"clicks": -1}},
                {"$limit": limit}
            ]
            
            cursor = self.db.affiliate_clicks.aggregate(pipeline)
            deal_ids = []
            click_counts = {}
            
            async for doc in cursor:
                deal_ids.append(doc['_id'])
                click_counts[doc['_id']] = doc['clicks']
            
            if not deal_ids:
                return []
            
            # Get deal details
            deals = await self.db.deals.find(
                {"id": {"$in": deal_ids}, "is_active": True},
                {"_id": 0}
            ).to_list(limit)
            
            # Add click counts and sort by clicks
            for deal in deals:
                deal['trending_clicks'] = click_counts.get(deal['id'], 0)
            
            deals.sort(key=lambda x: x.get('trending_clicks', 0), reverse=True)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} trending deals (24h)")
            return deals
            
        except Exception as e:
            logger.error(f"Error getting trending deals: {str(e)}")
            return []

    async def get_deals_by_platform(self, platform: str, limit: int = 20) -> List[Dict]:
        """Get deals from specific platform sorted by score"""
        try:
            deals = await self.db.deals.find(
                {"is_active": True, "platform": platform},
                {"_id": 0}
            ).sort("deal_score", -1).limit(limit).to_list(limit)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} deals from {platform}")
            return deals
        except Exception as e:
            logger.error(f"Error getting deals by platform: {str(e)}")
            return []

    async def get_deals_under_price(self, max_price: float, limit: int = 20) -> List[Dict]:
        """Get deals under specified price"""
        try:
            deals = await self.db.deals.find(
                {"is_active": True, "discounted_price": {"$lte": max_price}},
                {"_id": 0}
            ).sort("deal_score", -1).limit(limit).to_list(limit)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} deals under ₹{max_price}")
            return deals
        except Exception as e:
            logger.error(f"Error getting deals under price: {str(e)}")
            return []

    async def get_top_discounted(self, limit: int = 20) -> List[Dict]:
        """Get deals with highest discount percentage"""
        try:
            deals = await self.db.deals.find(
                {"is_active": True},
                {"_id": 0}
            ).sort("discount_percentage", -1).limit(limit).to_list(limit)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} top discounted deals")
            return deals
        except Exception as e:
            logger.error(f"Error getting top discounted deals: {str(e)}")
            return []

    async def get_related_deals(self, category_id: str, exclude_id: str, limit: int = 8) -> List[Dict]:
        """Get related deals from same category"""
        try:
            deals = await self.db.deals.find(
                {"is_active": True, "category_id": category_id, "id": {"$ne": exclude_id}},
                {"_id": 0}
            ).sort("deal_score", -1).limit(limit).to_list(limit)
            
            await self._enrich_deals(deals)
            logger.info(f"Retrieved {len(deals)} related deals")
            return deals
        except Exception as e:
            logger.error(f"Error getting related deals: {str(e)}")
            return []

    async def _enrich_deals(self, deals: List[Dict]):
        """Add category names and parse dates for deals"""
        try:
            for deal in deals:
                # Parse dates
                if isinstance(deal.get('created_at'), str):
                    deal['created_at'] = datetime.fromisoformat(deal['created_at'])
                if isinstance(deal.get('updated_at'), str):
                    deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
                
                # Get category name
                if deal.get('category_id'):
                    category = await self.db.categories.find_one(
                        {"id": deal['category_id']},
                        {"_id": 0, "name": 1}
                    )
                    if category:
                        deal['category_name'] = category['name']
                
                # Add badge flags
                deal['is_hot_deal'] = deal.get('deal_score', 0) > 60
                deal['is_lightning_deal'] = deal.get('discount_percentage', 0) >= 50
                deal['is_price_drop'] = deal.get('has_price_dropped', False)
                
        except Exception as e:
            logger.error(f"Error enriching deals: {str(e)}")
