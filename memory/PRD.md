# Offer Me He Lelo! - Affiliate Deals Website PRD

## Original Problem Statement
Build a fully automated affiliate deals website with the following core features:
- Homepage displaying affiliate deals with category tabs
- Admin panel with dynamic category management
- Automated deal fetching from Amazon, Flipkart via EarnKaro
- Deal filtering by discount percentage (>=30%)
- Automatic category assignment based on product keywords
- Duplicate deal prevention
- Hourly automation pipeline with APScheduler

## User Personas
1. **End Users**: Bargain hunters looking for best deals across e-commerce platforms
2. **Admin**: Site administrator managing deals, categories, platforms, and site settings

## Core Requirements

### Completed Features (March 15, 2026)

#### Frontend
- [x] Homepage with deal highlight sections (Best Deals Today, Lightning Deals, Price Drops, Trending)
- [x] Browse Links "Shop by Store" section on homepage and category pages
- [x] Category tabs and discount filter
- [x] Subcategory filter buttons (appears when a category is selected)
- [x] Popular Platforms section with platform tiles
- [x] Admin Panel with 9 navigation items:
  - Dashboard with analytics
  - Categories management with subcategory creation
  - Deals management with checkbox bulk delete
  - Browse Links management (macro affiliate links)
  - Bulk Upload (CSV/XLSX)
  - Platforms management
  - Scraper Settings (enable/disable, interval)
  - Suggestions viewer
  - Affiliate Settings
- [x] Contact page ("Talk To Us") with form submission
- [x] SEO-optimized discovery pages (/deals/under-1000, etc.)
- [x] Deal badges (Limited Time, Hot Deal, etc.)
- [x] Dark/Light theme toggle

#### Backend
- [x] RESTful API with FastAPI
- [x] MongoDB database
- [x] Admin authentication (JWT)
- [x] Deal CRUD operations
- [x] Category CRUD operations
- [x] Platform CRUD operations
- [x] Browse Links CRUD operations (macro affiliate links)
- [x] Subcategory endpoints
- [x] Suggestions/Contact form endpoint
- [x] Scraper settings endpoints
- [x] Bulk upload/delete endpoints
- [x] Deal scoring algorithm
- [x] Price history tracking
- [x] Affiliate click tracking
- [x] Dynamic sitemap generation
- [x] APScheduler for hourly automation

#### Automation (Note: Scrapers Non-functional)
- [x] Scraper pipeline architecture
- [x] Category mapping service
- [x] Deal processor service
- [x] EarnKaro link converter (requires credentials)
- [!] Amazon scraper (blocked by anti-bot)
- [!] Flipkart scraper (blocked by anti-bot)

## P0/P1/P2 Features Remaining

### P0 - Critical (None)
All critical features completed.

### P1 - High Priority
- [ ] Investigate official affiliate APIs (Amazon Product Advertising API, Flipkart Affiliate API) as reliable alternative to web scraping

### P2 - Nice to Have
- [ ] A/B testing for UI elements
- [ ] Refactor server.py into multiple route files
- [ ] Add email notifications for price drops
- [ ] User accounts and wishlist functionality

## Technical Architecture

### Stack
- **Frontend**: React, Tailwind CSS, Shadcn/UI, react-helmet-async
- **Backend**: FastAPI, Pydantic, Motor (MongoDB)
- **Database**: MongoDB
- **Automation**: APScheduler, Playwright (for scrapers)

### Directory Structure
```
/app/
├── backend/
│   ├── automation/scraper_pipeline.py
│   ├── scrapers/ (amazon, flipkart, earnkaro)
│   ├── services/ (deal_scorer, deal_highlighter, category_mapper)
│   ├── server.py (main API)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/ (AdminLayout, PlatformTiles, DealCard, etc.)
│   │   ├── pages/ (Home, Admin*, Contact, Discovery)
│   │   └── App.js
│   └── package.json
└── memory/PRD.md
```

### Key Database Collections
- `deals`: Product deals with pricing, scores, and metadata
- `categories`: Deal categories
- `subcategories`: Sub-categories linked to categories
- `platforms`: Affiliate platforms (Amazon, Flipkart, etc.)
- `browse_links`: Macro affiliate links with category/subcategory assignment
- `suggestions`: User feedback from contact form
- `affiliate_clicks`: Click tracking for analytics
- `price_history`: Historical price data
- `scraper_settings`: Automation configuration
- `scraper_runs`: Scraper execution logs

## Admin Credentials
- Username: `admin`
- Password: `admin123`

## Known Issues
1. **Web scrapers are non-functional**: Amazon and Flipkart scrapers fail due to anti-bot measures. Use bulk upload feature for manual deal management.

## Next Session Tasks
1. Explore official affiliate APIs for reliable deal fetching
2. Add subcategory management in admin panel
3. Consider refactoring server.py for better maintainability
