import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Flame, Zap, TrendingDown, TrendingUp, Moon, Sun, Filter, MessageSquare, ArrowUp, ArrowLeft, Home, Search, Heart, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SEO from '@/components/SEO';
import DealSection from '@/components/DealSection';
import DealCard from '@/components/DealCard';
import StickyDealButton from '@/components/StickyDealButton';
import PlatformTiles from '@/components/PlatformTiles';
import BrowseLinkTiles from '@/components/BrowseLinkTiles';
import DealSkeleton from '@/components/DealSkeleton';
import LoadingMessages from '@/components/LoadingMessages';
import { toast } from 'sonner';

// SIMPLE FRONTEND CACHE (Protects the Backend)
const cache = new Map();

const HomeEnhanced = () => {
  const { theme, toggleTheme } = useTheme();
  
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [minDiscount, setMinDiscount] = useState(0);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  
  const [bestDealsToday, setBestDealsToday] = useState([]);
  const [lightningDeals, setLightningDeals] = useState([]);
  const [priceDrops, setPriceDrops] = useState([]);
  const [trendingDeals, setTrendingDeals] = useState([]);
  const [topDeal, setTopDeal] = useState(null);
  const [highlightsLoading, setHighlightsLoading] = useState(true);
  const [activePlatforms, setActivePlatforms] = useState([]);

  const [categoryDeals, setCategoryDeals] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [gridLoading, setGridLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const observer = useRef();
  const fetchIdRef = useRef(0);

  const handleScrollMask = (e) => {
    const { scrollLeft, clientWidth, scrollWidth } = e.currentTarget;
    if (scrollLeft + clientWidth >= scrollWidth - 5) {
      e.currentTarget.classList.remove('fade-edges');
    } else {
      e.currentTarget.classList.add('fade-edges');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchHighlights();
    fetchActivePlatforms();
    
    const timer = setTimeout(() => setMinTimePassed(true), 800);
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    
    return () => { clearTimeout(timer); window.removeEventListener('scroll', handleScroll); };
  }, []);

  useEffect(() => {
    setPage(0);
    setCategoryDeals([]);
    setHasMore(true);
    fetchCategoryDeals(0, true);
  }, [selectedCategory, selectedSubcategory, minDiscount, selectedPlatform]);

  useEffect(() => {
    if (page > 0) fetchCategoryDeals(page, false);
  }, [page]);

  useEffect(() => {
    if (selectedCategory !== 'all') fetchSubcategories(selectedCategory);
    else { setSubcategories([]); setSelectedSubcategory('all'); }
  }, [selectedCategory]);

  const lastDealElementRef = useCallback(node => {
    if (gridLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    });
    if (node) observer.current.observe(node);
  }, [gridLoading, isFetchingMore, hasMore]);

  const fetchCategories = async () => {
    if (cache.has('categories')) return setCategories(cache.get('categories'));
    try {
      const response = await axios.get(`${API}/categories`);
      cache.set('categories', response.data);
      setCategories(response.data);
    } catch (error) {}
  };
  
  const fetchActivePlatforms = async () => {
    if (cache.has('platforms')) return setActivePlatforms(cache.get('platforms'));
    try {
      const response = await axios.get(`${API}/platforms?active_only=true&has_content=true`);
      cache.set('platforms', response.data);
      setActivePlatforms(response.data);
    } catch (error) {}
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await axios.get(`${API}/subcategories?category_id=${categoryId}`);
      setSubcategories(response.data);
    } catch (error) { setSubcategories([]); }
  };

  const fetchHighlights = async () => {
    try {
      setHighlightsLoading(true);
      const [bestRes, lightningRes, priceDropRes, trendingRes] = await Promise.all([
        axios.get(`${API}/deals/highlights/best-today?limit=10`),
        axios.get(`${API}/deals/highlights/lightning?limit=10`),
        axios.get(`${API}/deals/highlights/price-drops?limit=10`),
        axios.get(`${API}/deals/highlights/trending-24h?limit=10`),
      ]);
      setBestDealsToday(bestRes.data);
      setLightningDeals(lightningRes.data);
      setPriceDrops(priceDropRes.data);
      setTrendingDeals(trendingRes.data);
      if (bestRes.data.length > 0) setTopDeal(bestRes.data[0]);
    } catch (error) {} finally { setHighlightsLoading(false); }
  };

  const fetchCategoryDeals = async (pageNum, isNewFilter = false) => {
    const currentFetchId = ++fetchIdRef.current;
    
    try {
      if (isNewFilter) setGridLoading(true);
      else setIsFetchingMore(true);

      let url = `${API}/deals?sort_by=score&skip=${pageNum * 12}&limit=12`;
      if (selectedCategory !== 'all') url += `&category_id=${selectedCategory}`;
      if (selectedSubcategory !== 'all') url += `&subcategory=${selectedSubcategory}`;
      if (minDiscount > 0) url += `&min_discount=${minDiscount}`;
      if (selectedPlatform) url += `&platform=${selectedPlatform}`;
      
      // Cache check for first pages
      const cacheKey = `deals_${url}`;
      if (isNewFilter && cache.has(cacheKey)) {
         if (currentFetchId !== fetchIdRef.current) return;
         setCategoryDeals(cache.get(cacheKey));
         setGridLoading(false);
         return;
      }

      const response = await axios.get(url);
      if (currentFetchId !== fetchIdRef.current) return;
      
      const newData = response.data;
      if (isNewFilter) cache.set(cacheKey, newData);
      
      if (newData.length < 12) setHasMore(false);
      setCategoryDeals(prev => isNewFilter ? newData : [...prev, ...newData]);
    } catch (error) {} finally {
      if (currentFetchId === fetchIdRef.current) {
        setGridLoading(false);
        setIsFetchingMore(false);
      }
    }
  };

  const handleCategoryChange = (catId) => { setSelectedCategory(catId); setSelectedSubcategory('all'); };
  const handlePlatformClick = (platformName) => { setSelectedPlatform(platformName); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const trackClick = async (dealId, productUrl, section, page) => { try { await axios.post(`${API}/track/click`, { deal_id: dealId, product_url: productUrl, section, page }); } catch (error) {} };
  const showEmptyState = !gridLoading && minTimePassed && categoryDeals.length === 0;

  // FMCG Intent Mapper Helper
  const getCategoryPill = (name) => {
    const nameStr = name.toLowerCase();
    if (nameStr.includes('electronic') || nameStr.includes('laptop') || nameStr.includes('mobile')) return `⚡ ${name}`;
    if (nameStr.includes('fashion') || nameStr.includes('wearable') || nameStr.includes('shoe')) return `👗 ${name}`;
    if (nameStr.includes('home') || nameStr.includes('kitchen')) return `🏠 ${name}`;
    if (nameStr.includes('personal') || nameStr.includes('health')) return `✨ ${name}`;
    return `🔥 ${name}`;
  };

  return (
    <div className="min-h-screen noise-bg pb-safe md:pb-0">
      <SEO title="Offer Me He Lelo! - Best Deals" description="Find the hottest deals. Updated hourly!" url="/" />

      {/* AIRY HEADER (Phase 2) */}
      <div className="sticky top-0 z-50 w-full flex flex-col shadow-sm">
        <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight cursor-pointer" onClick={() => { setSelectedPlatform(null); window.scrollTo({top:0, behavior:'smooth'}); }}>
                OFFER ME HE LELO!
              </h1>
              <div className="flex items-center gap-2 sm:gap-3">
                {/* This is now visible on mobile & desktop */}
                <a href="/contact" className="hover:text-accent flex items-center gap-1 sm:gap-1.5 font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors mr-1 sm:mr-2">
                  <MessageSquare className="h-4 w-4" /> 
                  <span className="hidden min-[380px]:inline">Talk To Us</span>
                </a>
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-8 w-8 sm:h-10 sm:w-10">
                  {theme === 'dark' ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = '/admin/login')} className="uppercase text-xs font-bold tracking-widest rounded-full hidden sm:flex">
                  Login
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Quick Links (Contact button removed from here) */}
        <div className="bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/60 border-b border-t border-border/50">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3">
            <div className="flex items-center gap-4 md:gap-6 overflow-x-auto scrollbar-hide whitespace-nowrap fade-edges transition-all" onScroll={handleScrollMask}>
              <a href="/deals/today-best-deals" className="font-bold text-xs uppercase tracking-wider hover:text-accent transition-colors flex-shrink-0">Today's Best</a>
              {activePlatforms.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handlePlatformClick(p.name)} 
                  className={`font-bold text-xs uppercase tracking-wider transition-colors flex-shrink-0 ${selectedPlatform === p.name ? 'text-accent' : 'hover:text-accent'}`}
                >
                  {p.name} Deals
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        
        {!selectedPlatform ? (
          <>
            <DealSection title="🔥 Best Deals Today" icon={Flame} deals={bestDealsToday} loading={highlightsLoading} section="best-today" onTrackClick={trackClick} />
            <BrowseLinkTiles showTitle={true} maxLinks={12} scrollable={true} />
            <DealSection title="⚡ Lightning Deals" icon={Zap} deals={lightningDeals} loading={highlightsLoading} section="lightning" onTrackClick={trackClick} />
            <DealSection title="📉 Biggest Price Drops" icon={TrendingDown} deals={priceDrops} loading={highlightsLoading} section="price-drops" onTrackClick={trackClick} />
            <DealSection title="📈 Trending Deals" icon={TrendingUp} deals={trendingDeals} loading={highlightsLoading} section="trending-24h" onTrackClick={trackClick} />
            <PlatformTiles />
          </>
        ) : (
          <div className="py-6 mb-4 border-b">
            <Button variant="outline" onClick={() => setSelectedPlatform(null)} className="mb-6 rounded-full font-bold uppercase tracking-wider text-xs">
              <ArrowLeft className="h-4 w-4 mr-2" /> Go back
            </Button>
            <h2 className="text-4xl md:text-5xl font-black uppercase mb-2">{selectedPlatform} Storefront</h2>
            <p className="text-muted-foreground">Showing exclusive offers, store links, and deals for {selectedPlatform}</p>
          </div>
        )}

        <section className="py-8 mt-4 border-t">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
            {selectedPlatform ? `Filter ${selectedPlatform} By Category` : 'Browse By Category'}
          </h2>

          {/* CATEGORY PILLS */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide fade-edges transition-all" onScroll={handleScrollMask}>
            <button 
              onClick={() => handleCategoryChange('all')} 
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest whitespace-nowrap border-2 rounded-full transition-all active:scale-95 ${selectedCategory === 'all' ? 'border-accent bg-accent text-black' : 'border-border/50 bg-background hover:border-accent/50 text-foreground'}`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button 
                key={cat.id} 
                onClick={() => handleCategoryChange(cat.id)} 
                className={`px-5 py-2.5 text-xs font-black uppercase tracking-widest whitespace-nowrap border-2 rounded-full transition-all active:scale-95 ${selectedCategory === cat.id ? 'border-accent bg-accent text-black' : 'border-border/50 bg-background hover:border-accent/50 text-foreground'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 mb-8">
            <Select value={minDiscount.toString()} onValueChange={(val) => setMinDiscount(Number(val))}>
              <SelectTrigger className="w-[180px] rounded-full border-2 border-border/50 font-bold text-xs uppercase tracking-wider h-10"><SelectValue placeholder="Min Discount" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Discounts</SelectItem>
                <SelectItem value="30">30% or more</SelectItem>
                <SelectItem value="50">50% or more</SelectItem>
                <SelectItem value="75">75% or more</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <BrowseLinkTiles category={selectedCategory !== 'all' ? selectedCategory : null} subcategory={selectedSubcategory !== 'all' ? selectedSubcategory : null} platform={selectedPlatform} showTitle={true} maxLinks={selectedPlatform ? 100 : (selectedCategory !== 'all' ? 100 : 12)} scrollable={!selectedPlatform && selectedCategory === 'all'} />

          {gridLoading ? (
            <><LoadingMessages /><DealSkeleton /></>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {categoryDeals.map((deal, index) => {
                  const isLast = categoryDeals.length === index + 1;
                  return (
                    <div ref={isLast ? lastDealElementRef : null} key={`${deal.id}-${index}`}>
                      <DealCard deal={deal} section="category" onTrackClick={trackClick} />
                    </div>
                  );
                })}
              </div>
              {isFetchingMore && <div className="py-8 text-center animate-pulse"><span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Loading more deals...</span></div>}
            </>
          )}

          {showEmptyState && (
             <div className="text-center py-24 animate-in fade-in duration-500">
               <div className="text-4xl mb-4">🔍</div>
               <h3 className="text-2xl font-bold mb-2">Inventory Cleared!</h3>
               <p className="text-muted-foreground">No deals matched this intent. Adjust your filters or check back later.</p>
             </div>
          )}
        </section>
      </main>

      <footer className="border-t bg-card mt-12 pb-24 md:pb-12">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 text-center text-sm text-muted-foreground">
          <p className="font-bold">OFFER ME HE LELO!</p>
          <p className="mt-2">Smart scoring • Real-time tracking • Premium curation</p>
        </div>
      </footer>

      <StickyDealButton deal={topDeal} onTrackClick={trackClick} />

      {/* MOBILE STICKY BOTTOM NAV (Phase 2) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-background/95 backdrop-blur border-t z-[60] flex justify-around items-center px-2 py-3 pb-safe">
        
        <button onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="flex flex-col items-center gap-1 text-accent">
          <Home className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
        </button>

        {/* UPDATED: Discover button now triggers a toast */}
        <button onClick={() => toast.info("🛠️ We are working on this feature! Stay tuned.")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <Search className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Discover</span>
        </button>

        {/* UPDATED: Hot button now triggers a toast */}
        <button onClick={() => toast.info("🛠️ We are working on this feature! Stay tuned.")} className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors relative">
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full animate-pulse"></div>
          <Heart className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Hot</span>
        </button>

        <a href="/admin/login" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
          <User className="h-5 w-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Login</span>
        </a>

      </div>

      {showScrollTop && (
        <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-24 right-4 md:bottom-8 md:right-8 rounded-full shadow-2xl z-50 h-12 w-12 p-0 bg-accent hover:bg-accent/90">
          <ArrowUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </div>
  );
};

export default HomeEnhanced;