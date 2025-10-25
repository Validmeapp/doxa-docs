import { Metadata } from 'next';
import { generateSectionMetadata } from '@/lib/metadata-generator';
import { type Locale } from '@/lib/locale-config';

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const localizedTitles: Record<Locale, string> = {
    en: 'Documentation Overview',
    es: 'Resumen de Documentación',
    pt: 'Visão Geral da Documentação',
  };

  const localizedDescriptions: Record<Locale, string> = {
    en: 'Welcome to the documentation portal. Find comprehensive guides and API references.',
    es: 'Bienvenido al portal de documentación. Encuentra guías completas y referencias de API.',
    pt: 'Bem-vindo ao portal de documentação. Encontre guias abrangentes e referências de API.',
  };

  return generateSectionMetadata(
    locale,
    'v1',
    'docs',
    localizedTitles[locale],
    localizedDescriptions[locale]
  );
}

export default async function DocsHomePage({
  params,
}: PageProps) {
  const { locale } = await params;
  const content = {
    en: {
      title: 'Documentation Overview',
      subtitle: 'Everything you need to integrate with our platform',
      sections: [
        {
          title: 'Getting Started',
          description: 'Quick start guides to get you up and running in minutes.',
          items: ['Installation', 'Authentication', 'First API Call'],
        },
        {
          title: 'API Reference',
          description: 'Complete reference for all API endpoints with examples.',
          items: ['Users API', 'Webhooks', 'Authentication'],
        },
        {
          title: 'Guides',
          description: 'In-depth tutorials and best practices.',
          items: ['Integration Guide', 'Security Best Practices', 'Error Handling'],
        },
      ],
    },
    es: {
      title: 'Resumen de Documentación',
      subtitle: 'Todo lo que necesitas para integrar con nuestra plataforma',
      sections: [
        {
          title: 'Primeros Pasos',
          description: 'Guías de inicio rápido para comenzar en minutos.',
          items: ['Instalación', 'Autenticación', 'Primera Llamada API'],
        },
        {
          title: 'Referencia API',
          description: 'Referencia completa para todos los endpoints API con ejemplos.',
          items: ['API de Usuarios', 'Webhooks', 'Autenticación'],
        },
        {
          title: 'Guías',
          description: 'Tutoriales detallados y mejores prácticas.',
          items: ['Guía de Integración', 'Mejores Prácticas de Seguridad', 'Manejo de Errores'],
        },
      ],
    },
    pt: {
      title: 'Visão Geral da Documentação',
      subtitle: 'Tudo que você precisa para integrar com nossa plataforma',
      sections: [
        {
          title: 'Primeiros Passos',
          description: 'Guias de início rápido para começar em minutos.',
          items: ['Instalação', 'Autenticação', 'Primeira Chamada API'],
        },
        {
          title: 'Referência da API',
          description: 'Referência completa para todos os endpoints da API com exemplos.',
          items: ['API de Usuários', 'Webhooks', 'Autenticação'],
        },
        {
          title: 'Guias',
          description: 'Tutoriais detalhados e melhores práticas.',
          items: ['Guia de Integração', 'Melhores Práticas de Segurança', 'Tratamento de Erros'],
        },
      ],
    },
  };

  const localizedContent = content[locale];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 id="overview" className="text-4xl font-bold tracking-tight">
          {localizedContent.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {localizedContent.subtitle}
        </p>
      </div>

      {/* Sections */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {localizedContent.sections.map((section, index) => (
          <div key={index} className="space-y-4">
            <h2 id={section.title.toLowerCase().replace(/\s+/g, '-')} className="text-2xl font-semibold">
              {section.title}
            </h2>
            <p className="text-muted-foreground">
              {section.description}
            </p>
            <ul className="space-y-2">
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Additional content for TOC testing */}
      <div className="space-y-6 pt-8 border-t">
        <h2 id="quick-links" className="text-2xl font-semibold">
          Quick Links
        </h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 border rounded-lg">
            <h3 id="api-status" className="text-lg font-medium mb-2">
              API Status
            </h3>
            <p className="text-sm text-muted-foreground">
              Check the current status of our API services and any ongoing maintenance.
            </p>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 id="support" className="text-lg font-medium mb-2">
              Support
            </h3>
            <p className="text-sm text-muted-foreground">
              Get help from our support team or browse community discussions.
            </p>
          </div>
        </div>

        <h3 id="changelog" className="text-xl font-medium">
          Recent Updates
        </h3>
        <p className="text-muted-foreground">
          Stay up to date with the latest changes and improvements to our platform.
        </p>
      </div>
    </div>
  );
}