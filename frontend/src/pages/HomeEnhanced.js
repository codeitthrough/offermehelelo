import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Flame, Zap, TrendingDown, TrendingUp, Moon, Sun, Filter, MessageSquare, ArrowUp, ArrowLeft, ArrowRight, Home, Search, Heart, User, Send, MessageCircle, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
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
  const [selectedSubcategory, setSelectedSubcategory] = useState([]); // Empty array means 'all'
  const [minDiscount, setMinDiscount] = useState(0);
  const [priceRange, setPriceRange] = useState([0, 5000]); // Controls the visual movement
  const [activePriceRange, setActivePriceRange] = useState([0, 5000]); // Triggers the actual backend fetch
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [banners, setBanners] = useState([]);
  const bannerScrollRef = useRef(null);
  const [showTgPopup, setShowTgPopup] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('score');
  const [draftCategory, setDraftCategory] = useState('all');
  const [draftSubcategory, setDraftSubcategory] = useState([]);
  const [draftSortBy, setDraftSortBy] = useState('score');
  const [draftMinDiscount, setDraftMinDiscount] = useState(0);
  const [draftPriceRange, setDraftPriceRange] = useState([0, 5000]);

  const toggleSubcategory = (slug, isDraft = false) => {
    const current = isDraft ? draftSubcategory : selectedSubcategory;
    const setFunc = isDraft ? setDraftSubcategory : setSelectedSubcategory;
    
    if (slug === 'all') {
      setFunc([]); // Clear array to mean 'all'
      return;
    }
    
    let newArr = [...current];
    if (newArr.includes(slug)) {
      newArr = newArr.filter(s => s !== slug); // Remove if already selected
    } else {
      newArr.push(slug); // Add if not selected
    }
    setFunc(newArr);
  };


  const openFilter = () => {
    setDraftCategory(selectedCategory);
    setDraftSubcategory(selectedSubcategory);
    setDraftSortBy(sortBy);
    setDraftMinDiscount(minDiscount);
    setDraftPriceRange(activePriceRange);
    setIsFilterOpen(true);
  };

  const applyFilter = () => {
    setSelectedCategory(draftCategory);
    setSelectedSubcategory(draftSubcategory);
    setSortBy(draftSortBy);
    setMinDiscount(draftMinDiscount);
    setActivePriceRange(draftPriceRange);
    setIsFilterOpen(false);
  };


  // --- HORIZONTAL SCROLL INTERCEPTOR ---
  const categoryScrollRef = useRef(null);

  useEffect(() => {
    const el = categoryScrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
        e.preventDefault(); 
        el.scrollLeft += e.deltaY;
      }
    };

    // { passive: false } is required to block vertical scrolling
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [categories]); // Re-attach if categories update
  // -------------------------------------
  
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
    
    axios.get(`${API}/banners`).then(res => setBanners(res.data)).catch(() => {});

    // --- TELEGRAM POPUP LOGIC ---
    const popupDismissed = localStorage.getItem('tg_popup_dismissed');
    const dismissedTime = localStorage.getItem('tg_popup_time');
    const now = new Date().getTime();
    
    // If never dismissed, or if it has been more than 24 hours (86400000 ms) since last dismissal
    if (!popupDismissed || (now - parseInt(dismissedTime)) > 86400000) {
      const timer = setTimeout(() => {
        setShowTgPopup(true);
      }, 5000); // Pops up after 5 seconds
      return () => clearTimeout(timer);
    }


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
  }, [selectedCategory, selectedSubcategory, minDiscount, selectedPlatform, activePriceRange, sortBy]);


  useEffect(() => {
    if (page > 0) fetchCategoryDeals(page, false);
  }, [page]);

  // Fetch subcategories based on whether the drawer is open or closed
  const activeCat = isFilterOpen ? draftCategory : selectedCategory;
  useEffect(() => {
    if (activeCat && activeCat !== 'all') {
      fetchSubcategories(activeCat);
    } else { 
      setSubcategories([]); 
    }
  }, [activeCat, isFilterOpen]);


  // Auto-scroll the selected category pill into view
  useEffect(() => {
    if (categoryScrollRef.current) {
      // Find the button that has the active 'bg-accent' class
      const activeBtn = categoryScrollRef.current.querySelector('.bg-accent');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedCategory]);

  // --- BANNER AUTO-SCROLL LOGIC ---
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      if (bannerScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = bannerScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          bannerScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          bannerScrollRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }
    }, 4000); 
    return () => clearInterval(interval);
  }, [banners]);
  // --------------------------------

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

      // C:\Users\akhil\Desktop\Biz\deal-striker\frontend\src\pages\HomeEnhanced.js

      // FIX: Start with base URL
      let url = `${API}/deals?sort_by=${sortBy}&skip=${pageNum * 12}&limit=12`;

      // DO NOT append if value is 'all' - the backend interprets 'all' as a literal ID search
      if (selectedCategory && selectedCategory !== 'all') {
        url += `&category_id=${selectedCategory}`;
      }
      if (selectedSubcategory && selectedSubcategory.length > 0) {
        url += `&subcategory=${selectedSubcategory.join(',')}`;
      }
      if (minDiscount > 0) {
        url += `&min_discount=${minDiscount}`;
      }
      // --- NEW SLIDER PRICE LOGIC ---
      if (activePriceRange[0] > 0) {
        url += `&min_price=${activePriceRange[0]}`;
      }
      // If it's at the absolute max (5000), we don't set a max price so it fetches everything above 5000 too
      if (activePriceRange[1] < 5000) {
        url += `&max_price=${activePriceRange[1]}`;
      }
      if (selectedPlatform) {
        url += `&platform=${selectedPlatform}`;
      }
    
      
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
      
      // NEW DUPLICATE SAFEGUARD
      setCategoryDeals(prev => {
        if (isNewFilter) return newData; // If it's a new filter, just use the fresh data
        
        // If appending (scrolling), check for duplicates by ID
        const existingIds = new Set(prev.map(d => d.id));
        const uniqueNewData = newData.filter(d => !existingIds.has(d.id));
        return [...prev, ...uniqueNewData];
      });
    } catch (error) {} finally {
      if (currentFetchId === fetchIdRef.current) {
        setGridLoading(false);
        setIsFetchingMore(false);
      }
    }
  };

  const handleCategoryChange = (catId) => { setSelectedCategory(catId); setSelectedSubcategory([]); };
  
  const handlePlatformClick = (platformName) => { 
    setSelectedPlatform(platformName); 
    // RESET these to 'all' so the storefront starts with a clean slate
    setSelectedCategory('all');      
    setSelectedSubcategory('all');   
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };
  
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

  const closeTgPopup = () => {
    setShowTgPopup(false);
    localStorage.setItem('tg_popup_dismissed', 'true');
    localStorage.setItem('tg_popup_time', new Date().getTime().toString());
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
              <div className="flex items-center gap-2 sm:gap-4">
                
                {/* SOCIAL PLATFORMS */}
                <div className="flex items-center gap-2 mr-2 border-r pr-2 sm:pr-4 border-border/50">
                  <a href="https://t.me/offermehelelo" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0088cc] transition-colors" title="Join our Telegram">
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                  <a href="https://whatsapp.com/channel/0029Vb7rhfrHgZWXi4IUVc2z" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#25D366] transition-colors" title="Join our WhatsApp">
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  </a>
                  {/* Future Insta/FB/YT buttons go here */}
                </div>

                <a href="/contact" className="hover:text-accent flex items-center gap-1 sm:gap-1.5 font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-colors">
                  <MessageSquare className="h-4 w-4" /> 
                  <span className="hidden min-[450px]:inline">Talk To Us</span>
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
                  onClick={() => handlePlatformClick(p.name)} // THIS WAS MISSING
                  className={`font-bold text-xs uppercase tracking-wider transition-colors flex-shrink-0 ${
                    selectedPlatform === p.name ? 'text-accent' : 'hover:text-accent'
                  }`}
                >
                  {p.name} Deals
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        
        {/* BIG MOVING BANNER SECTION */}
        {banners.length > 0 && !selectedPlatform && (
          <div className="mb-8 overflow-hidden rounded-xl bg-card border shadow-sm relative group">
            <div 
              ref={bannerScrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
            >
              {banners.map((banner, idx) => (
                <a 
                  key={banner.id} 
                  href={banner.affiliate_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex-shrink-0 snap-center relative aspect-[21/9] md:aspect-[32/9] cursor-pointer"
                  onClick={() => trackClick(banner.id, banner.affiliate_link, 'top-banner', 'home')}
                >
                  <img 
                    src={banner.image_url} 
                    alt={banner.name}
                    className="w-full h-full object-contain bg-secondary/20"
                  />
                  {/* Subtle platform badge */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-sm">
                    {banner.platform} Offer
                  </div>
                </a>
              ))}
            </div>
            
            
          </div>
        )}

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

        <section className="py-8 mt-4">
          <div className="border-t pt-8 mb-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">
              {selectedPlatform ? `Filter ${selectedPlatform} By Category` : 'Browse By Category'}
            </h2>
          </div>
          
          {/* SEO CATEGORY DESCRIPTION INJECTION */}
          <p className="text-sm text-muted-foreground mb-6">
            Find the highest discounted {
              selectedCategory === 'all' 
                ? 'fashion and electronics' 
                : categories.find(c => c.id === selectedCategory)?.name || selectedCategory.replace(/-/g, ' ')
            } from top platforms. Validated and updated hourly.
          </p>

          

          {/* STICKY CONTAINER: FIXING GAP AND ALIGNMENT */}
          <div className="sticky top-[105px] z-[40] bg-background">
            <div className="relative border-b">
              <div 
                ref={categoryScrollRef} 
                className="flex gap-2 overflow-x-auto scrollbar-hide pr-32 py-3 fade-edges"
                onScroll={handleScrollMask}
              >
                <button 
                  onClick={() => handleCategoryChange('all')} 
                  className={`px-5 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap border-2 rounded-full transition-all active:scale-95 ${selectedCategory === 'all' ? 'border-accent bg-accent text-black' : 'border-border/50 bg-background hover:border-accent/50 text-foreground'}`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button 
                    key={cat.id} 
                    onClick={() => handleCategoryChange(cat.id)} 
                    className={`px-5 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap border-2 rounded-full transition-all active:scale-95 ${selectedCategory === cat.id ? 'border-accent bg-accent text-black' : 'border-border/50 bg-background hover:border-accent/50 text-foreground'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              
              {/* FIXED FILTER BLOCK: Locked to the Category Bar */}
              <div className="absolute right-0 top-0 h-full flex items-center bg-background pl-4 z-10">
                <div className="absolute left-0 top-0 bottom-0 w-10 -ml-10 bg-gradient-to-r from-transparent to-background pointer-events-none"></div>
                <button 
                  onClick={openFilter}
                  className="h-[40px] px-6 bg-black text-white flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-black/80 transition-all rounded-l-md shadow-lg"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                </button>
              </div>
            </div>

            {/* SUBCATEGORY TRAY: No longer pushes the filter */}
            {!selectedPlatform && subcategories.length > 0 && (
              <div className="flex gap-4 overflow-x-auto py-4 scrollbar-hide fade-edges transition-all items-start bg-background border-b shadow-sm">
                <button onClick={() => toggleSubcategory('all', false)} className="flex flex-col items-center gap-2 group min-w-[72px] ml-2">
                  <div className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all ${selectedSubcategory.length === 0 ? 'border-accent bg-accent/10' : 'border-border/50 bg-secondary'}`}>
                    <span className="text-[9px] font-black uppercase text-center leading-tight">All</span>
                  </div>
                </button>
                {subcategories.map((sub) => (
                  <button key={sub.id} onClick={() => toggleSubcategory(sub.slug, false)} className="flex flex-col items-center gap-2 group min-w-[72px]">
                    <div className={`w-12 h-12 rounded-full border overflow-hidden flex items-center justify-center bg-secondary relative ${selectedSubcategory.includes(sub.slug) ? 'border-accent ring-2 ring-accent/20' : 'border-border/50'}`}>
                      {sub.image_url ? <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover" /> : <span className="text-[9px] font-bold uppercase">{sub.name.substring(0,2)}</span>}
                      {selectedSubcategory.includes(sub.slug) && (
                        <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                          <div className="bg-accent text-black rounded-full p-0.5">
                             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider text-center line-clamp-1 ${selectedSubcategory.includes(sub.slug) ? 'text-accent' : 'text-muted-foreground'}`}>{sub.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FILTER DRAWER OVERLAY */}
          {isFilterOpen && (
            <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-background w-full max-w-sm h-full border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <Filter className="h-5 w-5" /> Filters
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Category Dropdown */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Category</label>
                    <Select value={draftCategory} onValueChange={(val) => { setDraftCategory(val); setDraftSubcategory([]); }}>
                      <SelectTrigger className="w-full rounded-lg font-bold">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategories Multi-Select Grid */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Subcategories</label>
                    {draftCategory === 'all' ? (
                      <p className="text-xs text-muted-foreground italic">Select a category first.</p>
                    ) : subcategories.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No subcategories available.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => toggleSubcategory('all', true)}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all ${draftSubcategory.length === 0 ? 'bg-accent border-accent text-black' : 'bg-secondary border-border/50 text-foreground hover:border-accent/50'}`}
                        >
                          All
                        </button>
                        {subcategories.map(sub => (
                          <button 
                            key={sub.id}
                            onClick={() => toggleSubcategory(sub.slug, true)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all flex items-center gap-1 ${draftSubcategory.includes(sub.slug) ? 'bg-accent/20 border-accent text-foreground' : 'bg-secondary border-border/50 text-foreground hover:border-accent/50'}`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sorting */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Sort By</label>
                    <Select value={draftSortBy} onValueChange={setDraftSortBy}>
                      <SelectTrigger className="w-full rounded-lg font-bold">
                        <SelectValue placeholder="Sort Deals" />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        <SelectItem value="score">Recommended (Score)</SelectItem>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="price_asc">Price: Low to High</SelectItem>
                        <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        <SelectItem value="discount">Highest Discount</SelectItem>
                        <SelectItem value="rating">Highest Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Minimum Discount</label>
                    <Select value={draftMinDiscount.toString()} onValueChange={(val) => setDraftMinDiscount(Number(val))}>
                      <SelectTrigger className="w-full rounded-lg font-bold">
                        <SelectValue placeholder="Any Discount" />
                      </SelectTrigger>
                      <SelectContent className="z-[110]">
                        <SelectItem value="0">All Discounts</SelectItem>
                        <SelectItem value="30">30% or more</SelectItem>
                        <SelectItem value="50">50% or more</SelectItem>
                        <SelectItem value="70">70% or more</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Price Range</label>
                      <span className="text-xs font-bold text-accent">
                        ₹{draftPriceRange[0]} - {draftPriceRange[1] >= 5000 ? '₹5,000+' : `₹${draftPriceRange[1]}`}
                      </span>
                    </div>
                    <Slider
                      defaultValue={[0, 5000]}
                      max={5000}
                      step={100}
                      value={draftPriceRange}
                      onValueChange={setDraftPriceRange}
                      className="w-full cursor-grab active:cursor-grabbing mt-4"
                    />
                  </div>

                </div>

                <div className="p-4 border-t bg-card">
                  <Button className="w-full font-black uppercase tracking-widest bg-black text-white hover:bg-black/80" onClick={applyFilter}>
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          


          <BrowseLinkTiles category={selectedCategory !== 'all' ? selectedCategory : null} subcategory={selectedSubcategory !== 'all' ? selectedSubcategory : null} platform={selectedPlatform} showTitle={true} maxLinks={selectedPlatform ? 100 : (selectedCategory !== 'all' ? 100 : 12)} scrollable={!selectedPlatform && selectedCategory === 'all'} />

          {gridLoading ? (
            <><LoadingMessages /><DealSkeleton /></>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
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
        <div className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          <p>Offer Me He Lelo is reader-supported. When you buy through links on our site, we may earn an affiliate commission. As an Amazon Associate, we earn from qualifying purchases.</p>
        </div>
        
        {/* NEW RAZORPAY REQUIRED LINKS */}
        <div className="mt-6 border-t pt-4 flex flex-wrap justify-center gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground pb-4">
          <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <a href="/refund" className="hover:text-foreground transition-colors">Refund Policy</a>
          <a href="/contact" className="hover:text-foreground transition-colors">Contact Us</a>
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

      {/* PHASE 6: TELEGRAM POPUP MODAL */}
      {showTgPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card border shadow-2xl rounded-2xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-300">
            
            {/* Close Button */}
            <button 
              onClick={closeTgPopup}
              className="absolute top-3 right-3 p-1.5 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header Area */}
            <div className="bg-gradient-to-r from-[#0088cc] to-[#00a8ff] p-6 text-center text-white relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-20">
                <Send className="h-32 w-32" />
              </div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="bg-white text-[#0088cc] p-3 rounded-full mb-4 shadow-lg">
                  <Send className="h-8 w-8 ml-[-2px] mt-[2px]" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight mb-1">Never Miss a Loot Deal!</h2>
                <p className="text-white/90 text-sm font-medium">Get instant alerts before stock runs out.</p>
              </div>
            </div>

            {/* Body Area */}
            <div className="p-6 text-center space-y-4">
              <div className="flex justify-center gap-2 mb-2">
                <span className="bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm">🔥 90% Off</span>
                <span className="bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm">⚡ Price Drops</span>
                <span className="bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-sm">🐛 Price Bugs</span>
              </div>
              
              <a 
                href="https://t.me/your_telegram_channel" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={closeTgPopup}
                className="w-full flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#0077b3] text-white py-3.5 rounded-xl font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-xl"
              >
                Join Telegram Free <ArrowRight className="h-5 w-5" />
              </a>
              
              <button 
                onClick={closeTgPopup}
                className="text-xs text-muted-foreground hover:text-foreground font-bold tracking-widest uppercase transition-colors"
              >
                Maybe Later
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeEnhanced;