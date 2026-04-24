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
      <section className="py-8">
        <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Popular Platforms</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-secondary/50 animate-pulse rounded-none"></div>
          ))}
        </div>
      </section>
    );
  }

  if (platforms.length === 0) return null;

  return (
    <section className="py-8">
      <h2 className="text-2xl font-black uppercase tracking-tight mb-6">Popular Platforms</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {platforms.map((platform) => (
          <a
            key={platform.id}
            href={platform.affiliate_link}
            target="_blank"
            rel="noopener noreferrer"
            className="platform-tile group border rounded-none bg-card hover:bg-secondary/50 transition-all duration-300 hover:shadow-lg overflow-hidden"
          >
            <div className="p-4 flex flex-col items-center justify-center h-32">
              {platform.image_url ? (
                <img src={platform.image_url} alt={platform.name} className="h-8 w-auto object-contain mb-1.5 group-hover:scale-110 transition-transform" />
              ) : (
                <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center mb-2">
                  <span className="text-xl font-black">{platform.name.charAt(0)}</span>
                </div>
              )}
              <h3 className="font-bold text-xs text-center">{platform.name}</h3>
              {platform.offer_percentage > 0 && (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  Up to {platform.offer_percentage}% off
                </p>
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