import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { ExternalLink, ArrowRight } from 'lucide-react';

const BrowseLinkTiles = ({ category = null, subcategory = null, showTitle = true, maxLinks = 6 }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBrowseLinks();
  }, [category, subcategory]);

  const fetchBrowseLinks = async () => {
    try {
      let url = `${API}/browse-links`;
      const params = new URLSearchParams();
      
      if (category) params.append('category', category);
      if (subcategory) params.append('subcategory', subcategory);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await axios.get(url);
      setLinks(response.data.slice(0, maxLinks));
    } catch (error) {
      console.error('Error fetching browse links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (link) => {
    // Track click
    try {
      await axios.post(`${API}/track/click`, {
        deal_id: link.id,
        product_title: link.title,
        affiliate_link: link.affiliate_link,
        source_section: 'browse-links',
      });
    } catch (error) {
      console.error('Failed to track click');
    }
    
    window.open(link.affiliate_link, '_blank');
  };

  if (loading) {
    return (
      <section className="py-6" data-testid="browse-links-loading">
        {showTitle && (
          <h3 className="text-lg font-bold uppercase tracking-tight mb-4">Shop by Store</h3>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary/50 animate-pulse rounded-sm"></div>
          ))}
        </div>
      </section>
    );
  }

  if (links.length === 0) {
    return null;
  }

  return (
    <section className="py-6" data-testid="browse-links">
      {showTitle && (
        <h3 className="text-lg font-bold uppercase tracking-tight mb-4">Shop by Store</h3>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => handleClick(link)}
            className="browse-link-tile group border rounded-sm bg-card hover:bg-secondary/50 transition-all duration-300 hover:shadow-md overflow-hidden text-left"
            data-testid={`browse-link-tile-${link.id}`}
          >
            <div className="p-4 flex flex-col h-full min-h-[100px]">
              <div className="flex items-center gap-2 mb-2">
                {link.platform_logo ? (
                  <img
                    src={link.platform_logo}
                    alt={link.platform}
                    className="h-5 w-auto object-contain"
                  />
                ) : (
                  <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded">
                    {link.platform}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-semibold line-clamp-2 flex-grow">{link.title}</h4>
              {link.offer_text && (
                <p className="text-xs text-accent font-bold mt-2">{link.offer_text}</p>
              )}
              <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mt-2 group-hover:text-foreground transition-colors">
                <span>Browse</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default BrowseLinkTiles;
