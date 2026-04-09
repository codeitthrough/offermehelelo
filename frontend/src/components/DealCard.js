import React from 'react';
import { ExternalLink } from 'lucide-react';
import DealBadge from './DealBadge';

const DealCard = ({ deal, section = 'general', page = 'home', onTrackClick }) => {
  const handleClick = () => {
    if (onTrackClick) {
      onTrackClick(deal.id, deal.product_url || deal.affiliate_link, section, page);
    }
  };

  return (
    <div
      className="deal-card border rounded-xl bg-card shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col h-full"
      data-testid={`deal-card-${deal.id}`}
    >
      <div className="relative overflow-hidden w-full h-48 bg-secondary/40 animate-pulse shrink-0">
        <img
          src={
            deal.image_url ||
            'https://images.unsplash.com/photo-1621534222671-05b508d16bb8?crop=entropy&cs=srgb&fm=jpg&q=85'
          }
          alt={deal.title}
          loading="lazy"
          className="w-full h-full object-cover transition-all duration-500 opacity-0 group-hover:scale-105"
          onLoad={(e) => {
            e.target.classList.remove('opacity-0');
            e.target.parentElement.classList.remove('animate-pulse');
          }}
        />
        
        {/* Discount Badge */}
        <div className="absolute top-3 left-3 bg-accent text-accent-foreground px-3 py-1 font-bold text-sm uppercase rounded-md shadow-md">
          {deal.discount_percentage}% OFF
        </div>
        
        {/* Platform Badge */}
        <div className="absolute top-3 right-3 bg-background/90 backdrop-blur-sm text-foreground px-2 py-1 text-xs uppercase font-bold rounded-md shadow-sm">
          {deal.platform}
        </div>
        
        {/* Status Badges */}
        <div className="absolute bottom-3 left-3 flex flex-col gap-1.5">
          {deal.is_hot_deal && <DealBadge type="hot" />}
          {deal.is_lightning_deal && <DealBadge type="lightning" />}
          {deal.is_price_drop && <DealBadge type="priceDrop" />}
          {deal.deal_score > 70 && <DealBadge type="topRated" />}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-accent transition-colors">
          {deal.title}
        </h3>
        
        {deal.category_name && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-auto pb-3">
            {deal.category_name}
          </p>
        )}
        
        <div className="flex items-baseline gap-2 mb-3 mt-2">
          <span className="text-2xl font-extrabold text-foreground">
            ₹{deal.discounted_price.toLocaleString()}
          </span>
          <span className="text-sm font-medium line-through text-muted-foreground">
            ₹{deal.original_price.toLocaleString()}
          </span>
        </div>
        
        {deal.price_drop_percentage > 0 && (
          <p className="text-xs text-emerald-500 font-bold mb-3">
            Additional {deal.price_drop_percentage.toFixed(1)}% price drop!
          </p>
        )}
        
        {deal.deal_score > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(deal.deal_score, 100)}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold text-muted-foreground">{deal.deal_score.toFixed(0)}</span>
          </div>
        )}
        
        <a
          href={deal.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="mt-auto inline-flex items-center justify-center gap-2 w-full bg-accent text-accent-foreground hover:brightness-110 h-11 px-6 rounded-lg uppercase tracking-wide font-bold text-sm transition-all active:scale-95"
        >
          <span>Get Deal</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default DealCard;