import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsLayout } from '@/components/docs-layout';
import { getNavigationTree } from '@/lib/navigation-builder';
import { generateSectionMetadata } from '@/lib/metadata-generator';
import { type Locale, locales } from '@/lib/locale-config';

interface DocsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) {
    return {};
  }

  const localizedTitles: Record<Locale, string> = {
    en: 'Documentation',
    es: 'Documentación',
    pt: 'Documentação',
  };

  const localizedDescriptions: Record<Locale, string> = {
    en: 'Comprehensive API documentation and developer guides.',
    es: 'Documentación completa de API y guías para desarrolladores.',
    pt: 'Documentação abrangente da API e guias para desenvolvedores.',
  };

  return generateSectionMetadata(
    locale as Locale,
    'v1',
    'docs',
    localizedTitles[locale as Locale],
    localizedDescriptions[locale as Locale]
  );
}

export default async function DocsLayoutPage({
  children,
  params,
}: DocsLayoutProps) {
  const { locale } = await params;
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Get navigation tree for the current locale
  // For now, we'll use a mock navigation tree since the content processing isn't fully implemented
  const navigation = await getNavigationTree(locale as Locale, 'v1');

  return (
    <DocsLayout
      locale={locale as Locale}
      version="v1"
      navigation={navigation}
    >
      {children}
    </DocsLayout>
  );
}