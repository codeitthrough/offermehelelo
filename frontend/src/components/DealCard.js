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
      className="deal-card border rounded-none bg-card overflow-hidden group"
      data-testid={`deal-card-${deal.id}`}
    >
      <div className="relative overflow-hidden">
        <img
          src={
            deal.image_url ||
            'https://images.unsplash.com/photo-1621534222671-05b508d16bb8?crop=entropy&cs=srgb&fm=jpg&q=85'
          }
          alt={deal.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Discount Badge */}
        <div className="absolute top-2 left-2 bg-accent text-accent-foreground px-3 py-1 font-black text-sm uppercase shadow-lg">
          {deal.discount_percentage}% OFF
        </div>
        
        {/* Platform Badge */}
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 text-xs uppercase font-semibold">
          {deal.platform}
        </div>
        
        {/* Status Badges */}
        <div className="absolute bottom-2 left-2 flex flex-col gap-1">
          {deal.is_hot_deal && <DealBadge type="hot" />}
          {deal.is_lightning_deal && <DealBadge type="lightning" />}
          {deal.is_price_drop && <DealBadge type="priceDrop" />}
          {deal.deal_score > 70 && <DealBadge type="topRated" />}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-accent transition-colors">
          {deal.title}
        </h3>
        
        {deal.category_name && (
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
            {deal.category_name}
          </p>
        )}
        
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-black text-accent">
            ₹{deal.discounted_price.toLocaleString()}
          </span>
          <span className="text-sm line-through text-muted-foreground">
            ₹{deal.original_price.toLocaleString()}
          </span>
        </div>
        
        {deal.price_drop_percentage > 0 && (
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-2">
            Additional {deal.price_drop_percentage.toFixed(1)}% price drop!
          </p>
        )}
        
        {deal.deal_score > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${Math.min(deal.deal_score, 100)}%` }}
              ></div>
            </div>
            <span className="text-xs font-bold">{deal.deal_score.toFixed(0)}</span>
          </div>
        )}
        
        <a
          href={deal.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="inline-flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-sm uppercase tracking-wide font-bold text-sm transition-all hover:shadow-lg"
          data-testid={`deal-link-${deal.id}`}
        >
          <span>Get Deal</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default DealCard;
