#!/usr/bin/env tsx

/**
 * Simple test script for MissingHomePage component
 * Tests the component functionality without a full testing framework
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { MissingHomePage } from '../components/missing-home-page';

// Mock Next.js Link component for server-side rendering
const MockLink = ({ children, href, ...props }: any) => {
  return React.createElement('a', { href, ...props }, children);
};

// Simple test runner
class TestRunner {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => void | Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Running MissingHomePage Component Tests\n');

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
        this.failed++;
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const runner = new TestRunner();

// Helper function to render component and check content
function renderAndCheck(props: any, expectedContent: string[]) {
  const html = renderToString(React.createElement(MissingHomePage, props));
  
  for (const content of expectedContent) {
    if (!html.includes(content)) {
      throw new Error(`Expected content not found: "${content}"`);
    }
  }
  
  return html;
}

// Test cases
runner.test('renders basic structure with English locale', () => {
  const props = {
    locale: 'en' as const,
    version: 'v1',
    availableContent: [],
  };

  renderAndCheck(props, [
    'Missing Home Document',
    'Welcome to the documentation for en/v1',
    'content/en/docs/v1/index.mdx',
    "What's Missing?",
    'Available Content',
    'How to Create a Home Page',
    'Need Help?',
  ]);
});

runner.test('renders with Spanish locale', () => {
  const props = {
    locale: 'es' as const,
    version: 'v1',
    availableContent: [],
  };

  renderAndCheck(props, [
    'Documento de Inicio Faltante',
    'Bienvenido a la documentación para es/v1',
    'content/es/docs/v1/index.mdx',
    '¿Qué Falta?',
    'Contenido Disponible',
    'Cómo Crear una Página de Inicio',
    '¿Necesitas Ayuda?',
  ]);
});

runner.test('displays available content links', () => {
  const props = {
    locale: 'en' as const,
    version: 'v1',
    availableContent: ['api-reference', 'getting-started', 'user-guide/billing'],
  };

  const html = renderAndCheck(props, [
    'Api Reference',
    'Getting Started',
    'User Guide › Billing',
  ]);

  // Check that links have correct hrefs
  if (!html.includes('href="/en/docs/v1/docs/api-reference"')) {
    throw new Error('Expected API reference link not found');
  }
  if (!html.includes('href="/en/docs/v1/docs/getting-started"')) {
    throw new Error('Expected getting started link not found');
  }
  if (!html.includes('href="/en/docs/v1/docs/user-guide/billing"')) {
    throw new Error('Expected billing link not found');
  }
});

runner.test('shows "no content" message when availableContent is empty', () => {
  const props = {
    locale: 'en' as const,
    version: 'v1',
    availableContent: [],
  };

  renderAndCheck(props, ['No content available yet']);
});

runner.test('formats slug titles correctly', () => {
  const props = {
    locale: 'en' as const,
    version: 'v1',
    availableContent: [
      'api-reference',
      'user-guide/getting-started',
      'developer-tools/cli-commands',
      'very-long-section/with-multiple-parts/final-document',
    ],
  };

  renderAndCheck(props, [
    'Api Reference',
    'User Guide › Getting Started',
    'Developer Tools › Cli Commands',
    'Very Long Section › With Multiple Parts › Final Document',
  ]);
});

runner.test('includes proper frontmatter example with dynamic values', () => {
  const props = {
    locale: 'es' as const,
    version: 'v2.1',
    availableContent: [],
  };

  renderAndCheck(props, [
    'version: "v2.1"',
    'locale: "es"',
    'content/es/v2.1/index.mdx',
  ]);
});

runner.test('includes accessibility attributes', () => {
  const props = {
    locale: 'en' as const,
    version: 'v1',
    availableContent: ['test-content'],
  };

  const html = renderAndCheck(props, [
    'role="main"',
    'aria-labelledby="missing-home-title"',
    'id="missing-home-title"',
  ]);

  // Check for proper heading structure
  if (!html.includes('<h1') || !html.includes('<h2')) {
    throw new Error('Expected proper heading hierarchy not found');
  }
});

runner.test('handles special characters in slugs', () => {
  const props = {
    locale: 'en' as const,
    version: 'v1',
    availableContent: ['api-v2/users-endpoints', 'oauth2-integration'],
  };

  renderAndCheck(props, [
    'Api V2 › Users Endpoints',
    'Oauth2 Integration',
  ]);
});

runner.test('component structure includes all required sections', () => {
  const props = {
    locale: 'en' as const,
    version: 'v1',
    availableContent: ['test'],
  };

  const html = renderAndCheck(props, [
    // Header section
    'Missing Home Document',
    'Welcome to the documentation',
    
    // What's missing section
    "What's Missing?",
    'index.mdx',
    
    // Available content section
    'Available Content',
    
    // Instructions section
    'How to Create a Home Page',
    'Create a new file:',
    'Add frontmatter with required fields:',
    'Add your content below the frontmatter',
    
    // Help section
    'Need Help?',
  ]);

  // Check for step numbers
  if (!html.includes('Step 1') || !html.includes('Step 2') || !html.includes('Step 3')) {
    throw new Error('Expected step numbers not found');
  }
});

// Run all tests
runner.run().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});