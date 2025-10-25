/**
 * Comprehensive metadata generation utility for SEO optimization
 */

import { Metadata } from 'next';
import { PageFrontmatter } from './content-types';
import { Locale, locales, localeConfig } from '@/lib/locale-config';

interface MetadataOptions {
  locale: Locale;
  version?: string;
  path?: string;
  frontmatter?: PageFrontmatter;
  type?: 'website' | 'article';
  images?: Array<{
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  }>;
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const siteName = 'Documentation Portal';
const defaultDescription = 'Modern multilingual documentation portal with enterprise-grade UX for API documentation and knowledge base content.';

/**
 * Generate comprehensive metadata for pages
 */
export function generatePageMetadata(options: MetadataOptions): Metadata {
  const {
    locale,
    version = 'v1',
    path = '',
    frontmatter,
    type = 'article',
    images = []
  } = options;

  const localeInfo = localeConfig[locale];
  const title = frontmatter?.title || 'Documentation';
  const description = frontmatter?.description || defaultDescription;
  
  // Construct canonical URL
  const canonicalPath = path ? `/${locale}/${version}/${path}` : `/${locale}`;
  const canonicalUrl = `${baseUrl}${canonicalPath}`;

  // Generate hreflang alternates
  const alternateLanguages = Object.fromEntries(
    locales.map((loc) => [
      loc,
      path ? `/${loc}/${version}/${path}` : `/${loc}`
    ])
  );

  // Default OpenGraph image
  const defaultImage = {
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: title,
  };

  // Combine provided images with default
  const ogImages = images.length > 0 ? images : [defaultImage];

  // Generate OpenGraph locale
  const ogLocale = getOpenGraphLocale(locale);
  const alternateLocales = locales
    .filter((loc) => loc !== locale)
    .map(getOpenGraphLocale);

  // Keywords from frontmatter tags
  const keywords = [
    'documentation',
    'API',
    'developer',
    'guides',
    ...(frontmatter?.tags || [])
  ];

  const metadata: Metadata = {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    keywords,
    authors: [{ name: 'Documentation Team' }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
    openGraph: {
      type,
      locale: ogLocale,
      alternateLocale: alternateLocales,
      url: canonicalUrl,
      title,
      description,
      siteName,
      images: ogImages,
      ...(frontmatter?.lastModified && {
        modifiedTime: frontmatter.lastModified,
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ogImages.map(img => img.url),
    },
    robots: {
      index: !frontmatter?.deprecated,
      follow: true,
      googleBot: {
        index: !frontmatter?.deprecated,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  // Add article-specific metadata
  if (type === 'article' && frontmatter) {
    metadata.openGraph = {
      ...metadata.openGraph,
      type: 'article',
      ...(frontmatter.lastModified && {
        publishedTime: frontmatter.lastModified,
        modifiedTime: frontmatter.lastModified,
      }),
      tags: frontmatter.tags,
    };
  }

  return metadata;
}

/**
 * Convert locale to OpenGraph locale format
 */
function getOpenGraphLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    en: 'en_US',
    es: 'es_ES',
  };
  return localeMap[locale];
}

/**
 * Generate metadata for documentation pages with content
 */
export function generateDocumentationMetadata(
  locale: Locale,
  version: string,
  path: string,
  frontmatter: PageFrontmatter
): Metadata {
  return generatePageMetadata({
    locale,
    version,
    path,
    frontmatter,
    type: 'article',
  });
}

/**
 * Generate metadata for section/category pages
 */
export function generateSectionMetadata(
  locale: Locale,
  version: string,
  section: string,
  title: string,
  description: string
): Metadata {
  return generatePageMetadata({
    locale,
    version,
    path: section,
    frontmatter: {
      title,
      description,
      version,
      locale,
      order: 0,
    },
    type: 'website',
  });
}

/**
 * Generate metadata for the home page
 */
export function generateHomeMetadata(locale: Locale): Metadata {
  const localeInfo = localeConfig[locale];
  
  const localizedTitles: Record<Locale, string> = {
    en: 'Documentation Portal',
    es: 'Portal de Documentación',
  };

  const localizedDescriptions: Record<Locale, string> = {
    en: 'Modern multilingual documentation portal with enterprise-grade UX for API documentation and knowledge base content.',
    es: 'Portal de documentación multilingüe moderno con UX de nivel empresarial para documentación de API y contenido de base de conocimientos.',
  };

  return generatePageMetadata({
    locale,
    frontmatter: {
      title: localizedTitles[locale],
      description: localizedDescriptions[locale],
      version: 'v1',
      locale,
      order: 0,
    },
    type: 'website',
  });
}

/**
 * Generate JSON-LD structured data for documentation pages
 */
export function generateDocumentationJsonLd(
  locale: Locale,
  version: string,
  path: string,
  frontmatter: PageFrontmatter,
  breadcrumbs?: Array<{ name: string; url: string }>
) {
  const canonicalUrl = `${baseUrl}/${locale}/${version}/${path}`;
  
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: frontmatter.title,
    description: frontmatter.description,
    url: canonicalUrl,
    datePublished: frontmatter.lastModified,
    dateModified: frontmatter.lastModified,
    author: {
      '@type': 'Organization',
      name: 'Documentation Team',
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    inLanguage: locale,
    ...(frontmatter.tags && {
      keywords: frontmatter.tags.join(', '),
    }),
  };

  // Add breadcrumb structured data if provided
  if (breadcrumbs && breadcrumbs.length > 0) {
    const breadcrumbStructuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: `${baseUrl}${crumb.url}`,
      })),
    };

    return [structuredData, breadcrumbStructuredData];
  }

  return [structuredData];
}

/**
 * Generate organization structured data
 */
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteName,
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    sameAs: [
      // Add social media URLs here
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English', 'Spanish', 'Portuguese'],
    },
  };
}

