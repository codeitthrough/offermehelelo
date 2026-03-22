import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = 'Offer Me He Lelo! - Best Deals & Discounts',
  description = 'Find the best deals and discounts from Amazon, Flipkart and more. Save up to 80% on electronics, fashion, home appliances and more.',
  type = 'website',
  image = 'https://images.unsplash.com/photo-1634340368854-7d92d2fb57c4?crop=entropy&cs=srgb&fm=jpg&q=85',
  url,
  productData
}) => {
  const siteUrl = 'https://offermehelelo.onrender.com';
  const fullUrl = url ? `${siteUrl}${url}` : siteUrl;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:site_name" content="Offer Me He Lelo!" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Product Structured Data */}
      {productData && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": productData.title,
            "image": productData.image_url,
            "description": productData.description || productData.title,
            "brand": {
              "@type": "Brand",
              "name": productData.platform
            },
            "offers": {
              "@type": "Offer",
              "url": fullUrl,
              "priceCurrency": "INR",
              "price": productData.discounted_price,
              "priceValidUntil": new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              "availability": "https://schema.org/InStock",
              "seller": {
                "@type": "Organization",
                "name": productData.platform
              }
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.5",
              "reviewCount": "100"
            }
          })}
        </script>
      )}

      {/* Organization Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Offer Me He Lelo!",
          "url": siteUrl,
          "logo": `${siteUrl}/logo.png`,
          "description": "Best deals and discounts aggregator platform",
          "sameAs": [
            "https://twitter.com/dealstriker",
            "https://facebook.com/dealstriker"
          ]
        })}
      </script>

      {/* Breadcrumb Structured Data */}
      {url && url !== '/' && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": siteUrl
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": title.split('|')[0].trim(),
                "item": fullUrl
              }
            ]
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
