import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Flame, Zap, TrendingDown, TrendingUp, Moon, Sun, Filter, MessageSquare } from 'lucide-react';
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

const HomeEnhanced = () => {
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState('all');
  const [minDiscount, setMinDiscount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Highlight sections
  const [bestDealsToday, setBestDealsToday] = useState([]);
  const [lightningDeals, setLightningDeals] = useState([]);
  const [priceDrops, setPriceDrops] = useState([]);
  const [trendingDeals, setTrendingDeals] = useState([]);
  
  // Filtered deals for category section
  const [categoryDeals, setCategoryDeals] = useState([]);
  
  // Top deal for sticky button
  const [topDeal, setTopDeal] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchHighlights();
  }, []);

  useEffect(() => {
    fetchCategoryDeals();
  }, [selectedCategory, selectedSubcategory, minDiscount]);

  useEffect(() => {
    if (selectedCategory !== 'all') {
      fetchSubcategories(selectedCategory);
    } else {
      setSubcategories([]);
      setSelectedSubcategory('all');
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchSubcategories = async (categoryId) => {
    try {
      const response = await axios.get(`${API}/subcategories?category_id=${categoryId}`);
      setSubcategories(response.data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    }
  };

  const fetchHighlights = async () => {
    try {
      setLoading(true);
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
      
      // Set top deal for sticky button
      if (bestRes.data.length > 0) {
        setTopDeal(bestRes.data[0]);
      }
    } catch (error) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryDeals = async () => {
    try {
      let url = `${API}/deals?sort_by=score`;
      
      if (selectedCategory !== 'all') {
        url += `&category_id=${selectedCategory}`;
      }

      if (selectedSubcategory !== 'all') {
        url += `&subcategory=${selectedSubcategory}`;
      }
      
      if (minDiscount > 0) {
        url += `&min_discount=${minDiscount}`;
      }
      
      const response = await axios.get(url);
      setCategoryDeals(response.data.slice(0, 20));
    } catch (error) {
      console.error('Error fetching category deals:', error);
    }
  };

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setSelectedSubcategory('all');
  };

  const trackClick = async (dealId, productUrl, section, page) => {
    try {
      await axios.post(`${API}/track/click`, {
        deal_id: dealId,
        product_url: productUrl,
        section,
        page,
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  return (
    <div className="min-h-screen noise-bg">
      <SEO
        title="Offer Me He Lelo! - Best Deals & Discounts | Save Up to 80%"
        description="Find the hottest deals from Amazon, Flipkart and more. Save big on electronics, fashion, home appliances. Updated hourly with smart deal scoring!"
        url="/"
      />

      {/* Header */}
      <header className="sticky-header glassmorphism border-b">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" data-testid="site-title">
              OFFER ME HE LELO!
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle-btn">
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/admin/login')}
                className="uppercase text-xs font-semibold tracking-widest"
              >
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Discover Amazing Deals
          </h2>
          <p className="text-lg text-muted-foreground">
            Smart deal scoring • Hourly updates • Up to 80% off
          </p>
        </div>

        {/* Highlight Sections */}
        <DealSection
          title="🔥 Best Deals Today"
          icon={Flame}
          deals={bestDealsToday}
          loading={loading}
          section="best-today"
          onTrackClick={trackClick}
        />

        {/* Browse Links - Shop by Store */}
        <BrowseLinkTiles showTitle={true} maxLinks={6} />

        <DealSection
          title="⚡ Lightning Deals"
          icon={Zap}
          deals={lightningDeals}
          loading={loading}
          section="lightning"
          onTrackClick={trackClick}
        />

        <DealSection
          title="📉 Biggest Price Drops"
          icon={TrendingDown}
          deals={priceDrops}
          loading={loading}
          section="price-drops"
          onTrackClick={trackClick}
        />

        <DealSection
          title="📈 Trending Deals"
          icon={TrendingUp}
          deals={trendingDeals}
          loading={loading}
          section="trending-24h"
          onTrackClick={trackClick}
        />

        {/* Popular Platforms */}
        <PlatformTiles />

        {/* Category Filter Section */}
        <section className="py-8 mt-8 border-t">
          <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Browse By Category</h2>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest whitespace-nowrap border rounded-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-secondary'
              }`}
              data-testid="category-all"
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest whitespace-nowrap border rounded-sm transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-secondary'
                }`}
                data-testid={`category-${cat.id}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Subcategory Filter */}
          {subcategories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
              <button
                onClick={() => setSelectedSubcategory('all')}
                className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap border rounded-sm transition-colors ${
                  selectedSubcategory === 'all'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background hover:bg-secondary/70'
                }`}
                data-testid="subcategory-all"
              >
                All
              </button>
              {subcategories.map((subcat) => (
                <button
                  key={subcat.id}
                  onClick={() => setSelectedSubcategory(subcat.slug)}
                  className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap border rounded-sm transition-colors ${
                    selectedSubcategory === subcat.slug
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-background hover:bg-secondary/70'
                  }`}
                  data-testid={`subcategory-${subcat.id}`}
                >
                  {subcat.name}
                </button>
              ))}
            </div>
          )}

          {/* Discount Filter */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wider">Filter:</span>
            </div>
            <Select value={minDiscount.toString()} onValueChange={(val) => setMinDiscount(Number(val))}>
              <SelectTrigger className="w-[200px] rounded-sm" data-testid="discount-filter">
                <SelectValue placeholder="Min Discount" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Discounts</SelectItem>
                <SelectItem value="30">30% or more</SelectItem>
                <SelectItem value="40">40% or more</SelectItem>
                <SelectItem value="50">50% or more</SelectItem>
                <SelectItem value="60">60% or more</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Browse Links for selected category */}
          {selectedCategory !== 'all' && (
            <BrowseLinkTiles
              category={selectedCategory}
              subcategory={selectedSubcategory !== 'all' ? selectedSubcategory : null}
              showTitle={true}
              maxLinks={4}
            />
          )}

          {/* Category Deals Grid */}
          {categoryDeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categoryDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} section="category" onTrackClick={trackClick} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No deals found for this filter.</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-black text-lg mb-4">OFFER ME HE LELO!</h3>
              <p className="text-sm text-muted-foreground">
                Your trusted source for the best deals from Amazon, Flipkart, and more.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/deals/today-best-deals" className="text-muted-foreground hover:text-foreground">Today's Best</a></li>
                <li><a href="/deals/best-amazon-deals" className="text-muted-foreground hover:text-foreground">Amazon Deals</a></li>
                <li><a href="/deals/best-flipkart-deals" className="text-muted-foreground hover:text-foreground">Flipkart Deals</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4">By Price</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/deals/under-1000" className="text-muted-foreground hover:text-foreground">Under ₹1,000</a></li>
                <li><a href="/deals/under-5000" className="text-muted-foreground hover:text-foreground">Under ₹5,000</a></li>
                <li><a href="/deals/top-discounted-products" className="text-muted-foreground hover:text-foreground">Top Discounts</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/contact" className="text-muted-foreground hover:text-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Talk To Us</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center mt-8 pt-8 border-t text-sm text-muted-foreground">
            <p>Offer Me He Lelo! - Automated Affiliate Deals Platform</p>
            <p className="mt-2">Deals updated hourly • Smart scoring • Best prices guaranteed</p>
          </div>
        </div>
      </footer>

      {/* Sticky Deal Button (Mobile) */}
      <StickyDealButton deal={topDeal} onTrackClick={trackClick} />
    </div>
  );
};

export default HomeEnhanced;
