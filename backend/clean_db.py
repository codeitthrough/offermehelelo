import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('.env') # Make sure this matches where your .env file is

async def clean():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # This specifically targets ONLY deals that are missing an ID field
    result = await db.deals.delete_many({"id": {"$exists": False}})
    print(f"🧹 Successfully deleted {result.deleted_count} corrupted deals!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(clean())