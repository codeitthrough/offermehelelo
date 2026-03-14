import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { Filter, Moon, Sun, ExternalLink } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Home = () => {
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minDiscount, setMinDiscount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchDeals();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [deals, selectedCategory, minDiscount]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/deals`);
      setDeals(response.data);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...deals];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((deal) => deal.category_id === selectedCategory);
    }

    if (minDiscount > 0) {
      filtered = filtered.filter((deal) => deal.discount_percentage >= minDiscount);
    }

    setFilteredDeals(filtered);
  };

  return (
    <div className="min-h-screen noise-bg">
      {/* Header */}
      <header className="sticky-header glassmorphism border-b">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" data-testid="site-title">
              DEAL STRIKER
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                data-testid="theme-toggle-btn"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/admin/login')}
                data-testid="admin-login-btn"
                className="uppercase text-xs font-semibold tracking-widest"
              >
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="border-b bg-card">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex gap-2 overflow-x-auto py-4 scrollbar-hide" data-testid="category-tabs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest whitespace-nowrap border rounded-none transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-secondary'
              }`}
              data-testid="category-tab-all"
            >
              All Deals
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-6 py-2 text-xs font-semibold uppercase tracking-widest whitespace-nowrap border rounded-none transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-secondary'
                }`}
                data-testid={`category-tab-${cat.slug}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border-b">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center gap-4">
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
                <SelectItem value="10">10% or more</SelectItem>
                <SelectItem value="20">20% or more</SelectItem>
                <SelectItem value="30">30% or more</SelectItem>
                <SelectItem value="40">40% or more</SelectItem>
                <SelectItem value="50">50% or more</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredDeals.length} {filteredDeals.length === 1 ? 'deal' : 'deals'} found
            </span>
          </div>
        </div>
      </div>

      {/* Deals Grid */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading deals...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="text-center py-20" data-testid="no-deals-message">
            <h3 className="text-2xl font-bold mb-2">No Deals Found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="deals-grid">
            {filteredDeals.map((deal) => (
              <div
                key={deal.id}
                className="deal-card border rounded-none bg-card overflow-hidden"
                data-testid={`deal-card-${deal.id}`}
              >
                <div className="relative">
                  <img
                    src={deal.image_url || 'https://images.unsplash.com/photo-1621534222671-05b508d16bb8?crop=entropy&cs=srgb&fm=jpg&q=85'}
                    alt={deal.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-3 py-1 font-black text-sm uppercase">
                    {deal.discount_percentage}% OFF
                  </div>
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 text-xs uppercase font-semibold">
                    {deal.platform}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2">{deal.title}</h3>
                  {deal.category_name && (
                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                      {deal.category_name}
                    </p>
                  )}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-black text-accent">
                      ₹{deal.discounted_price.toLocaleString()}
                    </span>
                    <span className="text-sm line-through text-muted-foreground">
                      ₹{deal.original_price.toLocaleString()}
                    </span>
                  </div>
                  <a
                    href={deal.affiliate_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-sm uppercase tracking-wide font-bold text-sm transition-colors"
                    data-testid={`deal-link-${deal.id}`}
                  >
                    <span>Get Deal</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 text-center text-sm text-muted-foreground">
          <p>Deal Striker - Automated Affiliate Deals Platform</p>
          <p className="mt-2">Deals updated hourly from Amazon, Flipkart, and EarnKaro</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
