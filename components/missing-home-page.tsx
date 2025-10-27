'use client';

import Link from 'next/link';
import { FileText, FolderOpen, BookOpen, ArrowRight } from 'lucide-react';
import { type Locale } from '@/lib/locale-config';

interface MissingHomeProps {
  locale: Locale;
  version: string;
  availableContent: string[];
}

/**
 * Friendly fallback component displayed when index.mdx is missing
 * Provides clear instructions and shows available content
 */
export function MissingHomePage({ locale, version, availableContent }: MissingHomeProps) {
  const formatSlugTitle = (slug: string): string => {
    return slug
      .split('/')
      .map(part => part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '))
      .join(' › ');
  };

  const getLocalizedText = (locale: Locale) => {
    const texts = {
      en: {
        title: 'Missing Home Document',
        subtitle: `Welcome to the documentation for ${locale}/${version}`,
        whatsMissing: "What's Missing?",
        missingDescription: 'This documentation section is missing its home page. To fix this, create an',
        file: 'file at:',
        availableContent: 'Available Content',
        availableDescription: "Here's what's currently available in this section:",
        noContent: 'No content available yet',
        howToCreate: 'How to Create a Home Page',
        step1: 'Create a new file:',
        step2: 'Add frontmatter with required fields:',
        step3: 'Add your content below the frontmatter using Markdown or MDX syntax',
        needHelp: 'Need Help?',
        helpDescription: 'Check the existing content structure for examples, or refer to the documentation authoring guide.',
        viewContent: 'View Content',
        homePageTitle: 'Your Home Page Title',
        homePageDescription: 'Description of this documentation section',
      },
      es: {
        title: 'Documento de Inicio Faltante',
        subtitle: `Bienvenido a la documentación para ${locale}/${version}`,
        whatsMissing: '¿Qué Falta?',
        missingDescription: 'Esta sección de documentación no tiene su página de inicio. Para solucionarlo, crea un archivo',
        file: 'en:',
        availableContent: 'Contenido Disponible',
        availableDescription: 'Esto es lo que está disponible actualmente en esta sección:',
        noContent: 'Aún no hay contenido disponible',
        howToCreate: 'Cómo Crear una Página de Inicio',
        step1: 'Crea un nuevo archivo:',
        step2: 'Agrega frontmatter con los campos requeridos:',
        step3: 'Agrega tu contenido debajo del frontmatter usando sintaxis Markdown o MDX',
        needHelp: '¿Necesitas Ayuda?',
        helpDescription: 'Revisa la estructura de contenido existente para ver ejemplos, o consulta la guía de creación de documentación.',
        viewContent: 'Ver Contenido',
        homePageTitle: 'Título de Tu Página de Inicio',
        homePageDescription: 'Descripción de esta sección de documentación',
      },
    };
    return texts[locale];
  };

  const text = getLocalizedText(locale);
  const filePath = `content/${locale}/${version}/index.mdx`;

  return (
    <div 
      className="prose prose-slate max-w-none dark:prose-invert"
      role="main"
      aria-labelledby="missing-home-title"
    >
      {/* Header Section */}
      <div className="not-prose mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/20">
            <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div>
            <h1 
              id="missing-home-title"
              className="text-2xl font-bold text-foreground mb-1"
            >
              {text.title}
            </h1>
            <p className="text-muted-foreground">
              {text.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* What's Missing Section */}
      <section aria-labelledby="whats-missing-title" className="mb-8">
        <h2 
          id="whats-missing-title"
          className="flex items-center gap-2 text-xl font-semibold mb-4"
        >
          <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          {text.whatsMissing}
        </h2>
        <p className="mb-4">
          {text.missingDescription} <code className="px-2 py-1 bg-muted rounded text-sm font-mono">index.mdx</code> {text.file}
        </p>
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <code className="text-sm font-mono text-foreground">
            {filePath}
          </code>
        </div>
      </section>

      {/* Available Content Section */}
      <section aria-labelledby="available-content-title" className="mb-8">
        <h2 
          id="available-content-title"
          className="flex items-center gap-2 text-xl font-semibold mb-4"
        >
          <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
          {text.availableContent}
        </h2>
        <p className="mb-4">
          {text.availableDescription}
        </p>
        
        {availableContent.length > 0 ? (
          <div className="not-prose">
            <ul className="space-y-2" role="list">
              {availableContent.map((slug) => (
                <li key={slug}>
                  <Link
                    href={`/${locale}/${version}/docs/${slug}`}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label={`${text.viewContent}: ${formatSlugTitle(slug)}`}
                  >
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-sm font-medium">
                      {formatSlugTitle(slug)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-muted/30 border border-dashed border-border rounded-lg">
            <FolderOpen className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground italic">
              {text.noContent}
            </span>
          </div>
        )}
      </section>

      {/* How to Create Section */}
      <section aria-labelledby="how-to-create-title" className="mb-8">
        <h2 
          id="how-to-create-title"
          className="text-xl font-semibold mb-4"
        >
          {text.howToCreate}
        </h2>
        
        <ol className="space-y-4" role="list">
          <li className="flex gap-4">
            <span 
              className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0"
              aria-label="Step 1"
            >
              1
            </span>
            <div>
              <p className="font-medium mb-2">{text.step1}</p>
              <div className="bg-muted/50 border border-border rounded-lg p-3">
                <code className="text-sm font-mono text-foreground">
                  {filePath}
                </code>
              </div>
            </div>
          </li>
          
          <li className="flex gap-4">
            <span 
              className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0"
              aria-label="Step 2"
            >
              2
            </span>
            <div>
              <p className="font-medium mb-2">{text.step2}</p>
              <div className="bg-muted/50 border border-border rounded-lg p-3 overflow-x-auto">
                <pre className="text-sm font-mono text-foreground whitespace-pre">
{`---
title: "${text.homePageTitle}"
description: "${text.homePageDescription}"
version: "${version}"
locale: "${locale}"
order: 1
---`}
                </pre>
              </div>
            </div>
          </li>
          
          <li className="flex gap-4">
            <span 
              className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0"
              aria-label="Step 3"
            >
              3
            </span>
            <div>
              <p className="font-medium">
                {text.step3}
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Help Section */}
      <section 
        aria-labelledby="need-help-title"
        className="p-6 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg"
      >
        <h2 
          id="need-help-title"
          className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2"
        >
          {text.needHelp}
        </h2>
        <p className="text-blue-800 dark:text-blue-200">
          {text.helpDescription}
        </p>
      </section>
    </div>
  );
}