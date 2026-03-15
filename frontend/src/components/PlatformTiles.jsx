import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '@/App';
import { ExternalLink } from 'lucide-react';

const PlatformTiles = () => {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    try {
      const response = await axios.get(`${API}/platforms?active_only=true`);
      setPlatforms(response.data);
    } catch (error) {
      console.error('Error fetching platforms:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-8" data-testid="platform-tiles-loading">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Popular Platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-secondary/50 animate-pulse rounded-none"></div>
          ))}
        </div>
      </section>
    );
  }

  if (platforms.length === 0) {
    return null;
  }

  return (
    <section className="py-8" data-testid="platform-tiles">
      <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Popular Platforms</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {platforms.map((platform) => (
          <a
            key={platform.id}
            href={platform.affiliate_link}
            target="_blank"
            rel="noopener noreferrer"
            className="platform-tile group border rounded-none bg-card hover:bg-secondary/50 transition-all duration-300 hover:shadow-lg overflow-hidden"
            data-testid={`platform-tile-${platform.id}`}
          >
            <div className="p-4 flex flex-col items-center justify-center h-32">
              {platform.image_url ? (
                <img
                  src={platform.image_url}
                  alt={platform.name}
                  className="h-12 w-auto object-contain mb-2 group-hover:scale-110 transition-transform"
                />
              ) : (
                <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mb-2">
                  <span className="text-xl font-black">{platform.name.charAt(0)}</span>
                </div>
              )}
              <h3 className="font-bold text-sm text-center">{platform.name}</h3>
              {platform.offer_percentage > 0 && (
                <p className="text-xs text-accent font-semibold mt-1">Up to {platform.offer_percentage}% off</p>
              )}
            </div>
            <div className="bg-primary text-primary-foreground py-2 px-3 flex items-center justify-center gap-1 text-xs font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Visit</span>
              <ExternalLink className="h-3 w-3" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export default PlatformTiles;
