from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
    affiliate_link: str
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

# Deal fetcher (placeholder for actual API integration)
async def fetch_deals_from_platforms():
    logging.info("Running scheduled deal fetch...")
    settings = await db.affiliate_settings.find({"is_active": True}, {"_id": 0}).to_list(100)
    
    for setting in settings:
        logging.info(f"Fetching deals from {setting['platform']}...")
        # Placeholder: In production, integrate with actual affiliate APIs
        # For now, this is where you'd call Amazon/Flipkart/EarnKaro APIs
        await db.affiliate_settings.update_one(
            {"id": setting['id']},
            {"$set": {"last_fetched_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    logging.info("Deal fetch completed")

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
    min_discount: Optional[int] = None,
    platform: Optional[str] = None
):
    query = {"is_active": True}
    if category_id:
        query["category_id"] = category_id
    if min_discount:
        query["discount_percentage"] = {"$gte": min_discount}
    if platform:
        query["platform"] = platform
    
    deals = await db.deals.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
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
    scheduler.add_job(fetch_deals_from_platforms, 'interval', hours=1, id='fetch_deals')
    scheduler.start()
    logger.info("Scheduler started - deals will be fetched every hour")

@app.on_event("shutdown")
async def shutdown_event():
    scheduler.shutdown()
    client.close()
