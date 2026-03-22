from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Auth configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    slug: str
    icon: Optional[str] = None
    is_active: bool = True
    created_at: datetime

class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None

class Deal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    category_id: str
    category_name: Optional[str] = None
    image_url: Optional[str] = None
    original_price: float
    discounted_price: float
    discount_percentage: int
    deal_score: Optional[float] = 0.0
    price_drop_percentage: Optional[float] = 0.0
    has_price_dropped: Optional[bool] = False
    affiliate_link: str
    product_url: Optional[str] = None
    platform: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class DealCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: str
    image_url: Optional[str] = None
    original_price: float
    discounted_price: float
    affiliate_link: str
    platform: str

class DealUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None
    original_price: Optional[float] = None
    discounted_price: Optional[float] = None
    affiliate_link: Optional[str] = None
    platform: Optional[str] = None
    is_active: Optional[bool] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class AffiliateSetting(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    platform: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_active: bool = False
    last_fetched_at: Optional[datetime] = None

class AffiliateSettingUpdate(BaseModel):
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    is_active: Optional[bool] = None


class Platform(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    image_url: Optional[str] = None
    affiliate_link: str
    offer_percentage: Optional[int] = 0
    is_active: bool = True

class PlatformCreate(BaseModel):
    name: str
    image_url: Optional[str] = None
    affiliate_link: str
    offer_percentage: Optional[int] = 0

class PlatformUpdate(BaseModel):
    name: Optional[str] = None
    image_url: Optional[str] = None
    affiliate_link: Optional[str] = None
    offer_percentage: Optional[int] = None
    is_active: Optional[bool] = None

class Subcategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    category_id: str
    name: str
    slug: str
    is_active: bool = True

class SubcategoryCreate(BaseModel):
    category_id: str
    name: str

class Suggestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: Optional[str] = None
    message: str
    suggestion_type: str
    created_at: datetime
    status: str = "pending"

class SuggestionCreate(BaseModel):
    name: str
    email: Optional[str] = None
    message: str
    suggestion_type: str

class ScraperSettings(BaseModel):
    scraper_enabled: bool = True
    scraper_interval: str = "hourly"  # hourly, daily

class BulkDeleteRequest(BaseModel):
    deal_ids: List[str]

class BrowseLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    platform: str
    platform_logo: Optional[str] = None
    affiliate_link: str
    category_id: Optional[str] = None
    subcategory: Optional[str] = None
    offer_text: Optional[str] = None
    is_active: bool = True
    created_at: datetime

class BrowseLinkCreate(BaseModel):
    title: str
    platform: str
    affiliate_link: str
    category_id: Optional[str] = None
    subcategory: Optional[str] = None
    offer_text: Optional[str] = None

class BrowseLinkUpdate(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    affiliate_link: Optional[str] = None
    category_id: Optional[str] = None
    subcategory: Optional[str] = None
    offer_text: Optional[str] = None
    is_active: Optional[bool] = None


# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

def create_slug(name: str) -> str:
    return name.lower().replace(" ", "-").replace("&", "and")

# Initialize default admin user
async def init_admin():
    admin = await db.admin_users.find_one({"username": "admin"})
    if not admin:
        hashed_password = get_password_hash("admin123")
        await db.admin_users.insert_one({
            "username": "admin",
            "password_hash": hashed_password,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logging.info("Default admin user created: username=admin, password=admin123")

# Initialize categories
async def init_categories():
    count = await db.categories.count_documents({})
    if count == 0:
        categories = [
            {"id": "cat-1", "name": "Electronics", "slug": "electronics", "icon": "Cpu", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-2", "name": "Mobile Accessories", "slug": "mobile-accessories", "icon": "Smartphone", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-3", "name": "Laptops & Computer Accessories", "slug": "laptops-computer-accessories", "icon": "Laptop", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-4", "name": "Home & Kitchen Appliances", "slug": "home-kitchen-appliances", "icon": "Home", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-5", "name": "Smartwatches & Wearables", "slug": "smartwatches-wearables", "icon": "Watch", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-6", "name": "Audio (Headphones, Earbuds, Speakers)", "slug": "audio-headphones-earbuds-speakers", "icon": "Headphones", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-7", "name": "Fashion (Men & Women)", "slug": "fashion-men-women", "icon": "ShoppingBag", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-8", "name": "Shoes & Footwear", "slug": "shoes-footwear", "icon": "Footprints", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-9", "name": "Gaming Accessories", "slug": "gaming-accessories", "icon": "Gamepad2", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": "cat-10", "name": "Daily Utility Gadgets", "slug": "daily-utility-gadgets", "icon": "Zap", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        await db.categories.insert_many(categories)
        logging.info(f"Initialized {len(categories)} default categories")

# Initialize affiliate settings
async def init_affiliate_settings():
    count = await db.affiliate_settings.count_documents({})
    if count == 0:
        settings = [
            {"id": "aff-1", "platform": "Amazon", "api_key": None, "api_secret": None, "is_active": False, "last_fetched_at": None},
            {"id": "aff-2", "platform": "Flipkart", "api_key": None, "api_secret": None, "is_active": False, "last_fetched_at": None},
            {"id": "aff-3", "platform": "EarnKaro", "api_key": None, "api_secret": None, "is_active": False, "last_fetched_at": None}
        ]
        await db.affiliate_settings.insert_many(settings)
        logging.info("Initialized affiliate settings")

# Import scraper pipeline
import sys
sys.path.append(str(ROOT_DIR))
#from automation.scraper_pipeline import ScraperPipeline
#from services.deal_highlighter import DealHighlighter

# Initialize scraper pipeline and deal highlighter
#scraper_pipeline = ScraperPipeline(db)
#deal_highlighter = DealHighlighter(db)

# Deal fetcher with scraper integration

'''
async def fetch_deals_from_platforms():
    logging.info("Running scheduled deal fetch...")
    
    try:
        # Run the full scraper pipeline
        stats = await scraper_pipeline.run_full_pipeline()
        
        # Update affiliate settings with last fetch time
        settings = await db.affiliate_settings.find({}, {"_id": 0}).to_list(100)
        for setting in settings:
            await db.affiliate_settings.update_one(
                {"id": setting['id']},
                {"$set": {"last_fetched_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        logging.info(f"Deal fetch completed. Inserted: {stats.get('processing', {}).get('inserted', 0)} deals")
        
    except Exception as e:
        logging.error(f"Deal fetch failed: {str(e)}")

'''

async def fetch_deals_from_platforms():
    return



# Public endpoints
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({"is_active": True}, {"_id": 0}).to_list(100)
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.get("/deals", response_model=List[Deal])
async def get_deals(
    category_id: Optional[str] = None,
    subcategory: Optional[str] = None,
    min_discount: Optional[int] = None,
    platform: Optional[str] = None,
    sort_by: Optional[str] = "score"  # score, date, discount
):
    query = {"is_active": True}
    if category_id:
        query["category_id"] = category_id
    if subcategory:
        query["subcategory"] = subcategory
    if min_discount:
        query["discount_percentage"] = {"$gte": min_discount}
    if platform:
        query["platform"] = platform
    
    # Determine sort order
    sort_field = "deal_score" if sort_by == "score" else "created_at" if sort_by == "date" else "discount_percentage"
    sort_direction = -1  # Descending
    
    deals = await db.deals.find(query, {"_id": 0}).sort(sort_field, sort_direction).limit(100).to_list(100)
    
    # Add category names and parse dates
    for deal in deals:
        if isinstance(deal.get('created_at'), str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal.get('updated_at'), str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
        
        # Get category name
        category = await db.categories.find_one({"id": deal['category_id']}, {"_id": 0})
        if category:
            deal['category_name'] = category['name']
    
    return deals

@api_router.get("/deals/top")
async def get_top_deals(limit: int = 20):
    """Get top-ranked deals by score"""
    deals = await db.deals.find({"is_active": True}, {"_id": 0}).sort("deal_score", -1).limit(limit).to_list(limit)
    
    for deal in deals:
        if isinstance(deal.get('created_at'), str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal.get('updated_at'), str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
        
        category = await db.categories.find_one({"id": deal['category_id']}, {"_id": 0})
        if category:
            deal['category_name'] = category['name']
    
    return deals

@api_router.get("/deals/trending")
async def get_trending_deals(limit: int = 20):
    """Get trending deals by click count"""
    try:
        # Aggregate clicks by deal_id
        pipeline = [
            {"$group": {"_id": "$deal_id", "clicks": {"$sum": 1}}},
            {"$sort": {"clicks": -1}},
            {"$limit": limit}
        ]
        
        cursor = db.affiliate_clicks.aggregate(pipeline)
        deal_ids = []
        async for doc in cursor:
            deal_ids.append(doc['_id'])
        
        if not deal_ids:
            return []
        
        # Get deal details
        deals = await db.deals.find({"id": {"$in": deal_ids}, "is_active": True}, {"_id": 0}).to_list(limit)
        
        for deal in deals:
            if isinstance(deal.get('created_at'), str):
                deal['created_at'] = datetime.fromisoformat(deal['created_at'])
            if isinstance(deal.get('updated_at'), str):
                deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
            
            category = await db.categories.find_one({"id": deal['category_id']}, {"_id": 0})
            if category:
                deal['category_name'] = category['name']
        
        return deals
        
    except Exception as e:
        logger.error(f"Error getting trending deals: {str(e)}")
        return []

@api_router.get("/deals/latest")
async def get_latest_deals(limit: int = 20):
    """Get latest deals"""
    deals = await db.deals.find({"is_active": True}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for deal in deals:
        if isinstance(deal.get('created_at'), str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal.get('updated_at'), str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
        
        category = await db.categories.find_one({"id": deal['category_id']}, {"_id": 0})
        if category:
            deal['category_name'] = category['name']
    
    return deals

# Auth endpoints
@api_router.post("/auth/login", response_model=Token)
async def login(credentials: AdminLogin):
    admin = await db.admin_users.find_one({"username": credentials.username})
    if not admin or not verify_password(credentials.password, admin['password_hash']):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": credentials.username})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/verify")
async def verify_auth(username: str = Depends(verify_token)):
    return {"username": username, "authenticated": True}

# Admin Category endpoints
@api_router.get("/admin/categories", response_model=List[Category])
async def get_admin_categories(username: str = Depends(verify_token)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    for cat in categories:
        if isinstance(cat['created_at'], str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
    return categories

@api_router.post("/admin/categories", response_model=Category)
async def create_category(category: CategoryCreate, username: str = Depends(verify_token)):
    # Generate ID
    count = await db.categories.count_documents({})
    cat_id = f"cat-{count + 1}"
    
    new_category = {
        "id": cat_id,
        "name": category.name,
        "slug": create_slug(category.name),
        "icon": category.icon or "Package",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categories.insert_one(new_category)
    new_category['created_at'] = datetime.fromisoformat(new_category['created_at'])
    return Category(**new_category)

@api_router.put("/admin/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in category.model_dump().items() if v is not None}
    
    if 'name' in update_data:
        update_data['slug'] = create_slug(update_data['name'])
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated_cat = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(updated_cat['created_at'], str):
        updated_cat['created_at'] = datetime.fromisoformat(updated_cat['created_at'])
    return Category(**updated_cat)

@api_router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: str, username: str = Depends(verify_token)):
    # Check if any deals exist for this category
    deal_count = await db.deals.count_documents({"category_id": category_id})
    if deal_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {deal_count} associated deals")
    
    result = await db.categories.delete_one({"id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted successfully"}

# Admin Deal endpoints
@api_router.get("/admin/deals", response_model=List[Deal])
async def get_admin_deals(username: str = Depends(verify_token)):
    deals = await db.deals.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for deal in deals:
        if isinstance(deal.get('created_at'), str):
            deal['created_at'] = datetime.fromisoformat(deal['created_at'])
        if isinstance(deal.get('updated_at'), str):
            deal['updated_at'] = datetime.fromisoformat(deal['updated_at'])
        
        # Get category name
        category = await db.categories.find_one({"id": deal['category_id']}, {"_id": 0})
        if category:
            deal['category_name'] = category['name']
    
    return deals

@api_router.post("/admin/deals", response_model=Deal)
async def create_deal(deal: DealCreate, username: str = Depends(verify_token)):
    # Verify category exists
    category = await db.categories.find_one({"id": deal.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Calculate discount percentage
    discount_pct = int(((deal.original_price - deal.discounted_price) / deal.original_price) * 100)
    
    # Generate ID
    count = await db.deals.count_documents({})
    deal_id = f"deal-{count + 1}"
    
    now = datetime.now(timezone.utc).isoformat()
    new_deal = {
        "id": deal_id,
        "title": deal.title,
        "description": deal.description,
        "category_id": deal.category_id,
        "image_url": deal.image_url,
        "original_price": deal.original_price,
        "discounted_price": deal.discounted_price,
        "discount_percentage": discount_pct,
        "affiliate_link": deal.affiliate_link,
        "platform": deal.platform,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.deals.insert_one(new_deal)
    new_deal['created_at'] = datetime.fromisoformat(new_deal['created_at'])
    new_deal['updated_at'] = datetime.fromisoformat(new_deal['updated_at'])
    new_deal['category_name'] = category['name']
    return Deal(**new_deal)

@api_router.put("/admin/deals/{deal_id}", response_model=Deal)
async def update_deal(deal_id: str, deal: DealUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in deal.model_dump().items() if v is not None}
    
    # Recalculate discount if prices change
    existing_deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if not existing_deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    orig_price = update_data.get('original_price', existing_deal['original_price'])
    disc_price = update_data.get('discounted_price', existing_deal['discounted_price'])
    update_data['discount_percentage'] = int(((orig_price - disc_price) / orig_price) * 100)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.deals.update_one({"id": deal_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    updated_deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
    if isinstance(updated_deal['created_at'], str):
        updated_deal['created_at'] = datetime.fromisoformat(updated_deal['created_at'])
    if isinstance(updated_deal['updated_at'], str):
        updated_deal['updated_at'] = datetime.fromisoformat(updated_deal['updated_at'])
    
    # Get category name
    category = await db.categories.find_one({"id": updated_deal['category_id']}, {"_id": 0})
    if category:
        updated_deal['category_name'] = category['name']
    
    return Deal(**updated_deal)

@api_router.delete("/admin/deals/{deal_id}")
async def delete_deal(deal_id: str, username: str = Depends(verify_token)):
    result = await db.deals.delete_one({"id": deal_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return {"message": "Deal deleted successfully"}

# Admin Settings endpoints
@api_router.get("/admin/settings", response_model=List[AffiliateSetting])
async def get_settings(username: str = Depends(verify_token)):
    settings = await db.affiliate_settings.find({}, {"_id": 0}).to_list(100)
    for setting in settings:
        if setting.get('last_fetched_at') and isinstance(setting['last_fetched_at'], str):
            setting['last_fetched_at'] = datetime.fromisoformat(setting['last_fetched_at'])
    return settings

@api_router.put("/admin/settings/{setting_id}", response_model=AffiliateSetting)
async def update_setting(setting_id: str, setting: AffiliateSettingUpdate, username: str = Depends(verify_token)):
    update_data = {k: v for k, v in setting.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.affiliate_settings.update_one({"id": setting_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    updated_setting = await db.affiliate_settings.find_one({"id": setting_id}, {"_id": 0})
    if updated_setting.get('last_fetched_at') and isinstance(updated_setting['last_fetched_at'], str):
        updated_setting['last_fetched_at'] = datetime.fromisoformat(updated_setting['last_fetched_at'])
    return AffiliateSetting(**updated_setting)

# Admin Scraper endpoints
@api_router.get("/admin/scraper/stats")
async def get_scraper_stats(username: str = Depends(verify_token)):
    """Get latest scraper run statistics"""
    try:
        # Get latest scraper run
        latest_run = await db.scraper_runs.find_one(
            {},
            {"_id": 0},
            sort=[("timestamp", -1)]
        )
        
        if not latest_run:
            return {
                "last_run": None,
                "stats": None
            }
        
        return {
            "last_run": latest_run.get('timestamp'),
            "stats": latest_run.get('stats', {})
        }
    except Exception as e:
        logger.error(f"Error fetching scraper stats: {str(e)}")
        return {"error": str(e)}

@api_router.get("/admin/scraper/history")
async def get_scraper_history(username: str = Depends(verify_token), limit: int = 10):
    """Get scraper run history"""
    try:
        runs = await db.scraper_runs.find(
            {},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit).to_list(limit)
        
        return {"runs": runs, "total": len(runs)}
    except Exception as e:
        logger.error(f"Error fetching scraper history: {str(e)}")
        return {"error": str(e)}

@api_router.post("/admin/scraper/run")
async def trigger_manual_scrape(username: str = Depends(verify_token)):
    """Manually trigger scraper"""
    try:
        logger.info("Manual scraper triggered by admin")
        # Run scraper in background
        asyncio.create_task(scraper_pipeline.run_manual_scrape())
        return {"message": "Scraper started. Check stats in a few minutes."}
    except Exception as e:
        logger.error(f"Error triggering scraper: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Analytics endpoints
@api_router.get("/admin/analytics/dashboard")
async def get_dashboard_analytics(username: str = Depends(verify_token)):
    """Get analytics for admin dashboard"""
    try:
        from datetime import timedelta
        
        # Total deals
        total_deals = await db.deals.count_documents({})
        
        # Deals added today
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        deals_today = await db.deals.count_documents({
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        # Total clicks
        total_clicks = await db.affiliate_clicks.count_documents({})
        
        # Top clicked deals
        top_deals_pipeline = [
            {"$group": {"_id": "$deal_id", "clicks": {"$sum": 1}}},
            {"$sort": {"clicks": -1}},
            {"$limit": 5}
        ]
        top_deals_cursor = db.affiliate_clicks.aggregate(top_deals_pipeline)
        top_deal_ids = []
        click_counts = {}
        async for doc in top_deals_cursor:
            top_deal_ids.append(doc['_id'])
            click_counts[doc['_id']] = doc['clicks']
        
        # Get deal details for top deals
        top_deals = []
        if top_deal_ids:
            deals_cursor = db.deals.find({"id": {"$in": top_deal_ids}}, {"_id": 0, "id": 1, "title": 1, "discount_percentage": 1})
            async for deal in deals_cursor:
                deal['clicks'] = click_counts.get(deal['id'], 0)
                top_deals.append(deal)
        
        # Scraper success rate
        recent_runs = await db.scraper_runs.find({}, {"_id": 0}).sort("timestamp", -1).limit(10).to_list(10)
        total_runs = len(recent_runs)
        successful_runs = sum(1 for run in recent_runs if run.get('stats', {}).get('processing', {}).get('inserted', 0) > 0)
        success_rate = (successful_runs / total_runs * 100) if total_runs > 0 else 0
        
        return {
            "total_deals": total_deals,
            "deals_today": deals_today,
            "total_clicks": total_clicks,
            "top_deals": top_deals,
            "scraper_success_rate": round(success_rate, 2)
        }
        
    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Deal Highlight endpoints
@api_router.get("/deals/highlights/best-today")
async def get_best_deals_today_endpoint(limit: int = 10):
    """Get best deals today by score"""
    #return await deal_highlighter.get_best_deals_today(limit)
    return []

@api_router.get("/deals/highlights/lightning")
async def get_lightning_deals_endpoint(limit: int = 10):
    """Get lightning deals (50%+ discount)"""
    #return await deal_highlighter.get_lightning_deals(limit)
    return []

@api_router.get("/deals/highlights/price-drops")
async def get_biggest_price_drops_endpoint(limit: int = 10):
    """Get biggest price drops"""
    #return await deal_highlighter.get_biggest_price_drops(limit)
    return []

@api_router.get("/deals/highlights/trending-24h")
async def get_trending_24h_endpoint(limit: int = 10):
    """Get trending deals in last 24 hours"""
    #return await deal_highlighter.get_trending_deals_24h(limit)
    return []


# Discovery page endpoints
@api_router.get("/deals/discovery/today-best-deals")
async def discovery_today_best(limit: int = 20):
    """Today's best deals - added in last 24h"""
    try:
        yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        deals = await db.deals.find(
            {"is_active": True, "created_at": {"$gte": yesterday}},
            {"_id": 0}
        ).sort("deal_score", -1).limit(limit).to_list(limit)
        
        await deal_highlighter._enrich_deals(deals)
        return deals
    except Exception as e:
        logger.error(f"Error getting today's best deals: {str(e)}")
        return []

@api_router.get("/deals/discovery/best-amazon-deals")
async def discovery_amazon(limit: int = 20):
    """Best Amazon deals"""
    #return await deal_highlighter.get_deals_by_platform("Amazon", limit)
    return []

@api_router.get("/deals/discovery/best-flipkart-deals")
async def discovery_flipkart(limit: int = 20):
    """Best Flipkart deals"""
    #return await deal_highlighter.get_deals_by_platform("Flipkart", limit)
    return []

@api_router.get("/deals/discovery/top-discounted-products")
async def discovery_top_discounted(limit: int = 20):
    """Top discounted products"""
    return []
    #return await deal_highlighter.get_top_discounted(limit)

@api_router.get("/deals/discovery/under-1000")
async def discovery_under_1000(limit: int = 20):
    """Deals under ₹1000"""
    return []
    #return await deal_highlighter.get_deals_under_price(1000, limit)

@api_router.get("/deals/discovery/under-5000")
async def discovery_under_5000(limit: int = 20):
    """Deals under ₹5000"""
    return []
    #return await deal_highlighter.get_deals_under_price(5000, limit)

# Related deals endpoint
@api_router.get("/deals/{deal_id}/related")
async def get_related_deals_endpoint(deal_id: str, limit: int = 8):
    """Get related deals for a specific deal"""
    try:
        deal = await db.deals.find_one({"id": deal_id}, {"_id": 0})
        if not deal:
            return []
        
        #return await deal_highlighter.get_related_deals(deal['category_id'], deal_id, limit)
        return []
    except Exception as e:
        logger.error(f"Error getting related deals: {str(e)}")
        return []



# Enhanced click tracking
class ClickTrack(BaseModel):
    deal_id: str
    product_url: str
    section: Optional[str] = "general"  # best-today, lightning, price-drops, trending, related, etc.
    page: Optional[str] = "home"  # home, discovery, deal-page

@api_router.post("/track/click")
async def track_affiliate_click(click: ClickTrack):
    """Track affiliate button clicks with section info"""
    try:
        click_record = {
            "deal_id": click.deal_id,
            "product_url": click.product_url,
            "section": click.section,
            "page": click.page,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await db.affiliate_clicks.insert_one(click_record)
        logger.info(f"Click tracked for deal: {click.deal_id} from {click.section}@{click.page}")
        
        return {"status": "tracked"}
        
    except Exception as e:
        logger.error(f"Error tracking click: {str(e)}")
        return {"status": "error"}

# Sitemap endpoint
@api_router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate dynamic sitemap"""
    try:
        from datetime import datetime
        
        base_url = "https://offermehelelo.onrender.com"
        
        # Start XML
        sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        
        # Homepage
        sitemap_xml += f'  <url>\n    <loc>{base_url}/</loc>\n    <priority>1.0</priority>\n    <changefreq>hourly</changefreq>\n  </url>\n'
        
        # Category pages
        categories = await db.categories.find({"is_active": True}, {"_id": 0}).to_list(100)
        for cat in categories:
            slug = cat['slug']
            sitemap_xml += f'  <url>\n    <loc>{base_url}/category/{slug}</loc>\n    <priority>0.8</priority>\n    <changefreq>daily</changefreq>\n  </url>\n'
        
        # Discovery pages
        discovery_pages = [
            'today-best-deals',
            'best-amazon-deals',
            'best-flipkart-deals',
            'top-discounted-products',
            'under-1000',
            'under-5000'
        ]
        for page in discovery_pages:
            sitemap_xml += f'  <url>\n    <loc>{base_url}/deals/{page}</loc>\n    <priority>0.9</priority>\n    <changefreq>hourly</changefreq>\n  </url>\n'
        
        # Deal pages (top 100 by score)
        deals = await db.deals.find({"is_active": True}, {"_id": 0, "id": 1, "updated_at": 1}).sort("deal_score", -1).limit(100).to_list(100)
        for deal in deals:
            deal_id = deal['id']
            lastmod = deal.get('updated_at', datetime.now(timezone.utc).isoformat())[:10]
            sitemap_xml += f'  <url>\n    <loc>{base_url}/deal/{deal_id}</loc>\n    <lastmod>{lastmod}</lastmod>\n    <priority>0.6</priority>\n    <changefreq>daily</changefreq>\n  </url>\n'
        
        sitemap_xml += '</urlset>'
        
        from fastapi.responses import Response
        return Response(content=sitemap_xml, media_type="application/xml")
        
    except Exception as e:
        logger.error(f"Error generating sitemap: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Upload endpoint
@api_router.post("/admin/deals/bulk-upload")
async def bulk_upload_deals(file: UploadFile, username: str = Depends(verify_token)):
    """Bulk upload deals from CSV or XLSX"""
    import pandas as pd
    import io
    
    try:
        contents = await file.read()
        
        # Parse file based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and XLSX files are supported")
        
        required_fields = ['title', 'affiliate_link', 'platform', 'category', 'original_price', 'discounted_price']
        missing_fields = [field for field in required_fields if field not in df.columns]
        
        if missing_fields:
            raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing_fields)}")
        
        results = {
            'total': len(df),
            'inserted': 0,
            'skipped': 0,
            'errors': []
        }
        
        for index, row in df.iterrows():
            try:
                # Validation
                if pd.isna(row['title']) or not row['title']:
                    results['errors'].append(f"Row {index+2}: Missing title")
                    results['skipped'] += 1
                    continue
                
                if pd.isna(row['affiliate_link']) or not row['affiliate_link']:
                    results['errors'].append(f"Row {index+2}: Missing affiliate_link")
                    results['skipped'] += 1
                    continue
                
                original_price = float(row['original_price'])
                discounted_price = float(row['discounted_price'])
                discount_pct = int(((original_price - discounted_price) / original_price) * 100)
                
                if discount_pct < 30:
                    results['errors'].append(f"Row {index+2}: Discount {discount_pct}% < 30%")
                    results['skipped'] += 1
                    continue
                
                # Check duplicate
                existing = await db.deals.find_one({"affiliate_link": row['affiliate_link']})
                if existing:
                    results['skipped'] += 1
                    continue
                
                # Find category
                category = await db.categories.find_one({"name": row['category']})
                if not category:
                    category = await db.categories.find_one({"slug": create_slug(row['category'])})
                
                if not category:
                    results['errors'].append(f"Row {index+2}: Category '{row['category']}' not found")
                    results['skipped'] += 1
                    continue
                
                # Generate ID
                count = await db.deals.count_documents({})
                deal_id = f"deal-{count + 1}"
                
                now = datetime.now(timezone.utc).isoformat()
                
                deal_doc = {
                    "id": deal_id,
                    "title": str(row['title']),
                    "description": str(row.get('description', '')) if not pd.isna(row.get('description')) else None,
                    "category_id": category['id'],
                    "image_url": str(row.get('image_url', '')) if not pd.isna(row.get('image_url')) else None,
                    "original_price": original_price,
                    "discounted_price": discounted_price,
                    "discount_percentage": discount_pct,
                    "deal_score": float(discount_pct * 0.6),  # Basic score
                    "price_drop_percentage": 0.0,
                    "has_price_dropped": False,
                    "affiliate_link": str(row['affiliate_link']),
                    "product_url": str(row['affiliate_link']),
                    "platform": str(row['platform']),
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now
                }
                
                await db.deals.insert_one(deal_doc)
                
                # Record price history
                await db.price_history.insert_one({
                    "product_url": str(row['affiliate_link']),
                    "price": discounted_price,
                    "original_price": original_price,
                    "timestamp": now
                })
                
                results['inserted'] += 1
                
            except Exception as e:
                results['errors'].append(f"Row {index+2}: {str(e)}")
                results['skipped'] += 1
        
        return results
        
    except Exception as e:
        logging.error(f"Bulk upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Delete endpoint
@api_router.post("/admin/deals/bulk-delete")
async def bulk_delete_deals(request: BulkDeleteRequest, username: str = Depends(verify_token)):
    """Bulk delete deals by IDs"""
    try:
        result = await db.deals.delete_many({"id": {"$in": request.deal_ids}})
        return {
            "deleted": result.deleted_count,
            "requested": len(request.deal_ids)
        }
    except Exception as e:
        logging.error(f"Bulk delete failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Platform Management endpoints
@api_router.get("/platforms")
async def get_platforms(active_only: bool = False):
    """Get all platforms"""
    query = {"is_active": True} if active_only else {}
    platforms = await db.platforms.find(query, {"_id": 0}).to_list(100)
    return platforms

@api_router.get("/admin/platforms", response_model=List[Platform])
async def get_admin_platforms(username: str = Depends(verify_token)):
    """Get all platforms for admin"""
    platforms = await db.platforms.find({}, {"_id": 0}).to_list(100)
    return platforms

@api_router.post("/admin/platforms", response_model=Platform)
async def create_platform(platform: PlatformCreate, username: str = Depends(verify_token)):
    """Create new platform"""
    count = await db.platforms.count_documents({})
    platform_id = f"platform-{count + 1}"
    
    platform_doc = {
        "id": platform_id,
        "name": platform.name,
        "image_url": platform.image_url,
        "affiliate_link": platform.affiliate_link,
        "offer_percentage": platform.offer_percentage or 0,
        "is_active": True
    }
    
    await db.platforms.insert_one(platform_doc)
    return Platform(**platform_doc)

@api_router.put("/admin/platforms/{platform_id}", response_model=Platform)
async def update_platform(platform_id: str, platform: PlatformUpdate, username: str = Depends(verify_token)):
    """Update platform"""
    update_data = {k: v for k, v in platform.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.platforms.update_one({"id": platform_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    updated_platform = await db.platforms.find_one({"id": platform_id}, {"_id": 0})
    return Platform(**updated_platform)

@api_router.delete("/admin/platforms/{platform_id}")
async def delete_platform(platform_id: str, username: str = Depends(verify_token)):
    """Delete platform"""
    result = await db.platforms.delete_one({"id": platform_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Platform not found")
    
    return {"message": "Platform deleted successfully"}

# Subcategory endpoints
@api_router.get("/subcategories")
async def get_subcategories(category_id: Optional[str] = None):
    """Get subcategories"""
    query = {"is_active": True}
    if category_id:
        query["category_id"] = category_id
    
    subcategories = await db.subcategories.find(query, {"_id": 0}).to_list(100)
    return subcategories

@api_router.post("/admin/subcategories", response_model=Subcategory)
async def create_subcategory(subcategory: SubcategoryCreate, username: str = Depends(verify_token)):
    """Create subcategory"""
    count = await db.subcategories.count_documents({})
    subcat_id = f"subcat-{count + 1}"
    
    subcat_doc = {
        "id": subcat_id,
        "category_id": subcategory.category_id,
        "name": subcategory.name,
        "slug": create_slug(subcategory.name),
        "is_active": True
    }
    
    await db.subcategories.insert_one(subcat_doc)
    return Subcategory(**subcat_doc)

# Suggestions endpoints
@api_router.post("/suggestions")
async def create_suggestion(suggestion: SuggestionCreate):
    """Create new suggestion from contact form"""
    count = await db.suggestions.count_documents({})
    suggestion_id = f"sugg-{count + 1}"
    
    suggestion_doc = {
        "id": suggestion_id,
        "name": suggestion.name,
        "email": suggestion.email,
        "message": suggestion.message,
        "suggestion_type": suggestion.suggestion_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending"
    }
    
    await db.suggestions.insert_one(suggestion_doc)
    return {"message": "Thank you! We'll review your suggestion."}

@api_router.get("/admin/suggestions", response_model=List[Suggestion])
async def get_suggestions(username: str = Depends(verify_token)):
    """Get all suggestions"""
    suggestions = await db.suggestions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for sugg in suggestions:
        if isinstance(sugg.get('created_at'), str):
            sugg['created_at'] = datetime.fromisoformat(sugg['created_at'])
    
    return suggestions

@api_router.put("/admin/suggestions/{suggestion_id}")
async def update_suggestion_status(suggestion_id: str, new_status: str, username: str = Depends(verify_token)):
    """Update suggestion status"""
    result = await db.suggestions.update_one(
        {"id": suggestion_id},
        {"$set": {"status": new_status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    return {"message": "Status updated"}

# Scraper Settings endpoints
@api_router.get("/admin/scraper-settings")
async def get_scraper_settings(username: str = Depends(verify_token)):
    """Get scraper settings"""
    settings = await db.scraper_settings.find_one({}, {"_id": 0})
    
    if not settings:
        # Initialize with defaults
        default_settings = {
            "scraper_enabled": True,
            "scraper_interval": "hourly"
        }
        await db.scraper_settings.insert_one(default_settings)
        return {"scraper_enabled": True, "scraper_interval": "hourly"}
    
    return settings

@api_router.put("/admin/scraper-settings")
async def update_scraper_settings(settings: ScraperSettings, username: str = Depends(verify_token)):
    """Update scraper settings"""
    await db.scraper_settings.update_one(
        {},
        {"$set": settings.model_dump()},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

# Browse Links endpoints
@api_router.get("/browse-links")
async def get_browse_links(category: Optional[str] = None, subcategory: Optional[str] = None):
    """Get browse links with optional filters"""
    query = {"is_active": True}
    
    if category:
        query["category_id"] = category
    
    if subcategory:
        query["subcategory"] = subcategory
    
    links = await db.browse_links.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Enrich with platform logos
    for link in links:
        platform = await db.platforms.find_one({"name": link.get("platform")}, {"_id": 0})
        if platform:
            link["platform_logo"] = platform.get("image_url")
        if isinstance(link.get("created_at"), str):
            link["created_at"] = datetime.fromisoformat(link["created_at"])
    
    return links

@api_router.get("/admin/browse-links")
async def get_admin_browse_links(username: str = Depends(verify_token)):
    """Get all browse links for admin"""
    links = await db.browse_links.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for link in links:
        # Enrich with platform logo
        platform = await db.platforms.find_one({"name": link.get("platform")}, {"_id": 0})
        if platform:
            link["platform_logo"] = platform.get("image_url")
        if isinstance(link.get("created_at"), str):
            link["created_at"] = datetime.fromisoformat(link["created_at"])
    
    return links

@api_router.post("/admin/browse-links", response_model=BrowseLink)
async def create_browse_link(link: BrowseLinkCreate, username: str = Depends(verify_token)):
    """Create a new browse link"""
    count = await db.browse_links.count_documents({})
    link_id = f"blink-{count + 1}"
    
    now = datetime.now(timezone.utc)
    
    link_doc = {
        "id": link_id,
        "title": link.title,
        "platform": link.platform,
        "affiliate_link": link.affiliate_link,
        "category_id": link.category_id,
        "subcategory": link.subcategory,
        "offer_text": link.offer_text,
        "is_active": True,
        "created_at": now.isoformat()
    }
    
    await db.browse_links.insert_one(link_doc)
    
    # Get platform logo
    platform = await db.platforms.find_one({"name": link.platform}, {"_id": 0})
    link_doc["platform_logo"] = platform.get("image_url") if platform else None
    link_doc["created_at"] = now
    
    return BrowseLink(**link_doc)

@api_router.put("/admin/browse-links/{link_id}", response_model=BrowseLink)
async def update_browse_link(link_id: str, link: BrowseLinkUpdate, username: str = Depends(verify_token)):
    """Update a browse link"""
    update_data = {k: v for k, v in link.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.browse_links.update_one({"id": link_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Browse link not found")
    
    updated_link = await db.browse_links.find_one({"id": link_id}, {"_id": 0})
    
    # Get platform logo
    platform = await db.platforms.find_one({"name": updated_link.get("platform")}, {"_id": 0})
    updated_link["platform_logo"] = platform.get("image_url") if platform else None
    
    if isinstance(updated_link.get("created_at"), str):
        updated_link["created_at"] = datetime.fromisoformat(updated_link["created_at"])
    
    return BrowseLink(**updated_link)

@api_router.delete("/admin/browse-links/{link_id}")
async def delete_browse_link(link_id: str, username: str = Depends(verify_token)):
    """Delete a browse link"""
    result = await db.browse_links.delete_one({"id": link_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Browse link not found")
    
    return {"message": "Browse link deleted successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Scheduler setup
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    await init_admin()
    await init_categories()
    await init_affiliate_settings()
    
    # Schedule hourly deal fetching
    #scheduler.add_job(fetch_deals_from_platforms, 'interval', hours=1, id='fetch_deals')
    #scheduler.start()
    logger.info("Scheduler started - deals will be fetched every hour")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    client.close()
