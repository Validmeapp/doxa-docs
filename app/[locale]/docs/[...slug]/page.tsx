import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getContentBySlug, getAllContentSlugs, contentLoader } from '@/lib/content-loader';
import { generateDocumentationMetadata, generateDocumentationJsonLd } from '@/lib/metadata-generator';
import { generateContentStructuredData, generateRichSnippets } from '@/lib/structured-data-extractor';
import { StructuredData } from '@/components/structured-data';
import { SyntaxHighlighter } from '@/components/syntax-highlighter';
import { MissingHomePage } from '@/components/missing-home-page';
import { ContentRenderer } from '@/components/content-renderer';

import { type Locale, locales } from '@/lib/locale-config';

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string[];
  }>;
}

export async function generateStaticParams() {
  const params = [];
  
  for (const locale of locales) {
    try {
      const slugs = await getAllContentSlugs(locale, 'v1');
      
      for (const slug of slugs) {
        // Add route with v1 prefix to match URL structure
        params.push({
          locale,
          slug: ['v1', ...slug.split('/').filter(Boolean)],
        });
      }
      
      // Add the v1 route for version-specific access
      params.push({
        locale,
        slug: ['v1'],
      });
    } catch (error) {
      // Content might not exist for this locale yet
      console.warn(`No content found for locale: ${locale}`);
    }
  }
  
  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale)) {
    return {};
  }

  try {
    const slugPath = slug.join('/');
    
    // If the slug starts with 'v1', remove it since we're already specifying version
    let actualSlug = slugPath;
    if (slugPath.startsWith('v1/')) {
      actualSlug = slugPath.substring(3); // Remove 'v1/' prefix
    } else if (slugPath === 'v1') {
      actualSlug = '';
    }
    
    // Use enhanced ContentLoader method
    const content = await contentLoader.getContentBySlug(locale as Locale, 'v1', actualSlug);
    
    if (!content || content.frontmatter.title === 'Missing Home Document') {
      return {};
    }

    return generateDocumentationMetadata(
      locale as Locale,
      'v1',
      slugPath,
      content.frontmatter
    );
  } catch (error) {
    console.error('Error generating metadata for documentation page:', error);
    return {};
  }
}

export default async function DocumentationPage({
  params,
}: PageProps) {
  const { locale, slug } = await params;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Handle empty slug array as home document request
  if (!slug || slug.length === 0) {
    // Redirect to the main docs page
    redirect(`/${locale}/docs`);
  }

  // Handle special case where slug is just ['v1'] - redirect to docs overview
  if (slug.length === 1 && slug[0] === 'v1') {
    // Redirect to the main docs page for v1
    redirect(`/${locale}/docs`);
  }

  try {
    const slugPath = slug.join('/');
    // If the slug starts with 'v1', remove it since we're already specifying version
    let actualSlug = slugPath;
    if (slugPath.startsWith('v1/')) {
      actualSlug = slugPath.substring(3); // Remove 'v1/' prefix
    } else if (slugPath === 'v1') {
      // This case is handled above, but just in case
      actualSlug = '';
    }
    
    // Use enhanced ContentLoader method for better error handling
    const content = await contentLoader.getContentBySlug(locale as Locale, 'v1', actualSlug);
    
    if (!content) {
      console.warn(`Content not found for slug: ${actualSlug}, locale: ${locale}, version: v1`);
      notFound();
    }

    // If this is somehow a missing home document (shouldn't happen in slug routes), redirect
    if (content.frontmatter.title === 'Missing Home Document') {
      redirect(`/${locale}/docs`);
    }

    // Generate breadcrumbs for structured data
    const breadcrumbs = [
      { name: 'Home', url: `/${locale}` },
      { name: 'Documentation', url: `/${locale}/docs` },
    ];

    // Add intermediate breadcrumbs based on slug path
    const pathParts = slug.slice(0, -1);
    let currentPath = `/${locale}/docs`;
    
    for (const part of pathParts) {
      currentPath += `/${part}`;
      breadcrumbs.push({
        name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
        url: currentPath,
      });
    }

    // Add current page
    breadcrumbs.push({
      name: content.frontmatter.title,
      url: `/${locale}/docs/${slugPath}`,
    });

    // Generate structured data
    const baseStructuredData = generateDocumentationJsonLd(
      locale as Locale,
      'v1',
      slugPath,
      content.frontmatter,
      breadcrumbs
    );

    // Generate content-specific structured data
    const contentStructuredData = generateContentStructuredData(
      locale as Locale,
      content.frontmatter,
      content.content
    );

    // Generate rich snippets
    const richSnippets = generateRichSnippets(
      locale as Locale,
      content.frontmatter,
      content.content
    );

    // Combine all structured data
    const allStructuredData = [
      ...baseStructuredData,
      ...contentStructuredData,
      richSnippets,
    ];

    return (
      <>
        <StructuredData data={allStructuredData} />
        <article className="prose dark:prose-invert max-w-none prose-gray">
          <SyntaxHighlighter />
          <header className="space-y-4 not-prose mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {content.frontmatter.title}
            </h1>
            {content.frontmatter.description && (
              <p className="text-xl text-gray-600 dark:text-gray-400">
                {content.frontmatter.description}
              </p>
            )}
            {content.frontmatter.deprecated && (
              <div className="p-4 border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⚠️ This documentation is deprecated and may be removed in a future version.
                </p>
              </div>
            )}
            {content.frontmatter.tags && content.frontmatter.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {content.frontmatter.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>
          
          <ContentRenderer 
            content={content.content}
            className="prose prose-lg max-w-none dark:prose-invert"
          />
          
          {content.frontmatter.lastModified && (
            <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 not-prose">
              Last updated: {new Date(content.frontmatter.lastModified).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </footer>
          )}
        </article>
      </>
    );
  } catch (error) {
    console.error('Error loading documentation page:', error);
    
    // Check if this is a content loading error vs a system error
    if (error instanceof Error && error.message.includes('not found')) {
      notFound();
    }
    
    // For other errors, show a more user-friendly error page
    return (
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <div className="not-prose mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Error Loading Page
              </h1>
              <p className="text-muted-foreground">
                An error occurred while loading this documentation page. Please try refreshing or go back to the <a href={`/${locale}/docs`} className="text-primary hover:underline">documentation home</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}