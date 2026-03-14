import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DealCard from './DealCard';

const DealSection = ({ title, icon: Icon, deals, loading, section, onTrackClick }) => {
  const scrollRef = React.useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-3 mb-6">
          {Icon && <Icon className="h-6 w-6 text-accent" />}
          <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="min-w-[280px] h-[400px] bg-secondary/50 animate-pulse rounded-sm" />
          ))}
        </div>
      </section>
    );
  }

  if (!deals || deals.length === 0) {
    return null;
  }

  return (
    <section className="py-8" data-testid={`section-${section}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6 text-accent" />}
          <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="rounded-sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="rounded-sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {deals.map((deal) => (
          <div key={deal.id} className="min-w-[280px] flex-shrink-0">
            <DealCard deal={deal} section={section} onTrackClick={onTrackClick} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default DealSection;