/**
 * Generate website structured data
 */
export function generateWebsiteJsonLd(locale: Locale) {
  const localizedNames: Record<Locale, string> = {
    en: 'Documentation Portal',
    es: 'Portal de Documentación',
  };

  const localizedDescriptions: Record<Locale, string> = {
    en: 'Modern multilingual documentation portal with enterprise-grade UX for API documentation and knowledge base content.',
    es: 'Portal de documentación multilingüe moderno con UX de nivel empresarial para documentación de API y contenido de base de conocimientos.',
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: localizedNames[locale],
    description: localizedDescriptions[locale],
    url: `${baseUrl}/${locale}`,
    inLanguage: locale,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/${locale}/docs?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: siteName,
    },
  };
}

/**
 * Generate FAQ structured data for documentation sections
 */
export function generateFAQJsonLd(
  locale: Locale,
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
    inLanguage: locale,
  };
}

/**
 * Generate HowTo structured data for tutorial pages
 */
export function generateHowToJsonLd(
  locale: Locale,
  title: string,
  description: string,
  steps: Array<{ name: string; text: string; image?: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: title,
    description,
    inLanguage: locale,
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: {
          '@type': 'ImageObject',
          url: step.image,
        },
      }),
    })),
  };
}

/**
 * Generate SoftwareApplication structured data for API documentation
 */
export function generateSoftwareApplicationJsonLd(locale: Locale) {
  const localizedNames: Record<Locale, string> = {
    en: 'Digital Identity API',
    es: 'API de Identidad Digital',
  };

  const localizedDescriptions: Record<Locale, string> = {
    en: 'Decentralized digital identity platform API for secure authentication and identity management.',
    es: 'API de plataforma de identidad digital descentralizada para autenticación segura y gestión de identidad.',
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: localizedNames[locale],
    description: localizedDescriptions[locale],
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    provider: {
      '@type': 'Organization',
      name: siteName,
    },
    inLanguage: locale,
  };
}