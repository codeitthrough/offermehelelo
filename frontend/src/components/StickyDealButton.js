import React, { useState, useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StickyDealButton = ({ deal, onTrackClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show button after scrolling 300px
      if (window.scrollY > 300 && !isDismissed) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isDismissed]);

  if (!deal || isDismissed) return null;

  const handleClick = () => {
    if (onTrackClick) {
      onTrackClick(deal.id, deal.product_url || deal.affiliate_link, 'sticky-button', 'home');
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground p-4 shadow-2xl transition-transform duration-300 md:hidden ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      data-testid="sticky-deal-button"
    >
      <div className="flex items-center justify-between gap-4 max-w-[1600px] mx-auto">
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider opacity-90 mb-1">Top Deal</p>
          <p className="font-bold text-sm truncate">{deal.title}</p>
          <p className="text-lg font-black">₹{deal.discounted_price.toLocaleString()}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <a
            href={deal.affiliate_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 h-12 px-6 rounded-sm uppercase tracking-wide font-bold text-sm whitespace-nowrap"
          >
            <span>Get Deal</span>
            <ExternalLink className="h-4 w-4" />
          </a>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDismissed(true)}
            className="text-primary-foreground hover:text-primary-foreground/80"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StickyDealButton;
