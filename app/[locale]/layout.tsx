import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { generateHomeMetadata, generateWebsiteJsonLd } from '@/lib/metadata-generator';
import { StructuredData } from '@/components/structured-data';
import { locales, localeConfig, defaultLocale, isValidLocale, type Locale } from '@/lib/locale-config';

// Generate static params for all locales
export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Generate metadata for locale-specific pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  
  if (!isValidLocale(locale)) {
    return {};
  }

  return generateHomeMetadata(locale);
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  // Validate locale
  if (!isValidLocale(locale)) {
    notFound();
  }

  const localeInfo = localeConfig[locale];
  const websiteData = generateWebsiteJsonLd(locale);

  return (
    <>
      <StructuredData data={websiteData} />
      <div className="min-h-screen bg-background">
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
        >
          Skip to main content
        </a>
        
        {/* Main content */}
        <main id="main-content" className="relative">
          {children}
        </main>
      </div>
    </>
  );
}