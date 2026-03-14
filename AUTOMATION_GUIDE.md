# Deal Automation Layer - Complete Guide

## Overview
The automation layer automatically scrapes deals from Amazon and Flipkart, filters them, converts to affiliate links via EarnKaro, assigns categories, and maintains the database by removing expired deals.

## Architecture

### 1. **Scrapers** (`/app/backend/scrapers/`)
- **amazon_scraper.py** - Scrapes deals from Amazon's deal pages
- **flipkart_scraper.py** - Scrapes deals from Flipkart's offer pages  
- **earnkaro_converter.py** - Converts product URLs to EarnKaro affiliate links using browser automation

### 2. **Services** (`/app/backend/services/`)
- **category_mapper.py** - Assigns categories based on product title keywords
- **deal_processor.py** - Validates, filters, and saves deals to database
- **deal_cleaner.py** - Removes expired deals (discount < 20% or invalid URLs)

### 3. **Automation Pipeline** (`/app/backend/automation/`)
- **scraper_pipeline.py** - Orchestrates the complete pipeline

## Features Implemented

### ✅ Deal Scraping
- **Amazon Sources:**
  - https://www.amazon.in/gp/goldbox
  - https://www.amazon.in/deals
  
- **Flipkart Sources:**
  - https://www.flipkart.com/offers-list
  - https://www.flipkart.com/offers-store

- **Extracted Data:**
  - Product title
  - Product price (discounted)
  - Original price
  - Discount percentage
  - Product image URL
  - Product URL

### ✅ Deal Filtering
**Only allows deals where:**
- Discount ≥ 30%
- Price exists
- Product title exists (minimum 10 characters)

### ✅ EarnKaro Link Conversion
- Uses browser automation (Playwright) to convert product URLs
- Handles login if credentials are provided
- Falls back to original URL if conversion fails
- Environment variables: `EARNKARO_EMAIL`, `EARNKARO_PASSWORD`

### ✅ Duplicate Prevention
- Checks if `product_url` already exists in database
- Skips insertion if duplicate found
- Logs duplicate detection

### ✅ Automatic Category Assignment
**Category mapping based on keywords:**

```python
{
    'Mobile Accessories': ['smartphone', 'mobile', 'charger', 'cable', 'powerbank'],
    'Laptops & Computers': ['laptop', 'notebook', 'monitor', 'keyboard', 'mouse'],
    'Audio': ['earbuds', 'earphones', 'headphones', 'speaker'],
    'Wearables': ['smartwatch', 'fitness band', 'watch'],
    'Home & Kitchen': ['mixer', 'blender', 'air fryer', 'vacuum', 'purifier'],
    'Gaming': ['controller', 'console', 'gaming mouse', 'gaming keyboard']
}
```

**Defaults to 'Electronics' if no match.**

### ✅ Database Insertion
Saves valid deals with:
- `id` (auto-generated)
- `title`
- `category_id`
- `image_url`
- `original_price`
- `discounted_price`
- `discount_percentage`
- `affiliate_link` (EarnKaro converted)
- `platform` (Amazon/Flipkart)
- `is_active` (true)
- `created_at`
- `updated_at`

### ✅ Expired Deal Cleanup
**Removes deals where:**
- Discount drops below 20%
- Product page no longer exists (optional check)

### ✅ Scheduler Integration
- **Frequency:** Runs every hour
- **Technology:** APScheduler (AsyncIOScheduler)
- **Auto-starts:** On server startup
- **Logs:** All operations logged with timestamps

### ✅ Admin Dashboard Metrics
**Shows:**
- Last scraper run timestamp
- Total deals scraped (Amazon + Flipkart)
- Deals inserted
- Duplicates skipped
- Failed deals
- Duration (seconds)
- Cleanup statistics

### ✅ Logging System
**Comprehensive logging for:**
- Scraper initialization and closure
- Deal extraction and parsing
- Validation failures
- Duplicate detection
- Category assignment
- Link conversion (success/failure)
- Database insertions
- Cleanup operations
- Pipeline errors

**Log levels:**
- `INFO` - Normal operations
- `WARNING` - Missing credentials, skipped deals
- `ERROR` - Scraping failures, database errors
- `DEBUG` - Detailed parsing information

## How to Use

### 1. Configure EarnKaro Credentials (Optional)
Add to `/app/backend/.env`:
```bash
EARNKARO_EMAIL=your-email@example.com
EARNKARO_PASSWORD=your-password
```

**Note:** If not provided, original product URLs will be used.

### 2. Manual Scraper Trigger
From Admin Dashboard:
1. Login to Admin Panel
2. Go to Dashboard
3. Click "RUN NOW" button in Scraper Status section
4. Check back in 2-3 minutes for results

