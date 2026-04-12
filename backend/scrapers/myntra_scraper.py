import asyncio
import re
import requests
import json
from typing import List, Dict
from playwright.async_api import async_playwright
from playwright_stealth import stealth_async # IMPORT THE STEALTH CLOAK

EARNKARO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWQxNDg1MzQ5N2JkYmJmNWE1MjdhMjciLCJlYXJua2FybyI6IjQ5OTg1NzciLCJpYXQiOjE3NzU4MjYwMjF9.NKbG3laGl-6M9g9Zl2mEGKkoDZ7BhiSE4eO0qdqBUBM"
EARNKARO_API_URL = "https://ekaro-api.affiliaters.in/api/converter/public"

def convert_to_earnkaro(product_url: str) -> str:
    """Passes the raw Myntra URL to EarnKaro and prints exactly what happens."""
    try:
        headers = {
            'Authorization': f'Bearer {EARNKARO_TOKEN}',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' # Added this because some APIs block python's default requests agent
        }
        payload = json.dumps({"deal": product_url, "convert_option": "convert_only"})
        
        response = requests.post(EARNKARO_API_URL, headers=headers, data=payload, timeout=10)
        
        # # === LOUD DEBUGGING ===
        # print(f"\n--- EARNKARO API CHECK ---")
        # print(f"URL Sent: {product_url}")
        # print(f"Status Code: {response.status_code}")
        # print(f"Raw Response: {response.text}")
        # print(f"--------------------------\n")
        # # ======================

        res_data = response.json()
        
        # --- THE FIX: EarnKaro returns the link directly as a string inside "data" ---
        if res_data.get("success") == 1 and isinstance(res_data.get("data"), str):
            return res_data["data"]
        # -----------------------------------------------------------------------------
        
        if "converted_link" in res_data: return res_data["converted_link"]
        if "data" in res_data and isinstance(res_data["data"], list) and len(res_data["data"]) > 0: return res_data["data"][0].get("converted_link", product_url)
        if "data" in res_data and isinstance(res_data["data"], dict): return res_data["data"].get("converted_link", product_url)
        
        return product_url
     
    except Exception as e:
        print(f"❌ EarnKaro API Crash: {e}")
        return product_url

