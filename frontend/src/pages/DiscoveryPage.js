import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { Moon, Sun, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';
import DealCard from '@/components/DealCard';

const DiscoveryPage = () => {
  const { slug } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageInfo, setPageInfo] = useState({});

  const pageConfigs = {
    'today-best-deals': {
      title: "Today's Best Deals | Deal Striker",
      heading: "🔥 Today's Best Deals",
      description: "Handpicked best deals added in the last 24 hours. Highest scoring deals updated hourly.",
      metaDescription: "Today's best deals from Amazon and Flipkart. New deals added hourly with smart scoring.",
    },
    'best-amazon-deals': {
      title: 'Best Amazon Deals | Deal Striker',
      heading: '📦 Best Amazon Deals',
      description: 'Top-rated deals from Amazon sorted by our smart deal scoring algorithm.',
      metaDescription: 'Find the best Amazon deals with up to 80% off on electronics, fashion, and more.',
    },
    'best-flipkart-deals': {
      title: 'Best Flipkart Deals | Deal Striker',
      heading: '🛒 Best Flipkart Deals',
      description: 'Top-rated deals from Flipkart sorted by our smart deal scoring algorithm.',
      metaDescription: 'Discover amazing Flipkart deals with huge discounts on all categories.',
    },
    'top-discounted-products': {
      title: 'Top Discounted Products | Deal Striker',
      heading: '💰 Top Discounted Products',
      description: 'Products with the highest discount percentages. Save big on every purchase!',
      metaDescription: 'Explore products with the highest discounts - up to 80% off on top brands.',
    },
    'under-1000': {
      title: 'Best Deals Under ₹1,000 | Deal Striker',
      heading: '💵 Deals Under ₹1,000',
      description: 'Amazing deals under ₹1,000. Great products at budget-friendly prices.',
      metaDescription: 'Find the best deals under ₹1,000 from Amazon and Flipkart.',
    },
    'under-5000': {
      title: 'Best Deals Under ₹5,000 | Deal Striker',
      heading: '💳 Deals Under ₹5,000',
      description: 'Premium deals under ₹5,000. Get more value for your money.',
      metaDescription: 'Explore premium deals under ₹5,000 with best discounts and offers.',
    },
  };

  useEffect(() => {
    const config = pageConfigs[slug] || pageConfigs['today-best-deals'];
    setPageInfo(config);
    fetchDeals();
  }, [slug]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/deals/discovery/${slug}`);
      setDeals(response.data);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackClick = async (dealId, productUrl, section, page) => {
    try {
      await axios.post(`${API}/track/click`, {
        deal_id: dealId,
        product_url: productUrl,
        section,
        page: 'discovery',
      });
    } catch (error) {
      console.error('Error tracking click:', error);
    }
  };

  return (
    <div className="min-h-screen noise-bg">
      <SEO
        title={pageInfo.title}
        description={pageInfo.metaDescription}
        url={`/deals/${slug}`}
      />

      {/* Header */}
      <header className="sticky-header glassmorphism border-b">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => (window.location.href = '/')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">DEAL STRIKER</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
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
      <main className="max-w-[1600px] mx-auto px-4 md:px-8 py-12">
        {/* Page Hero */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">{pageInfo.heading}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{pageInfo.description}</p>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>✓ Updated Hourly</span>
            <span>•</span>
            <span>✓ Smart Scoring</span>
            <span>•</span>
            <span>✓ Best Prices</span>
          </div>
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-[450px] bg-secondary/50 animate-pulse rounded-sm" />
            ))}
          </div>
        ) : deals.length > 0 ? (
          <>
            <div className="mb-6 text-sm text-muted-foreground">
              Showing {deals.length} amazing {deals.length === 1 ? 'deal' : 'deals'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} section={slug} page="discovery" onTrackClick={trackClick} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-2xl font-bold mb-2">No Deals Found</h3>
            <p className="text-muted-foreground mb-6">
              Check back soon! New deals are added every hour.
            </p>
            <Button onClick={() => (window.location.href = '/')} variant="outline">
              Browse All Deals
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-20">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 text-center text-sm text-muted-foreground">
          <p>Deal Striker - Automated Affiliate Deals Platform</p>
          <p className="mt-2">Deals updated hourly • Smart scoring • Best prices guaranteed</p>
        </div>
      </footer>
    </div>
  );
};

export default DiscoveryPage;