### 3. API Endpoints

**Get Scraper Statistics:**
```bash
GET /api/admin/scraper/stats
Authorization: Bearer <token>
```

**Get Scraper History:**
```bash
GET /api/admin/scraper/history?limit=10
Authorization: Bearer <token>
```

**Trigger Manual Scrape:**
```bash
POST /api/admin/scraper/run
Authorization: Bearer <token>
```

### 4. View Logs
```bash
# Backend logs
tail -f /var/log/supervisor/backend.err.log

# Filter scraper logs
tail -f /var/log/supervisor/backend.err.log | grep -E "(Scraping|Pipeline|Deal)"
```

## Pipeline Flow

```
1. INITIALIZATION
   ├── Initialize EarnKaro converter
   └── Start browser automation

2. SCRAPING PHASE
   ├── Scrape Amazon deals (max 30)
   └── Scrape Flipkart deals (max 30)

3. PROCESSING PHASE
   For each deal:
   ├── Validate deal (discount ≥ 30%, required fields)
   ├── Check for duplicates
   ├── Assign category (keyword matching)
   ├── Convert to EarnKaro affiliate link
   └── Save to database

4. CLEANUP PHASE
   ├── Find deals with discount < 20%
   └── Mark as inactive

5. STATISTICS
   ├── Save run statistics
   ├── Log summary
   └── Update affiliate settings timestamps
```

## Statistics Tracked

```json
{
  "start_time": "ISO timestamp",
  "amazon": {
    "scraped": 25,
    "errors": []
  },
  "flipkart": {
    "scraped": 18,
    "errors": []
  },
  "processing": {
    "total_scraped": 43,
    "validated": 35,
    "duplicates": 10,
    "inserted": 20,
    "failed": 5
  },
  "cleanup": {
    "checked": 100,
    "removed_low_discount": 5,
    "removed_invalid_url": 0,
    "total_removed": 5
  },
  "end_time": "ISO timestamp",
  "duration_seconds": 45.2
}
```

## Troubleshooting

### Issue: No deals scraped
**Solution:**
- Check if websites are accessible
- Verify browser automation is working
- Check logs for specific errors
- Amazon/Flipkart may have changed their HTML structure

### Issue: EarnKaro conversion failing
**Solution:**
- Verify credentials in `.env`
- Check if EarnKaro website is accessible
- Falls back to original URL automatically

### Issue: All deals marked as duplicates
**Solution:**
- Check database - deals may already exist
- Clear old deals or run cleanup manually

### Issue: Wrong categories assigned
**Solution:**
- Update keyword mappings in `/app/backend/services/category_mapper.py`
- Add more specific keywords

## Adding New Deal Sources

### Example: Add Myntra
1. Create `/app/backend/scrapers/myntra_scraper.py`:
```python
class MyntraScraper:
    def __init__(self):
        self.base_urls = ["https://www.myntra.com/offers"]
    
    async def scrape_deals(self, max_deals=50):
        # Similar to amazon_scraper.py
        pass
```

2. Update `/app/backend/automation/scraper_pipeline.py`:
```python
from scrapers.myntra_scraper import MyntraScraper

# In run_full_pipeline():
myntra_scraper = MyntraScraper()
myntra_deals = await myntra_scraper.scrape_deals(max_deals=30)
all_deals = amazon_deals + flipkart_deals + myntra_deals
```

## Performance Optimization

- **Scraping:** Limited to 30 deals per source to avoid timeouts
- **Browser Reuse:** EarnKaro browser initialized once, reused for all conversions
- **Rate Limiting:** 1-second delay between link conversions
- **Timeout:** 30 seconds per page load
- **Cleanup:** Runs as part of main pipeline (not separate job)

## Security Considerations

- **Credentials:** Stored in environment variables only
- **Browser Automation:** Runs in headless mode
- **API Authentication:** All admin endpoints require JWT token
- **Input Validation:** All scraped data validated before insertion
- **SQL Injection:** Using MongoDB with parameterized queries

## Future Enhancements

- [ ] Add more deal sources (Meesho, Shopsy, etc.)
- [ ] Implement deal expiry tracking with timestamps
- [ ] Add price drop alerts
- [ ] Implement deal quality scoring
- [ ] Add image CDN integration
- [ ] Implement deal similarity detection (prevent near-duplicates)
- [ ] Add webhook notifications for new high-discount deals
- [ ] Implement A/B testing for different scraping strategies

## Support

For issues or questions:
1. Check logs: `/var/log/supervisor/backend.err.log`
2. Review scraper statistics in Admin Dashboard
3. Test individual components manually
4. Check MongoDB for data integrity
