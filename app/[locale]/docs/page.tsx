import { Metadata } from 'next';
import { generateSectionMetadata } from '@/lib/metadata-generator';
import { type Locale } from '@/lib/locale-config';
import { contentLoader } from '@/lib/content-loader';
import { MissingHomePage } from '@/components/missing-home-page';
import { ContentRenderer } from '@/components/content-renderer';

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const version = 'v1'; // TODO: Make this dynamic when version routing is implemented
  
  try {
    // Use enhanced ContentLoader home document method
    const homeContent = await contentLoader.getHomeDocument(locale, version);
    
    if (homeContent && homeContent.frontmatter.title !== 'Missing Home Document') {
      return generateSectionMetadata(
        locale,
        version,
        'docs',
        homeContent.frontmatter.title,
        homeContent.frontmatter.description
      );
    }

    // Fallback metadata for missing home document
    const localizedTitles: Record<Locale, string> = {
      en: 'Documentation Overview',
      es: 'Resumen de Documentación',
    };

    const localizedDescriptions: Record<Locale, string> = {
      en: 'Welcome to the documentation portal. Find comprehensive guides and API references.',
      es: 'Bienvenido al portal de documentación. Encuentra guías completas y referencias de API.',
    };

    return generateSectionMetadata(
      locale,
      version,
      'docs',
      localizedTitles[locale],
      localizedDescriptions[locale]
    );
  } catch (error) {
    console.error('Error generating metadata for docs home page:', error);
    
    // Fallback metadata on error
    return generateSectionMetadata(
      locale,
      version,
      'docs',
      'Documentation',
      'Documentation portal'
    );
  }
}

export default async function DocsHomePage({
  params,
}: PageProps) {
  const { locale } = await params;
  const version = 'v1'; // TODO: Make this dynamic when version routing is implemented
  
  try {
    // Use enhanced ContentLoader home document method
    const homeContent = await contentLoader.getHomeDocument(locale, version);
    
    if (!homeContent) {
      // This should rarely happen since getHomeDocument provides fallback
      return (
        <div className="prose prose-slate max-w-none dark:prose-invert">
          <div className="not-prose mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20">
                <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  Error Loading Documentation
                </h1>
                <p className="text-muted-foreground">
                  Unable to load the documentation home page. Please try again later.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if this is the synthetic fallback content (missing home document)
    const isMissingHome = homeContent.frontmatter.title === 'Missing Home Document';
    
    if (isMissingHome) {
      // Get available content for the missing home page component
      try {
        const availableContent = await contentLoader.getAllContentSlugs(locale, version);
        
        return (
          <MissingHomePage
            locale={locale}
            version={version}
            availableContent={availableContent}
          />
        );
      } catch (error) {
        console.error('Error loading available content for missing home page:', error);
        
        // Fallback with empty content list
        return (
          <MissingHomePage
            locale={locale}
            version={version}
            availableContent={[]}
          />
        );
      }
    }

    // Render the actual home document content
    return (
      <article className="prose prose-slate max-w-none dark:prose-invert">
        <header className="space-y-4 not-prose mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {homeContent.frontmatter.title}
          </h1>
          {homeContent.frontmatter.description && (
            <p className="text-xl text-gray-600 dark:text-gray-400">
              {homeContent.frontmatter.description}
            </p>
          )}
          {homeContent.frontmatter.deprecated && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                ⚠️ This documentation is deprecated and may be removed in a future version.
              </p>
            </div>
          )}
          {homeContent.frontmatter.tags && homeContent.frontmatter.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {homeContent.frontmatter.tags.map((tag: string) => (
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
        
        <ContentRenderer content={homeContent.content} />
        
        {homeContent.frontmatter.lastModified && (
          <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 not-prose">
            Last updated: {new Date(homeContent.frontmatter.lastModified).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </footer>
        )}
      </article>
    );
  } catch (error) {
    console.error('Error loading docs home page:', error);
    
    // Error fallback
    return (
      <div className="prose prose-slate max-w-none dark:prose-invert">
        <div className="not-prose mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20">
              <span className="text-red-600 dark:text-red-400 text-xl">⚠️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">
                Error Loading Documentation
              </h1>
              <p className="text-muted-foreground">
                An error occurred while loading the documentation. Please try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}