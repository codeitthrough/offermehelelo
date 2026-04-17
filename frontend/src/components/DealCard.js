import React, { useState } from 'react';
import { ExternalLink, Star, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import DealBadge from './DealBadge';

const DealCard = ({ deal, section = 'general', page = 'home', onTrackClick }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (onTrackClick) onTrackClick(deal.id, deal.product_url || deal.affiliate_link, section, page);
  };

  const isSellingFast = deal.discount_percentage >= 85 && deal.rating >= 4.0 && deal.rating <= 4.5;

  return (
    <div className="deal-card border rounded-lg bg-card shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col h-full relative">
      
      {/* SEO SCHEMA INJECTION */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": deal.title,
            "image": deal.image_url,
            "offers": {
              "@type": "Offer",
              "priceCurrency": "INR",
              "price": deal.discounted_price
            }
          })
        }}
      />

      {/* IMAGE: Aspect Ratio 4:5 for apparel/e-commerce standard */}
      <div className="relative w-full aspect-square bg-secondary/40 shrink-0 overflow-hidden">
        <img
          src={deal.image_url || 'https://images.unsplash.com/photo-1621534222671-05b508d16bb8?crop=entropy&cs=srgb&fm=jpg&q=85'}
          alt={deal.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 opacity-0 group-hover:scale-105"
          onLoad={(e) => {
            e.target.classList.remove('opacity-0');
            e.target.parentElement.classList.remove('animate-pulse');
          }}
        />
        
        {/* Floating Badges */}
        <div className="absolute top-2 left-0 bg-accent text-accent-foreground px-2 py-0.5 font-black text-[10px] uppercase rounded-r-md shadow-sm">
          {deal.discount_percentage}% OFF
        </div>
        
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {deal.is_hot_deal && <DealBadge type="hot" />}
          {deal.is_lightning_deal && <DealBadge type="lightning" />}
        </div>

        {/* Rating overlay on image (Myntra style) */}
        {deal.rating && (
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-md px-1.5 py-0.5 rounded-sm flex items-center gap-1 text-[10px] font-bold shadow-sm">
            <span>{deal.rating.toFixed(1)}</span>
            <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
            {deal.review_count && (
              <>
                <span className="text-muted-foreground font-normal px-0.5">|</span>
                <span className="text-muted-foreground font-normal">{deal.review_count}</span>
              </>
            )}
          </div>
        )}
      </div>
      
      {/* CONTENT: Minimized padding and font sizes */}
      <div className="p-2.5 flex flex-col flex-grow">
        {/* Brand / Platform */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-foreground line-clamp-1 pr-2">
            {deal.platform}
          </h3>
        </div>

        {/* Product Title */}
        <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5 leading-snug">
          {deal.title}
        </p>
        
        {/* Price Row */}
        <div className="flex items-baseline gap-1.5 mb-1.5">
          <span className="text-sm font-black text-foreground">₹{deal.discounted_price.toLocaleString()}</span>
          <span className="text-[10px] line-through text-muted-foreground">₹{deal.original_price.toLocaleString()}</span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">({deal.discount_percentage}% OFF)</span>
        </div>
        
        {/* Scarcity Indicator */}
        {isSellingFast && (
          <div className="flex items-center gap-1 mb-2 text-destructive">
            <span className="text-[10px] font-bold uppercase tracking-wider">Only Few Left!</span>
          </div>
        )}

        {/* Tiny Details Accordion */}
        {deal.description && (
          <div className="mb-2 mt-auto border-t border-border/50 pt-1.5">
            <button 
              onClick={(e) => { e.preventDefault(); setShowDetails(!showDetails); }}
              className="flex items-center justify-between w-full text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{showDetails ? 'Hide Details' : 'View Details'}</span>
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showDetails && (
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                {deal.description}
              </p>
            )}
          </div>
        )}
        
        {/* Compact CTA */}
        <a
          href={deal.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className={`mt-auto flex items-center justify-center gap-1.5 w-full bg-accent text-accent-foreground hover:brightness-110 h-8 rounded-md uppercase tracking-wide font-black text-[10px] transition-all active:scale-95 shadow-sm ${!deal.description && 'mt-2'}`}
        >
          <span>Claim Deal</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};

export default DealCard;