async def scrape_myntra_target(target_url: str, category_id: str, dry_run: bool = True, start_page: int = 1, end_page: int = 1) -> List[Dict]:
    scraped_deals = []
    seen_titles = set()
    
    async with async_playwright() as p:
        # === THE PERSISTENT HUMAN PROFILE ===
        # Instead of a fake new browser, we create a permanent folder to store your cookies and trust score.
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./myntra_trusted_profile", # This creates a folder right next to your script
            channel="chrome",
            headless=False,
            ignore_default_args=["--enable-automation"],
            args=[
                "--disable-blink-features=AutomationControlled",
                "--start-maximized"
            ],
            viewport=None, # Lets the window maximize naturally
            extra_http_headers={
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.google.com/"
            }
        )
        
        page = context.pages[0] # Grab the default tab that opens
        # ====================================

        async def route_intercept(route):
            if route.request.resource_type in ["media"]: # Relaxing the adblocker even further to look normal
                await route.abort()
            else:
                await route.continue_()
                
        await page.route("**/*", route_intercept)

        try:
            print("Bypassing firewall: Priming session cookies at homepage...")
            await page.goto("https://www.myntra.com/", timeout=60000, wait_until="domcontentloaded")
            await page.mouse.move(100, 100)
            await asyncio.sleep(1)
            await page.mouse.move(500, 300)
            await asyncio.sleep(2)

            # === PAGINATION JUMP LOGIC ===
            actual_url = target_url
            if start_page > 1:
                # Determine if URL already has query parameters
                separator = "&" if "?" in target_url else "?"
                actual_url = f"{target_url}{separator}p={start_page}"

            print(f"Session established. Navigating to start page: {actual_url}...")
            await page.goto(actual_url, timeout=60000, wait_until="domcontentloaded", referer="https://www.myntra.com/")
            # =============================
            
            # --- THE HUMAN REFLEX ---
            page_text = await page.content()
            page_text_lower = page_text.lower()
            
            if "system break down" in page_text_lower or "access denied" in page_text_lower or "verify" in page_text_lower or "robot" in page_text_lower:
                print("Caught Myntra's firewall! Pretending to be human and reloading...")
                await asyncio.sleep(4) 
                await page.reload(wait_until="domcontentloaded")
                await asyncio.sleep(3)
            # ------------------------

            # Calculate how many times to loop
            pages_to_scrape = (end_page - start_page) + 1

            for current_loop in range(pages_to_scrape):
                current_page_num = start_page + current_loop
                print(f"Processing Target Page {current_page_num}...")
                
                # 1. WAIT FOR THE GRID FIRST (Increased timeout to 25s)
                try:
                    print("Waiting for product grid to load...")
                    await page.wait_for_selector(".results-base", timeout=25000)
                except Exception as e:
                    print("❌ Could not find the product grid! Saving debug screenshot...")
                    await page.screenshot(path="debug_myntra_error.png")
                    break

                # 2. THEN SCROLL DOWN TO TRIGGER LAZY IMAGES
                print("Grid found. Scrolling to load images...")
                for _ in range(6):
                    await page.evaluate("window.scrollBy(0, 1500);")
                    await asyncio.sleep(0.8)
                
                await page.wait_for_timeout(2000)
                
                product_elements = await page.query_selector_all(".results-base > li")
                print(f"Found {len(product_elements)} total slots. Extracting valid deals...")


                for element in product_elements:
                    title, discounted_price, original_price, image_url, raw_url = None, None, None, None, None
                    rating, review_count = None, None
                    
                    try:
                        # 1. Title Extraction
                        title_el = await element.query_selector(".product-productMetaInfo .product-product")
                        if title_el: title = (await title_el.inner_text()).strip()
                        
                        if title:
                            clean_title = title.lower()
                            if clean_title in seen_titles: continue 
                            seen_titles.add(clean_title)

                        # 3. URL Extraction
                        link_el = await element.query_selector("a")
                        if link_el:
                            href = await link_el.get_attribute("href")
                            raw_url = f"https://www.myntra.com/{href}" if not href.startswith("http") else href

                        # 4. Trigger Image Lazy Loading (FOOLPROOF FALLBACK)
                        await element.scroll_into_view_if_needed()
                        await page.wait_for_timeout(200) 
                        
                        img_el = await element.query_selector("picture source")
                        if img_el:
                            srcset = await img_el.get_attribute("srcset")
                            if srcset:
                                # Safe split that handles both commas and spaces
                                image_url = srcset.split(",")[0].split(" ")[0].strip()
                        
                        # If picture source fails, grab the standard image tag
                        if not image_url or image_url.endswith("f_webp"):
                            fallback_img = await element.query_selector("img")
                            if fallback_img:
                                image_url = await fallback_img.get_attribute("src")

                        # 5. Price Extraction
                        disc_price_el = await element.query_selector(".product-discountedPrice")
                        if disc_price_el: discounted_price = int(re.sub(r"[^\d]", "", await disc_price_el.inner_text()))
                            
                        orig_price_el = await element.query_selector(".product-strike")
                        if orig_price_el: original_price = int(re.sub(r"[^\d]", "", await orig_price_el.inner_text()))

                        # --- THE 0% ASSASSIN (NOW WITH X-RAY VISION) ---
                        if not original_price or not discounted_price or discounted_price >= original_price:
                            print(f"🥷 0% Assassin Killed: {title[:15]}... (No Discount)")
                            continue
                            
                        # Calculate exact percentage now
                        discount_pct = int(((original_price - discounted_price) / original_price) * 100)
                        if discount_pct < 5: 
                            print(f"🥷 0% Assassin Killed: {title[:15]}... (Only {discount_pct}% off)")
                            continue
                        # -----------------------------------------------

                        # 6. Rating Extraction
                        rating_el = await element.query_selector(".product-ratingsContainer span")
                        if rating_el: rating = float(await rating_el.inner_text())
                            
                        count_el = await element.query_selector(".product-ratingsCount")
                        if count_el:
                            c_text = (await count_el.inner_text()).replace("|", "").strip().lower()
                            review_count = int(float(c_text.replace("k", "")) * 1000) if "k" in c_text else int(re.sub(r"[^\d]", "", c_text))

                        # ==========================================
                        # NOISY VALIDATION GATE
                        # ==========================================
                        if not title or not original_price or not discounted_price or not image_url or not raw_url:
                            print(f"⚠️ Dropped: {title[:15]}... | OrigPrice: {bool(original_price)} | DiscPrice: {bool(discounted_price)} | Img: {bool(image_url)} | URL: {bool(raw_url)}")
                            continue

                        # WE ONLY SAVE RAW DATA HERE. EARNKARO HAPPENS CONCURRENTLY AT THE END.
                        deal_data = {
                            "title": title,
                            "raw_url": raw_url, 
                            "platform": "Myntra",
                            "category": category_id,
                            "original_price": original_price,
                            "discounted_price": discounted_price,
                            "discount_percentage": discount_pct,
                            "image_url": image_url,
                            "rating": rating,
                            "review_count": review_count,
                            "is_active": True
                        }
                        
                        scraped_deals.append(deal_data)

                    except Exception as e:
                        continue
                
                # Check for "Next Page" button at the bottom of your extraction loop
                next_btn = await page.query_selector(".pagination-next")
                if next_btn and current_loop < pages_to_scrape - 1:
                    print("Moving to next page...")
                    await next_btn.click()
                    await asyncio.sleep(4)
                else:
                    break

        except Exception as e:
            print(f"Critical error: {e}")
        finally:
            if 'context' in locals():
                await context.close()
            
    # --- CONCURRENT EARNKARO CONVERSION ---
    if scraped_deals:
        print(f"\n⚡ Firing {len(scraped_deals)} Myntra links to EarnKaro concurrently...")
        
        async def fetch_ek_link(deal):
            # Run the blocking API call in a background thread so it doesn't freeze the scraper
            ek_link = await asyncio.to_thread(convert_to_earnkaro, deal["raw_url"])
            deal["affiliate_link"] = ek_link
            del deal["raw_url"] # Clean up the dictionary for the database
            return deal
            
        # Execute ALL API calls at the exact same time
        scraped_deals = await asyncio.gather(*(fetch_ek_link(d) for d in scraped_deals))
        print("✅ All Myntra links converted instantly!")
    # --------------------------------------

    if dry_run:
        print(json.dumps(scraped_deals, indent=2))
        print(f"Total Strictly Validated Unique Deals: {len(scraped_deals)}")
    
    return scraped_deals


