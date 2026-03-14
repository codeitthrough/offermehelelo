import logging
from typing import Optional
import re

logger = logging.getLogger(__name__)

class CategoryMapper:
    def __init__(self):
        self.category_keywords = {
            'cat-2': {  # Mobile Accessories
                'name': 'Mobile Accessories',
                'keywords': ['smartphone', 'mobile', 'phone', 'charger', 'cable', 'powerbank', 'power bank']
            },
            'cat-3': {  # Laptops & Computer Accessories
                'name': 'Laptops & Computer Accessories',
                'keywords': ['laptop', 'notebook', 'monitor', 'keyboard', 'mouse', 'computer', 'pc']
            },
            'cat-6': {  # Audio
                'name': 'Audio (Headphones, Earbuds, Speakers)',
                'keywords': ['earbuds', 'earphones', 'headphones', 'speaker', 'audio', 'sound', 'tws']
            },
            'cat-5': {  # Smartwatches & Wearables
                'name': 'Smartwatches & Wearables',
                'keywords': ['smartwatch', 'smart watch', 'fitness band', 'watch', 'wearable', 'tracker']
            },
            'cat-4': {  # Home & Kitchen Appliances
                'name': 'Home & Kitchen Appliances',
                'keywords': ['mixer', 'blender', 'air fryer', 'vacuum', 'purifier', 'kitchen', 'home', 'appliance']
            },
            'cat-9': {  # Gaming Accessories
                'name': 'Gaming Accessories',
                'keywords': ['controller', 'console', 'gaming mouse', 'gaming keyboard', 'gaming', 'game', 'playstation', 'xbox']
            },
            'cat-1': {  # Electronics
                'name': 'Electronics',
                'keywords': ['electronic', 'gadget', 'device', 'tech']
            },
            'cat-7': {  # Fashion
                'name': 'Fashion (Men & Women)',
                'keywords': ['shirt', 'dress', 'clothing', 'fashion', 'apparel', 'wear']
            },
            'cat-8': {  # Shoes & Footwear
                'name': 'Shoes & Footwear',
                'keywords': ['shoe', 'shoes', 'footwear', 'sneaker', 'sandal', 'boot']
            },
            'cat-10': {  # Daily Utility Gadgets
                'name': 'Daily Utility Gadgets',
                'keywords': ['utility', 'tool', 'daily']
            }
        }

    def assign_category(self, product_title: str) -> Optional[str]:
        """Assign category ID based on product title keywords"""
        try:
            title_lower = product_title.lower()
            
            # Check each category's keywords
            for category_id, category_info in self.category_keywords.items():
                for keyword in category_info['keywords']:
                    if keyword in title_lower:
                        logger.info(f"Assigned category '{category_info['name']}' to product: {product_title[:50]}")
                        return category_id
            
            # Default to Electronics if no match
            logger.info(f"No category match for '{product_title[:50]}...', defaulting to Electronics")
            return 'cat-1'
            
        except Exception as e:
            logger.error(f"Error assigning category: {str(e)}")
            return 'cat-1'

    def get_category_name(self, category_id: str) -> str:
        """Get category name from ID"""
        return self.category_keywords.get(category_id, {}).get('name', 'Electronics')
