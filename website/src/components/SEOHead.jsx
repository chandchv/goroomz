import React from 'react';
import { Helmet } from 'react-helmet';

/**
 * SEOHead - Comprehensive SEO component with structured data, Open Graph, and Twitter Cards
 * 
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Meta description (max 160 chars recommended)
 * @param {string} props.canonical - Canonical URL
 * @param {string} props.ogImage - Open Graph image URL
 * @param {string} props.ogType - Open Graph type (website, article, place)
 * @param {Object} props.structuredData - JSON-LD structured data object
 * @param {Array} props.breadcrumbs - Breadcrumb items [{name, url}]
 * @param {string} props.keywords - Meta keywords
 * @param {Object} props.location - Location data for local business schema
 */
const SEOHead = ({
  title,
  description,
  canonical,
  ogImage = 'https://goroomz.in/logo-512.png',
  ogType = 'website',
  structuredData,
  breadcrumbs,
  keywords,
  location,
  noindex = false,
}) => {
  const siteUrl = 'https://goroomz.in';
  const fullCanonical = canonical ? (canonical.startsWith('http') ? canonical : `${siteUrl}${canonical}`) : undefined;
  const fullTitle = title?.includes('GoRoomz') ? title : `${title} | GoRoomz`;

  // Generate breadcrumb structured data
  const breadcrumbSchema = breadcrumbs?.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url ? `${siteUrl}${item.url}` : undefined,
    })),
  } : null;

  // Organization schema (always present)
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "GoRoomz",
    "url": siteUrl,
    "logo": `${siteUrl}/logo-512.png`,
    "description": "Find verified PGs, hostels, and rooms in Bangalore with zero brokerage. Direct owner contact.",
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@goroomz.in",
      "contactType": "customer service",
      "areaServed": "IN",
      "availableLanguage": ["English", "Hindi", "Kannada"],
    },
    "sameAs": [],
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Bangalore",
      "addressRegion": "Karnataka",
      "addressCountry": "IN",
    },
  };

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {fullCanonical && <link rel="canonical" href={fullCanonical} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {fullCanonical && <meta property="og:url" content={fullCanonical} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="GoRoomz" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* Geo Meta (for local SEO) */}
      {location && (
        <>
          <meta name="geo.region" content="IN-KA" />
          <meta name="geo.placename" content={location.city || 'Bangalore'} />
          {location.latitude && location.longitude && (
            <meta name="geo.position" content={`${location.latitude};${location.longitude}`} />
          )}
        </>
      )}

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      )}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;

/**
 * Generate LodgingBusiness schema for a property
 */
export function generatePropertySchema(property) {
  if (!property) return null;

  const price = property.metadata?.pgOptions?.basePrice || property.price || 0;
  const area = property.location?.area || '';
  const city = property.location?.city || 'Bangalore';

  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": property.name || property.title,
    "description": property.description || `${property.name} - PG accommodation in ${area}, ${city}`,
    "url": `https://goroomz.in/pg/${property.slug || property.id}`,
    "image": property.images?.[0] ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0]?.url) : undefined,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": property.location?.address || '',
      "addressLocality": city,
      "addressRegion": property.location?.state || 'Karnataka',
      "addressCountry": "IN",
      "postalCode": property.location?.pincode || '',
    },
    ...(property.location?.coordinates?.latitude && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": property.location.coordinates.latitude,
        "longitude": property.location.coordinates.longitude,
      },
    }),
    ...(price > 0 && {
      "priceRange": `₹${price.toLocaleString()} - ₹${(price * 2).toLocaleString()} per month`,
    }),
    ...(property.rating?.average > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": property.rating.average,
        "reviewCount": property.rating.count || 1,
        "bestRating": 5,
        "worstRating": 1,
      },
    }),
    "amenityFeature": (property.amenities || []).map(a => ({
      "@type": "LocationFeatureSpecification",
      "name": a,
      "value": true,
    })),
    ...(property.contactInfo?.phone && {
      "telephone": property.contactInfo.phone,
    }),
  };
}

/**
 * Generate FAQ schema
 */
export function generateFAQSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };
}

/**
 * Generate ItemList schema for listing pages
 */
export function generateListingSchema(properties, listName, listUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": listName,
    "url": `https://goroomz.in${listUrl}`,
    "numberOfItems": properties.length,
    "itemListElement": properties.slice(0, 10).map((property, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": property.name || property.title,
      "url": `https://goroomz.in/pg/${property.slug || property.id}`,
    })),
  };
}
