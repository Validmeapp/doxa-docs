import { Metadata } from 'next';
import { ThemeToggle } from '@/components/theme-toggle';
import { type Locale } from '@/lib/locale-config';

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: 'Home',
    description: `Documentation portal home page in ${locale}`,
  };
}

export default async function LocaleHomePage({
  params,
}: PageProps) {
  const { locale } = await params;
  const content = {
    en: {
      title: 'Documentation Portal',
      subtitle: 'Modern multilingual documentation with enterprise-grade UX',
      description: 'Welcome to our comprehensive documentation portal. Find API references, guides, and resources in your preferred language.',
    },
    es: {
      title: 'Portal de Documentación',
      subtitle: 'Documentación multilingüe moderna con UX de nivel empresarial',
      description: 'Bienvenido a nuestro portal de documentación integral. Encuentra referencias de API, guías y recursos en tu idioma preferido.',
    },
  };

  const localizedContent = content[locale];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            {localizedContent.title}
          </h1>
          <p className="text-xl text-muted-foreground">
            {localizedContent.subtitle}
          </p>
        </div>
        <ThemeToggle />
      </div>
      
      <div className="max-w-2xl">
        <p className="text-lg text-muted-foreground mb-8">
          {localizedContent.description}
        </p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">API Reference</h2>
            <p className="text-muted-foreground">
              Complete API documentation with examples and interactive testing.
            </p>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Guides</h2>
            <p className="text-muted-foreground">
              Step-by-step tutorials and best practices for integration.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-16 text-sm text-muted-foreground">
        <p>Current locale: <code className="bg-muted px-2 py-1 rounded">{locale}</code></p>
      </div>
    </div>
  );
}