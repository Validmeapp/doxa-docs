/**
 * Sitemap generation utility for SEO optimization
 */

import { getAllContentSlugs, getContentBySlug } from './content-loader';
import { Locale, locales } from '@/lib/locale-config';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface SitemapUrl {
  url: string;
  lastModified?: string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternateLanguages?: Array<{
    hreflang: string;
    href: string;
  }>;
}

/**
 * Generate sitemap URLs for a specific locale and version
 */
export async function generateSitemapUrls(locale: Locale, version: string = 'v1'): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];

  try {
    // Add home page
    urls.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 1.0,
      alternateLanguages: locales.map(loc => ({
        hreflang: loc,
        href: `${baseUrl}/${loc}`,
      })),
    });

    // Add docs home page
    urls.push({
      url: `${baseUrl}/${locale}/docs`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.9,
      alternateLanguages: locales.map(loc => ({
        hreflang: loc,
        href: `${baseUrl}/${loc}/docs`,
      })),
    });

    // Get all content slugs for this locale
    const slugs = await getAllContentSlugs(locale, version);

    // Add documentation pages
    for (const slug of slugs) {
      try {
        const content = await getContentBySlug(locale, version, slug);
        if (content) {
          const url = `${baseUrl}/${locale}/docs/${slug}`;
          const lastModified = content.frontmatter.lastModified || new Date().toISOString();
          
          // Generate alternate language URLs
          const alternateLanguages: Array<{ hreflang: string; href: string }> = [];
          
          for (const altLocale of locales) {
            if (altLocale !== locale) {
              // Check if content exists in alternate language
              try {
                const altContent = await getContentBySlug(altLocale, version, slug);
                if (altContent) {
                  alternateLanguages.push({
                    hreflang: altLocale,
                    href: `${baseUrl}/${altLocale}/docs/${slug}`,
                  });
                }
              } catch {
                // Content doesn't exist in this language, skip
              }
            }
          }

          // Add current language
          alternateLanguages.push({
            hreflang: locale,
            href: url,
          });

          urls.push({
            url,
            lastModified,
            changeFrequency: content.frontmatter.deprecated ? 'yearly' : 'monthly',
            priority: content.frontmatter.deprecated ? 0.3 : 0.8,
            alternateLanguages,
          });
        }
      } catch (error) {
        console.warn(`Failed to process content for slug: ${slug}`, error);
      }
    }
  } catch (error) {
    console.error(`Failed to generate sitemap URLs for ${locale}:`, error);
  }

  return urls;
}

/**
 * Generate XML sitemap content
 */
export function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlElements = urls.map(urlData => {
    const alternates = urlData.alternateLanguages
      ? urlData.alternateLanguages
          .map(alt => `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${alt.href}" />`)
          .join('\n')
      : '';

    return `  <url>
    <loc>${urlData.url}</loc>
    ${urlData.lastModified ? `<lastmod>${urlData.lastModified}</lastmod>` : ''}
    ${urlData.changeFrequency ? `<changefreq>${urlData.changeFrequency}</changefreq>` : ''}
    ${urlData.priority ? `<priority>${urlData.priority}</priority>` : ''}
${alternates}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlElements}
</urlset>`;
}

/**
 * Generate sitemap index XML
 */
export function generateSitemapIndexXml(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
  const sitemapElements = sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap.loc}</loc>
    ${sitemap.lastmod ? `<lastmod>${sitemap.lastmod}</lastmod>` : ''}
  </sitemap>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapElements}
</sitemapindex>`;
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Disallow search parameters
Disallow: /*?*

# Disallow temporary or development paths
Disallow: /api/
Disallow: /_next/
Disallow: /temp/
Disallow: /.temp/

# Allow specific API endpoints that should be indexed
Allow: /api/health
Allow: /api/config`;
}

/**
 * Get sitemap file name for locale and version
 */
export function getSitemapFileName(locale: Locale, version: string): string {
  return `sitemap-${locale}-${version}.xml`;
}

/**
 * Generate all sitemaps for all locales and versions
 */
export async function generateAllSitemaps(): Promise<{
  sitemaps: Array<{ filename: string; content: string; locale: Locale; version: string }>;
  sitemapIndex: string;
  robotsTxt: string;
}> {
  const sitemaps = [];
  const sitemapIndexEntries = [];
  const versions = ['v1']; // Add more versions as needed

  for (const locale of locales) {
    for (const version of versions) {
      try {
        const urls = await generateSitemapUrls(locale, version);
        if (urls.length > 0) {
          const filename = getSitemapFileName(locale, version);
          const content = generateSitemapXml(urls);
          
          sitemaps.push({
            filename,
            content,
            locale,
            version,
          });

          sitemapIndexEntries.push({
            loc: `${baseUrl}/${filename}`,
            lastmod: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(`Failed to generate sitemap for ${locale} ${version}:`, error);
      }
    }
  }

  const sitemapIndex = generateSitemapIndexXml(sitemapIndexEntries);
  const robotsTxt = generateRobotsTxt();

  return {
    sitemaps,
    sitemapIndex,
    robotsTxt,
  };
}