import logging
import asyncio
from datetime import datetime, timezone
#from scrapers.amazon_scraper import AmazonScraper
#from scrapers.flipkart_scraper import FlipkartScraper
#from scrapers.earnkaro_converter import EarnKaroConverter
from services.category_mapper import CategoryMapper
from services.deal_processor import DealProcessor
from services.deal_cleaner import DealCleaner

logger = logging.getLogger(__name__)

class ScraperPipeline:
    def __init__(self, db):
        self.db = db
        self.category_mapper = CategoryMapper()
        self.deal_processor = DealProcessor(db)
        self.deal_cleaner = DealCleaner(db)

    async def save_scraper_run(self, stats: dict):
        """Save scraper run statistics to database"""
        try:
            run_doc = {
                "run_id": f"run-{int(datetime.now(timezone.utc).timestamp())}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "stats": stats
            }
            await self.db.scraper_runs.insert_one(run_doc)
            logger.info(f"Saved scraper run: {run_doc['run_id']}")
        except Exception as e:
            logger.error(f"Error saving scraper run: {str(e)}")

    async def run_full_pipeline(self) -> dict:
        """Run complete scraping and processing pipeline"""
        logger.info("="*50)
        logger.info("Starting scraper pipeline...")
        logger.info("="*50)
        
        pipeline_stats = {
            'start_time': datetime.now(timezone.utc).isoformat(),
            'amazon': {'scraped': 0, 'errors': []},
            'flipkart': {'scraped': 0, 'errors': []},
            'processing': {},
            'cleanup': {},
            'end_time': None,
            'duration_seconds': 0
        }
        
        start_time = datetime.now(timezone.utc)
        earnkaro = None
        
        try:
            # Initialize EarnKaro converter (will be reused)
            earnkaro = EarnKaroConverter()
            await earnkaro.initialize()
            
            # Step 1: Scrape Amazon deals
            logger.info("Step 1: Scraping Amazon deals...")
            try:
                amazon_scraper = AmazonScraper()
                amazon_deals = await amazon_scraper.scrape_deals(max_deals=30)
                pipeline_stats['amazon']['scraped'] = len(amazon_deals)
                logger.info(f"Amazon scraping complete: {len(amazon_deals)} deals")
            except Exception as e:
                logger.error(f"Amazon scraping failed: {str(e)}")
                pipeline_stats['amazon']['errors'].append(str(e))
                amazon_deals = []
            
            # Step 2: Scrape Flipkart deals
            logger.info("Step 2: Scraping Flipkart deals...")
            try:
                flipkart_scraper = FlipkartScraper()
                flipkart_deals = await flipkart_scraper.scrape_deals(max_deals=30)
                pipeline_stats['flipkart']['scraped'] = len(flipkart_deals)
                logger.info(f"Flipkart scraping complete: {len(flipkart_deals)} deals")
            except Exception as e:
                logger.error(f"Flipkart scraping failed: {str(e)}")
                pipeline_stats['flipkart']['errors'].append(str(e))
                flipkart_deals = []
            
            # Step 3: Combine all deals
            all_deals = amazon_deals + flipkart_deals
            logger.info(f"Total deals scraped: {len(all_deals)}")
            
            # Step 4: Process deals (validate, filter, categorize, convert links, save)
            logger.info("Step 3: Processing deals...")
            processing_stats = await self.deal_processor.process_deals(
                all_deals,
                self.category_mapper,
                earnkaro
            )
            pipeline_stats['processing'] = processing_stats
            
            # Step 5: Cleanup expired deals
            logger.info("Step 4: Cleaning up expired deals...")
            cleanup_stats = await self.deal_cleaner.cleanup_expired_deals()
            pipeline_stats['cleanup'] = cleanup_stats
            
            # Calculate duration
            end_time = datetime.now(timezone.utc)
            pipeline_stats['end_time'] = end_time.isoformat()
            pipeline_stats['duration_seconds'] = (end_time - start_time).total_seconds()
            
            # Save run statistics
            await self.save_scraper_run(pipeline_stats)
            
            logger.info("="*50)
            logger.info("Pipeline complete!")
            logger.info(f"Duration: {pipeline_stats['duration_seconds']:.2f}s")
            logger.info(f"Total scraped: {len(all_deals)}")
            logger.info(f"Validated: {processing_stats.get('validated', 0)}")
            logger.info(f"Duplicates: {processing_stats.get('duplicates', 0)}")
            logger.info(f"Inserted: {processing_stats.get('inserted', 0)}")
            logger.info(f"Failed: {processing_stats.get('failed', 0)}")
            logger.info(f"Cleaned up: {cleanup_stats.get('total_removed', 0)}")
            logger.info("="*50)
            
            return pipeline_stats
            
        except Exception as e:
            logger.error(f"Pipeline failed: {str(e)}")
            pipeline_stats['error'] = str(e)
            return pipeline_stats
        finally:
            # Close EarnKaro browser
            if earnkaro:
                await earnkaro.close()

    async def run_manual_scrape(self) -> dict:
        """Run scraper manually (for testing or admin trigger)"""
        return await self.run_full_pipeline()
