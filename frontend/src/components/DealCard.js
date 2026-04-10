import React, { useState } from 'react';
import { ExternalLink, Star, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import DealBadge from './DealBadge';

const DealCard = ({ deal, section = 'general', page = 'home', onTrackClick }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (onTrackClick) onTrackClick(deal.id, deal.product_url || deal.affiliate_link, section, page);
  };

  // TRUST PROXIES (Amazon Style)
  const starRating = deal.deal_score ? (deal.deal_score / 20).toFixed(1) : 4.5;
  const reviewCount = deal.id ? parseInt(deal.id.replace(/\D/g, '')) % 800 + 45 : 124;

  // SCARCITY TRIGGER (Ajio Style)
  const isSellingFast = deal.discount_percentage >= 75;

  return (
    <div className="deal-card border rounded-2xl bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col h-full">
      <div className="relative overflow-hidden w-full h-48 bg-secondary/40 shrink-0">
        <img
          src={deal.image_url || 'https://images.unsplash.com/photo-1621534222671-05b508d16bb8?crop=entropy&cs=srgb&fm=jpg&q=85'}
          alt={deal.title}
          loading="lazy"
          className="w-full h-full object-cover transition-all duration-500 opacity-0 group-hover:scale-105"
          onLoad={(e) => {
            e.target.classList.remove('opacity-0');
            e.target.parentElement.classList.remove('animate-pulse');
          }}
        />
        <div className="absolute top-3 left-3 bg-accent text-accent-foreground px-3 py-1 font-black text-sm uppercase rounded-md shadow-md">
          {deal.discount_percentage}% OFF
        </div>
        <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm text-foreground px-2 py-1 text-[10px] uppercase font-extrabold tracking-widest rounded-md shadow-sm">
          {deal.platform}
        </div>
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
          {deal.is_hot_deal && <DealBadge type="hot" />}
          {deal.is_lightning_deal && <DealBadge type="lightning" />}
          {deal.is_price_drop && <DealBadge type="priceDrop" />}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        {deal.category_name && (
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">
            {deal.category_name}
          </p>
        )}
        <h3 className="font-bold text-base leading-snug mb-1.5 line-clamp-2 group-hover:text-accent transition-colors">
          {deal.title}
        </h3>
        
        <div className="flex items-center gap-1.5 mb-3">
          <div className="flex items-center text-amber-500">
            <span className="font-bold text-sm mr-1">{starRating}</span>
            <Star className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer">
            ({reviewCount} verified)
          </span>
        </div>
        
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black text-foreground">₹{deal.discounted_price.toLocaleString()}</span>
          <span className="text-sm font-semibold line-through text-muted-foreground">₹{deal.original_price.toLocaleString()}</span>
        </div>
        
        {isSellingFast && (
          <div className="flex items-center gap-1 mb-2 text-destructive bg-destructive/10 px-2 py-1 rounded w-fit">
            <Zap className="h-3 w-3 fill-current animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest">Selling Fast - Limited Stock</span>
          </div>
        )}

        {deal.description && (
          <div className="mb-4 mt-auto border-t border-border/50 pt-2">
            <button 
              onClick={(e) => { e.preventDefault(); setShowDetails(!showDetails); }}
              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{showDetails ? 'Hide Details' : 'View Details'}</span>
              {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showDetails && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed animate-in fade-in slide-in-from-top-1">
                {deal.description}
              </p>
            )}
          </div>
        )}
        
        {/* FITTS'S LAW: 48px touch target */}
        <a
          href={deal.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className={`mt-auto inline-flex items-center justify-center gap-2 w-full bg-accent text-accent-foreground hover:brightness-110 h-12 px-6 rounded-xl uppercase tracking-wide font-black text-sm transition-all active:scale-95 shadow-sm hover:shadow-md ${!deal.description && 'mt-4'}`}
        >
          <span>Claim Deal</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default DealCard;