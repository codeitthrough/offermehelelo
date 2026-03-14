import React from 'react';
import { Flame, Zap, TrendingDown, TrendingUp, Award, Clock, ExternalLink } from 'lucide-react';

const DealBadge = ({ type }) => {
  const badges = {
    hot: {
      icon: Flame,
      label: 'Hot Deal',
      className: 'bg-red-500 text-white',
    },
    lightning: {
      icon: Zap,
      label: 'Limited Time',
      className: 'bg-yellow-500 text-black',
    },
    priceDrop: {
      icon: TrendingDown,
      label: 'Price Drop',
      className: 'bg-green-500 text-white',
    },
    topRated: {
      icon: Award,
      label: 'Top Rated',
      className: 'bg-purple-500 text-white',
    },
    trending: {
      icon: TrendingUp,
      label: 'Trending',
      className: 'bg-blue-500 text-white',
    },
    new: {
      icon: Clock,
      label: 'New',
      className: 'bg-indigo-500 text-white',
    },
  };

  const badge = badges[type];
  if (!badge) return null;

  const Icon = badge.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase ${badge.className}`}
      data-testid={`badge-${type}`}
    >
      <Icon className="h-3 w-3" />
      {badge.label}
    </div>
  );
};

export default DealBadge;