async def scrape_ajio_target(target_url: str, category_id: str, dry_run: bool = True, start_page: int = 1, end_page: int = 1) -> List[Dict]:
    """Dedicated scraper module for Ajio's DOM structure."""
    scraped_deals = []
    seen_titles = set()
    
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./ajio_trusted_profile", 
            channel="chrome",
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
            viewport=None
        )
        page = context.pages[0]

        try:
            print(f"Priming Ajio session and navigating directly to target: {target_url}")
            # Navigate EXACTLY ONCE. No ?page= parameters.
            await page.goto(target_url, timeout=60000, wait_until="domcontentloaded")
            await asyncio.sleep(3)

            try:
                await page.wait_for_selector(".loader", state="hidden", timeout=15000)
            except:
                pass

            # Calculate how many scroll cycles to perform based on the requested pages
            scroll_batches = (end_page - start_page) + 1

            for current_batch in range(scroll_batches):
                print(f"Executing Deep Scroll Batch {current_batch + 1} of {scroll_batches}...")
                
                # 1. The Fast Jumps
                for _ in range(5):
                    await page.evaluate("window.scrollBy(0, 500);")
                    await asyncio.sleep(0.1) 
                
                # 2. The Deep Wait 
                await asyncio.sleep(1.5) 
                
                # 3. The Slow Crawl 
                for _ in range(20):
                    await page.evaluate("window.scrollBy(0, 300);")
                    await asyncio.sleep(1.8)
                    
            # Return to Top before querying the DOM
            await page.evaluate("window.scrollTo(0, 0);")
            await asyncio.sleep(2) 

            # Find all products loaded in the infinite scroll
            product_elements = await page.query_selector_all("[role*='gridcell']")
            print(f"Found {len(product_elements)} Ajio products. Extracting...")

            for element in product_elements:
                title, discounted_price, original_price, image_url, raw_url = None, None, None, None, None
                rating, review_count = None, None
                
                try:
                    await element.scroll_into_view_if_needed()
                    await asyncio.sleep(0.05) 

                    # 1. URL & The "God String" 
                    link_el = await element.query_selector("[class*='rilrtl-products-list__link']")
                    if link_el:
                        href = await link_el.get_attribute("href")
                        
                        # Added javascript check to avoid empty clicks
                        if href and ("banner" in href.lower() or "javascript" in href.lower()): 
                            continue 
                            
                        # THE URL CONCATENATION FIX
                        if href:
                            raw_url = href if href.startswith("http") else f"https://www.ajio.com/{href.lstrip('/')}"
                        
                        aria_label = await link_el.get_attribute("aria-label")
                        
                        if aria_label:
                            title_match = aria_label.split('.')
                            if title_match:
                                title = title_match[0].strip()
                                
                            disc_match = re.search(r"(?:Current price|Price)[^\d]*₹([\d,]+)", aria_label, re.IGNORECASE)
                            if disc_match:
                                discounted_price = int(disc_match.group(1).replace(",", ""))
                                
                            mrp_match = re.search(r"MRP ₹([\d,]+)", aria_label, re.IGNORECASE)
                            if mrp_match:
                                original_price = int(mrp_match.group(1).replace(",", ""))

                    # Deduping
                    if title:
                        clean_title = title.strip().lower()
                        if clean_title in seen_titles: continue
                        seen_titles.add(clean_title)

                    # 2. Image
                    img_el = await element.query_selector("img")
                    if img_el:
                        image_url = await img_el.get_attribute("src")
                        if not image_url or 'data:image' in image_url or 'placeholder' in image_url.lower() or '.gif' in image_url.lower():
                            image_url = await img_el.get_attribute("data-src")

                    # 3. DOM Prices Fallback 
                    if not discounted_price:
                        disc_price_el = await element.query_selector(".price, strong")
                        if disc_price_el: 
                            txt = await disc_price_el.inner_text()
                            if txt.strip(): discounted_price = int(re.sub(r"[^\d]", "", txt))
                        
                    if not original_price:
                        orig_price_el = await element.query_selector(".orginal-price, .original-price, .strike, del")
                        if orig_price_el: 
                            txt = await orig_price_el.inner_text()
                            if txt.strip(): original_price = int(re.sub(r"[^\d]", "", txt))
                            
                    if discounted_price and not original_price:
                        original_price = discounted_price

                    # --- THE 0% ASSASSIN ---
                    if not original_price or not discounted_price or discounted_price >= original_price:
                        continue
                        
                    discount_pct = int(((original_price - discounted_price) / original_price) * 100)
                    if discount_pct < 5: 
                        continue

                    # 4. Rating & Reviews
                    rating_el = await element.query_selector("[class*='_2mae-']")
                    if rating_el:
                        rating_aria = await rating_el.get_attribute("aria-label")
                        if rating_aria:
                            r_match = re.search(r"([\d\.]+)", rating_aria)
                            if r_match: rating = float(r_match.group(1))
                            
                            rev_match = re.search(r"and\s+([\d\.]+)(K)?\s*reviews", rating_aria, re.IGNORECASE)
                            if rev_match:
                                base_num = float(rev_match.group(1))
                                review_count = int(base_num * 1000) if rev_match.group(2) else int(base_num)

                    # VALIDATION GATE
                    if not title or not original_price or not discounted_price or not image_url or not raw_url:
                        continue

                    deal_data = {
                        "title": title.strip(),
                        "raw_url": raw_url, 
                        "platform": "Ajio",
                        "category": category_id,
                        "original_price": original_price,
                        "discounted_price": discounted_price,
                        "discount_percentage": discount_pct,
                        "image_url": image_url,
                        "rating": rating,
                        "review_count": review_count,
                        "is_active": True
                    }
                    scraped_deals.append(deal_data)

                except Exception as e:
                    continue

        except Exception as e:
            print(f"Ajio Critical error: {e}")
        finally:
            if 'context' in locals():
                await context.close()
    
    # CONCURRENT EARNKARO CONVERSION
    if scraped_deals:
        print(f"\n⚡ Firing {len(scraped_deals)} links to EarnKaro concurrently...")
        semaphore = asyncio.Semaphore(5) # Throttled to prevent API blocks
        
        async def fetch_ek_link(deal):
            async with semaphore:
                ek_link = await asyncio.to_thread(convert_to_earnkaro, deal["raw_url"])
                deal["affiliate_link"] = ek_link
                del deal["raw_url"] 
                return deal
            
        scraped_deals = await asyncio.gather(*(fetch_ek_link(d) for d in scraped_deals))
        print("✅ All links converted!")

    if dry_run:
        print(f"Total Validated Ajio Deals: {len(scraped_deals)}")
    
    return scraped_deals


