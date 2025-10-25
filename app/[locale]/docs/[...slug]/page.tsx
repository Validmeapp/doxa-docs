import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContentBySlug, getAllContentSlugs } from '@/lib/content-loader';
import { generateDocumentationMetadata, generateDocumentationJsonLd } from '@/lib/metadata-generator';
import { generateContentStructuredData, generateRichSnippets } from '@/lib/structured-data-extractor';
import { StructuredData } from '@/components/structured-data';
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
        params.push({
          locale,
          slug: slug.split('/').filter(Boolean),
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
    const content = await getContentBySlug(locale as Locale, 'v1', slugPath);
    
    if (!content) {
      return {};
    }

    return generateDocumentationMetadata(
      locale as Locale,
      'v1',
      slugPath,
      content.frontmatter
    );
  } catch (error) {
    console.error('Error generating metadata:', error);
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

  // Handle special case where slug is just ['v1'] - redirect to docs overview
  if (slug.length === 1 && slug[0] === 'v1') {
    // In development, we can't use redirect() with static export, so we'll show a message
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Documentation v1</h1>
          <p className="text-muted-foreground">
            You're viewing the v1 documentation. Navigate to specific pages:
          </p>
          <ul className="space-y-2">
            <li><a href={`/${locale}/docs/overview`} className="text-primary hover:underline">Overview</a></li>
            <li><a href={`/${locale}/docs/authentication`} className="text-primary hover:underline">Authentication</a></li>
            <li><a href={`/${locale}/docs/getting-started`} className="text-primary hover:underline">Getting Started</a></li>
          </ul>
        </div>
      );
    }
    notFound();
  }

  try {
    const slugPath = slug.join('/');
    const content = await getContentBySlug(locale as Locale, 'v1', slugPath);
    
    if (!content) {
      notFound();
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
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <header className="space-y-4 not-prose mb-8">
            <h1 className="text-4xl font-bold tracking-tight">
              {content.frontmatter.title}
            </h1>
            {content.frontmatter.description && (
              <p className="text-xl text-muted-foreground">
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
          
          <div dangerouslySetInnerHTML={{ __html: content.content }} />
          
          {content.frontmatter.lastModified && (
            <footer className="mt-12 pt-8 border-t text-sm text-muted-foreground not-prose">
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
    console.error('Error loading content:', error);
    notFound();
  }
}