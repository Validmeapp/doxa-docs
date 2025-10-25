/**
 * Utility to extract structured data from MDX content
 */

import { Locale } from '@/lib/locale-config';
import { PageFrontmatter } from './content-types';
import {
  generateFAQJsonLd,
  generateHowToJsonLd,
  generateSoftwareApplicationJsonLd,
} from './metadata-generator';

interface FAQItem {
  question: string;
  answer: string;
}

interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

/**
 * Extract FAQ items from content
 */
export function extractFAQs(content: string): FAQItem[] {
  const faqs: FAQItem[] = [];
  
  // Look for FAQ patterns in the content
  // Pattern: ## Question followed by answer content
  const faqPattern = /^##\s+(.+?)\n\n((?:(?!^##).|\n)*?)(?=\n##|\n#|$)/gm;
  let match;
  
  while ((match = faqPattern.exec(content)) !== null) {
    const question = match[1].trim();
    const answer = match[2].trim();
    
    // Only include if it looks like a question
    if (question.includes('?') || question.toLowerCase().includes('how') || 
        question.toLowerCase().includes('what') || question.toLowerCase().includes('why')) {
      faqs.push({
        question,
        answer: answer.replace(/\n+/g, ' ').substring(0, 500), // Limit answer length
      });
    }
  }
  
  return faqs;
}

/**
 * Extract how-to steps from content
 */
export function extractHowToSteps(content: string): HowToStep[] {
  const steps: HowToStep[] = [];
  
  // Look for numbered steps or step patterns
  const stepPatterns = [
    /^###\s+Step\s+\d+:?\s+(.+?)\n\n((?:(?!^###).|\n)*?)(?=\n###|\n##|\n#|$)/gm,
    /^\d+\.\s+(.+?)\n\n((?:(?!^\d+\.).|\n)*?)(?=\n\d+\.|\n##|\n#|$)/gm,
  ];
  
  for (const pattern of stepPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1].trim();
      const text = match[2].trim();
      
      steps.push({
        name,
        text: text.replace(/\n+/g, ' ').substring(0, 500), // Limit text length
      });
    }
    
    if (steps.length > 0) break; // Use first pattern that matches
  }
  
  return steps;
}

/**
 * Determine content type based on frontmatter and content
 */
export function determineContentType(
  frontmatter: PageFrontmatter,
  content: string
): 'faq' | 'howto' | 'api' | 'article' {
  const title = frontmatter.title.toLowerCase();
  const tags = frontmatter.tags?.map(tag => tag.toLowerCase()) || [];
  const contentLower = content.toLowerCase();
  
  // Check for FAQ content
  if (title.includes('faq') || title.includes('frequently asked') ||
      tags.includes('faq') || contentLower.includes('frequently asked')) {
    return 'faq';
  }
  
  // Check for how-to/tutorial content
  if (title.includes('how to') || title.includes('tutorial') || title.includes('guide') ||
      tags.includes('tutorial') || tags.includes('guide') || tags.includes('howto') ||
      contentLower.includes('step 1') || contentLower.includes('### step')) {
    return 'howto';
  }
  
  // Check for API documentation
  if (title.includes('api') || title.includes('reference') || title.includes('endpoint') ||
      tags.includes('api') || tags.includes('reference') ||
      contentLower.includes('endpoint') || contentLower.includes('curl')) {
    return 'api';
  }
  
  return 'article';
}

/**
 * Generate appropriate structured data based on content type
 */
export function generateContentStructuredData(
  locale: Locale,
  frontmatter: PageFrontmatter,
  content: string
): object[] {
  const contentType = determineContentType(frontmatter, content);
  const structuredData: object[] = [];
  
  switch (contentType) {
    case 'faq': {
      const faqs = extractFAQs(content);
      if (faqs.length > 0) {
        structuredData.push(generateFAQJsonLd(locale, faqs));
      }
      break;
    }
    
    case 'howto': {
      const steps = extractHowToSteps(content);
      if (steps.length > 0) {
        structuredData.push(generateHowToJsonLd(
          locale,
          frontmatter.title,
          frontmatter.description,
          steps
        ));
      }
      break;
    }
    
    case 'api': {
      structuredData.push(generateSoftwareApplicationJsonLd(locale));
      break;
    }
  }
  
  return structuredData;
}

/**
 * Extract code examples from content for structured data
 */
export function extractCodeExamples(content: string): Array<{
  language: string;
  code: string;
  description?: string;
}> {
  const examples: Array<{ language: string; code: string; description?: string }> = [];
  
  // Pattern to match code blocks with language
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = codeBlockPattern.exec(content)) !== null) {
    const language = match[1] || 'text';
    const code = match[2].trim();
    
    if (code.length > 0) {
      examples.push({
        language,
        code,
      });
    }
  }
  
  return examples;
}

/**
 * Generate rich snippets for search results
 */
export function generateRichSnippets(
  locale: Locale,
  frontmatter: PageFrontmatter,
  content: string
) {
  const contentType = determineContentType(frontmatter, content);
  const codeExamples = extractCodeExamples(content);
  
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: frontmatter.title,
    description: frontmatter.description,
    inLanguage: locale,
    about: {
      '@type': 'Thing',
      name: contentType === 'api' ? 'API Documentation' : 'Technical Documentation',
    },
    ...(codeExamples.length > 0 && {
      hasPart: codeExamples.map((example, index) => ({
        '@type': 'SoftwareSourceCode',
        name: `Code Example ${index + 1}`,
        programmingLanguage: example.language,
        codeRepository: example.code.substring(0, 200), // Limit length
      })),
    }),
    ...(frontmatter.tags && {
      keywords: frontmatter.tags.join(', '),
    }),
  };
}