if __name__ == "__main__":
    import asyncio
    import requests
    
    API_BASE = "https://offermehelelo.onrender.com/api"

    print("🚀 FETCHING TARGETS FROM DATABASE 🚀")
    try:
        # Call home to get the live targets you added in the Admin console
        response = requests.get(f"{API_BASE}/scraper/targets", timeout=15)
        response.raise_for_status()
        TARGETS = response.json()
        print(f"✅ Successfully loaded {len(TARGETS)} active targets from Render!")
    except Exception as e:
        print(f"❌ FATAL ERROR: Could not fetch targets from database. Is Render awake?\nError: {e}")
        exit(1)

    print("\n🚀 INITIALIZING MASTER SCRAPER PIPELINE 🚀")
    all_scraped_deals = []

    for target in TARGETS:
        print(f"\n==========================================")
        print(f"🎯 Target: {target.get('name', 'Unnamed')} | {target['url']}")
        print(f"==========================================")
        
        # Route to the correct scraper module
        if target["platform"] == "Myntra":
            deals = asyncio.run(scrape_myntra_target(
                target_url=target["url"], 
                category_id=target["category_id"], 
                dry_run=False, 
                start_page=1, 
                end_page=2
            ))
            all_scraped_deals.extend(deals)
            
        elif target["platform"] == "Ajio":
            deals = asyncio.run(scrape_ajio_target(
                target_url=target["url"], 
                category_id=target["category_id"], 
                dry_run=False, 
                start_page=1, 
                end_page=2
            ))
            all_scraped_deals.extend(deals)

    # TRANSMIT TO SERVER
    if all_scraped_deals:
        print(f"\n🚀 Transmitting {len(all_scraped_deals)} TOTAL deals to database...")
        
        chunk_size = 50 
        for i in range(0, len(all_scraped_deals), chunk_size):
            chunk = all_scraped_deals[i:i + chunk_size]
            batch_num = (i // chunk_size) + 1
            print(f"➡️ Sending Batch {batch_num} ({len(chunk)} deals)...")
            
            try:
                intake_response = requests.post(f"{API_BASE}/scraper/intake", json=chunk, timeout=60)
                print(f"✅ Server Response: {intake_response.json()}")
            except Exception as e:
                print(f"❌ Failed to transmit Batch {batch_num}: {e}")
    else:
        print("\n⚠️ No deals passed validation across any targets today.")