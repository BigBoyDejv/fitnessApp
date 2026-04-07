import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * Reusable SEO component to manage page metadata
 * @param {string} title - Page title (prefixed to ' | Fitness Pro')
 * @param {string} description - Meta description for the page
 * @param {string} canonical - Canonical URL for the page
 * @param {string} ogType - Open Graph type (default: 'website')
 * @param {string} ogImage - Open Graph image URL
 */
const SEO = ({ 
  title, 
  description, 
  canonical, 
  ogType = 'website', 
  ogImage = '/og-image.jpg' 
}) => {
  const siteTitle = 'Fitness Pro';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph tags */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      {/* Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
};

export default SEO;
