import React, { useState, useEffect } from 'react';

const messages = [
  "🔥 Finding the hottest deals for you...",
  "Waking up servers ☕ (first load takes a few seconds)...",
  "Analyzing discounts...",
  "Scoring the best offers...",
  "Comparing prices across platforms..."
];

export default function LoadingMessages() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500 font-medium">
      <div className="animate-bounce mb-2 text-2xl">🛍️</div>
      <p className="transition-opacity duration-500">{messages[index]}</p>
    </div>
  );
}