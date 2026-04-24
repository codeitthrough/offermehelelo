import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const BrowseLinkTiles = ({ category = null, subcategory = null, platform = null, showTitle = true, maxLinks = 100, scrollable = false }) => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 250; 
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      // Only trigger if scrolling vertically and there is room to scroll horizontally
      if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
        e.preventDefault(); 
        el.scrollLeft += e.deltaY;
      }
    };

    // { passive: false } is required so the browser allows us to block the vertical scroll
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    fetchBrowseLinks();
  }, [category, subcategory, platform]);

  const fetchBrowseLinks = async () => {
    try {
      setLoading(true);
      let url = `${API}/browse-links`;
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (subcategory) params.append('subcategory', subcategory);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await axios.get(url);
      let fetchedLinks = response.data;
      
      // Frontend override: Filter by platform if active
      if (platform) {
        fetchedLinks = fetchedLinks.filter(link => 
          link.platform && link.platform.toLowerCase() === platform.toLowerCase()
        );
      }
      
      setLinks(fetchedLinks.slice(0, maxLinks));
    } catch (error) {
      console.error('Error fetching browse links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = async (link) => {
    try {
      await axios.post(`${API}/track/click`, {
        deal_id: link.id,
        product_title: link.title,
        affiliate_link: link.affiliate_link,
        source_section: 'browse-links',
      });
    } catch (error) {}
    window.open(link.affiliate_link, '_blank');
  };

  const handleScroll = (e) => {
    const { scrollLeft, clientWidth, scrollWidth } = e.currentTarget;
    // If we scrolled to the end (allowing a 5px buffer), remove the fade
    if (scrollLeft + clientWidth >= scrollWidth - 5) {
      e.currentTarget.classList.remove('fade-edges');
    } else {
      e.currentTarget.classList.add('fade-edges');
    }
  };

  if (loading) {
    return (
      <section className="py-6">
        {showTitle && <h3 className="text-lg font-bold uppercase tracking-tight mb-4">Shop by Store</h3>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-secondary/50 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </section>
    );
  }

  if (links.length === 0) return null;

  const TileContent = ({ link }) => (
    <div className="flex flex-col h-full min-h-[100px]">
      {/* NEW: Display the uploaded cover image if it exists */}
      {link.image_url && (
        <div className="w-full h-24 sm:h-28 bg-secondary border-b overflow-hidden flex-shrink-0">
            <img 
            src={link.image_url} 
            alt={link.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        </div>
      )}
      
      {/* Existing text content */}
      <div className="p-2.5 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2">
          {link.platform_logo ? (
            <img src={link.platform_logo} alt={link.platform} className="h-5 w-auto object-contain" />
          ) : (
            <span className="text-xs font-bold bg-secondary px-2 py-0.5 rounded">{link.platform}</span>
          )}
        </div>
        <h4 className="text-base font-bold line-clamp-2 flex-grow">{link.title}</h4>
        {link.offer_text && <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">{link.offer_text}</p>}
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mt-2 group-hover:text-foreground transition-colors">
          <span>Browse</span>
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );

  return (
    <section className="py-6">
      {showTitle && (
        <div className="flex justify-between items-center mb-4 pr-1">
          <h3 className="text-lg font-bold uppercase tracking-tight">Shop by Store {platform && `for ${platform}`}</h3>
          {scrollable && (
            <div className="flex gap-1">
              <button onClick={() => scroll('left')} className="p-1.5 border border-border/50 rounded-full hover:bg-secondary transition-colors"><ArrowLeft className="h-4 w-4 text-muted-foreground"/></button>
              <button onClick={() => scroll('right')} className="p-1.5 border border-border/50 rounded-full hover:bg-secondary transition-colors"><ArrowRight className="h-4 w-4 text-muted-foreground"/></button>
            </div>
          )}
        </div>
      )}

      {scrollable ? (
        <div 
          ref={scrollRef}
          className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide snap-x fade-edges transition-all"
          onScroll={handleScroll}>
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleClick(link)}
              className="min-w-[160px] md:min-w-[200px] flex-shrink-0 snap-start browse-link-tile group border rounded-xl bg-card hover:bg-secondary/50 transition-all duration-300 hover:shadow-md overflow-hidden text-left"
            >
              <TileContent link={link} />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {links.map((link) => (
            <button
              key={link.id}
              onClick={() => handleClick(link)}
              className="browse-link-tile group border rounded-xl bg-card hover:bg-secondary/50 transition-all duration-300 hover:shadow-md overflow-hidden text-left"
            >
              <TileContent link={link} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default BrowseLinkTiles;