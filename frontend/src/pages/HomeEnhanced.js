import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Flame, Zap, TrendingDown, TrendingUp, Moon, Sun, Filter, MessageSquare, ArrowUp } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SEO from '@/components/SEO';
import DealSection from '@/components/DealSection';
import DealCard from '@/components/DealCard';
import StickyDealButton from '@/components/StickyDealButton';
import PlatformTiles from '@/components/PlatformTiles';
import BrowseLinkTiles from '@/components/BrowseLinkTiles';
import DealSkeleton from '@/components/DealSkeleton';
import LoadingMessages from '@/components/LoadingMessages';

const HomeEnhanced = () => {
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [minDiscount, setMinDiscount] = useState(0);
  
  // Highlight sections
  const [bestDealsToday, setBestDealsToday] = useState([]);
  const [lightningDeals, setLightningDeals] = useState([]);
  const [priceDrops, setPriceDrops] = useState([]);
  const [trendingDeals, setTrendingDeals] = useState([]);
  const [topDeal, setTopDeal] = useState(null);
  const [highlightsLoading, setHighlightsLoading] = useState(true);

  // Dynamic Platforms for Quick Links
  const [activePlatforms, setActivePlatforms] = useState([]);

  // Infinite Scroll & Grid States
  const [categoryDeals, setCategoryDeals] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [gridLoading, setGridLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  
  // Back to Top State
  const [showScrollTop, setShowScrollTop] = useState(false);

  const observer = useRef();

  useEffect(() => {
    fetchCategories();
    fetchHighlights();
    fetchActivePlatforms();
    
    const timer = setTimeout(() => setMinTimePassed(true), 800);
    
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setPage(0);
    setCategoryDeals([]);
    setHasMore(true);
    fetchCategoryDeals(0, true);
  }, [selectedCategory, selectedSubcategory, minDiscount]);

  useEffect(() => {
    if (page > 0) fetchCategoryDeals(page, false);
  }, [page]);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      fetchSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
      setSelectedSubcategory('all');
    }
  }, [selectedCategory]);

  const lastDealElementRef = useCallback(node => {
    if (gridLoading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(prevPage => prevPage + 1);
    });
    
    if (node) observer.current.observe(node);
  }, [gridLoading, isFetchingMore, hasMore]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {}
  };
  
  const fetchActivePlatforms = async () => {
    try {
      const response = await axios.get(`${API}/platforms?active_only=true`);
      setActivePlatforms(response.data);
    } catch (error) {}
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await axios.get(`${API}/subcategories?category_id=${categoryId}`);
      setSubcategories(response.data);
    } catch (error) {
      setSubcategories([]);
    }
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
    } catch (error) {} finally {
      setHighlightsLoading(false);
    }
  };

  const fetchCategoryDeals = async (pageNum, isNewFilter = false) => {
    try {
      if (isNewFilter) setGridLoading(true);
      else setIsFetchingMore(true);

      let url = `${API}/deals?sort_by=score&skip=${pageNum * 12}&limit=12`;
      if (selectedCategory !== 'all') url += `&category_id=${selectedCategory}`;
      if (selectedSubcategory !== 'all') url += `&subcategory=${selectedSubcategory}`;
      if (minDiscount > 0) url += `&min_discount=${minDiscount}`;
      
      const response = await axios.get(url);
      const newData = response.data;
      
      if (newData.length < 12) setHasMore(false);
      setCategoryDeals(prev => isNewFilter ? newData : [...prev, ...newData]);
    } catch (error) {} finally {
      setGridLoading(false);
      setIsFetchingMore(false);
    }
  };

  const trackClick = async (dealId, productUrl, section, page) => {
    try {
      await axios.post(`${API}/track/click`, { deal_id: dealId, product_url: productUrl, section, page });
    } catch (error) {}
  };

  const showEmptyState = !gridLoading && minTimePassed && categoryDeals.length === 0;

  return (
    <div className="min-h-screen noise-bg">
      <SEO
        title="Offer Me He Lelo! - Best Deals & Discounts | Save Up to 80%"
        description="Find the hottest deals from Amazon, Flipkart and more. Save big on electronics, fashion, home appliances. Updated hourly with smart deal scoring!"
        url="/"
      />

      {/* Main Header */}
      <header className="sticky-header glassmorphism border-b">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
              OFFER ME HE LELO!
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = '/admin/login')} className="uppercase text-xs font-semibold tracking-widest">
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-Header: Quick Links (Fix for infinite scroll hiding footer links) */}
      <div className="bg-secondary/30 border-b">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            <span className="font-bold uppercase tracking-wider text-xs text-muted-foreground">Quick Links:</span>
            <a href="/deals/today-best-deals" className="font-semibold hover:text-accent transition-colors">Today's Best</a>
            {activePlatforms.slice(0, 5).map(p => (
              <a key={p.id} href={p.affiliate_link} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-accent transition-colors">
                {p.name} Deals
              </a>
            ))}
          </div>
          <a href="/contact" className="hover:text-accent flex items-center gap-1 font-bold text-xs uppercase tracking-wider transition-colors">
            <MessageSquare className="h-4 w-4" /> Talk To Us
          </a>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Discover Amazing Deals</h2>
          <p className="text-lg text-muted-foreground">Smart deal scoring • Hourly updates • Up to 80% off</p>
        </div>

        <DealSection title="🔥 Best Deals Today" icon={Flame} deals={bestDealsToday} loading={highlightsLoading} section="best-today" onTrackClick={trackClick} />
        
        {/* Top Browse Links: Scrollable, max 12 */}
        <BrowseLinkTiles showTitle={true} maxLinks={12} scrollable={true} />
        
        <DealSection title="⚡ Lightning Deals" icon={Zap} deals={lightningDeals} loading={highlightsLoading} section="lightning" onTrackClick={trackClick} />
        <DealSection title="📉 Biggest Price Drops" icon={TrendingDown} deals={priceDrops} loading={highlightsLoading} section="price-drops" onTrackClick={trackClick} />
        <DealSection title="📈 Trending Deals" icon={TrendingUp} deals={trendingDeals} loading={highlightsLoading} section="trending-24h" onTrackClick={trackClick} />

        {/* Wraps natively */}
        <PlatformTiles />

        <section className="py-8 mt-8 border-t">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Browse By Category</h2>

          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
            <button onClick={() => handleCategoryChange('all')} className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest whitespace-nowrap border rounded-sm transition-colors ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary'}`}>All Categories</button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest whitespace-nowrap border rounded-sm transition-colors ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary'}`}>{cat.name}</button>
            ))}
          </div>

          {subcategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              <button onClick={() => setSelectedSubcategory('all')} className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap border rounded-sm transition-colors ${selectedSubcategory === 'all' ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-secondary/70'}`}>All</button>
              {subcategories.map((subcat) => (
                <button key={subcat.id} onClick={() => setSelectedSubcategory(subcat.slug)} className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap border rounded-sm transition-colors ${selectedSubcategory === subcat.slug ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-secondary/70'}`}>{subcat.name}</button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Filter:</span>
            </div>
            <Select value={minDiscount.toString()} onValueChange={(val) => setMinDiscount(Number(val))}>
              <SelectTrigger className="w-[200px] rounded-sm"><SelectValue placeholder="Min Discount" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Discounts</SelectItem>
                <SelectItem value="30">30% or more</SelectItem>
                <SelectItem value="40">40% or more</SelectItem>
                <SelectItem value="50">50% or more</SelectItem>
                <SelectItem value="60">60% or more</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bottom Browse Links: Wrapping grid, unlimited */}
          {selectedCategory !== 'all' && (
            <BrowseLinkTiles category={selectedCategory} subcategory={selectedSubcategory !== 'all' ? selectedSubcategory : null} showTitle={true} maxLinks={100} scrollable={false} />
          )}

          {gridLoading ? (
            <>
              <LoadingMessages />
              <DealSkeleton />
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryDeals.map((deal, index) => {
                  const isLast = categoryDeals.length === index + 1;
                  return (
                    <div ref={isLast ? lastDealElementRef : null} key={`${deal.id}-${index}`}>
                      <DealCard deal={deal} section="category" onTrackClick={trackClick} />
                    </div>
                  );
                })}
              </div>
              {isFetchingMore && (
                <div className="py-8 text-center animate-pulse">
                  <span className="text-sm font-bold tracking-widest uppercase text-muted-foreground">Fetching more deals...</span>
                </div>
              )}
            </>
          )}

          {showEmptyState && (
             <div className="text-center py-20 animate-in fade-in duration-500">
               <h3 className="text-2xl font-bold mb-2">No deals found right now.</h3>
               <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
             </div>
          )}
        </section>
      </main>

      {/* Kept minimal footer since vital links moved to top */}
      <footer className="border-t bg-card mt-20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 text-center text-sm text-muted-foreground">
          <p className="font-bold">OFFER ME HE LELO!</p>
          <p className="mt-2">Deals updated hourly • Smart scoring • Best prices guaranteed</p>
        </div>
      </footer>

      <StickyDealButton deal={topDeal} onTrackClick={trackClick} />

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <Button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 md:bottom-8 right-8 rounded-full shadow-2xl z-50 h-12 w-12 p-0 bg-accent hover:bg-accent/90"
        >
          <ArrowUp className="h-6 w-6 text-white" />
        </Button>
      )}
    </div>
  );
};

export default HomeEnhanced;