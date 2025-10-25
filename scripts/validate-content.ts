#!/usr/bin/env tsx

/**
 * Content validation script for build-time checks
 * Validates MDX files, frontmatter, and internal links
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import remarkMdx from 'remark-mdx';
import { visit } from 'unist-util-visit';

interface ValidationError {
  file: string;
  type: 'frontmatter' | 'link' | 'syntax' | 'structure';
  message: string;
  line?: number;
}

interface FrontmatterSchema {
  title: string;
  description: string;
  version: string;
  locale: string;
  order: number;
  tags: string[];
  lastModified?: string;
  deprecated?: boolean;
  redirectFrom?: string[];
}

class ContentValidator {
  private errors: ValidationError[] = [];
  private contentFiles: string[] = [];
  private validPaths: Set<string> = new Set();

  async validate(): Promise<boolean> {
    console.log('🔍 Starting content validation...');
    
    // Find all MDX files
    this.contentFiles = await glob('content/**/*.mdx');
    console.log(`📄 Found ${this.contentFiles.length} content files`);

    // Build valid paths set
    this.buildValidPaths();

    // Validate each file
    for (const file of this.contentFiles) {
      await this.validateFile(file);
    }

    // Report results
    this.reportResults();

    return this.errors.length === 0;
  }

  private buildValidPaths(): void {
    for (const file of this.contentFiles) {
      // Convert file path to URL path
      const relativePath = path.relative('content', file);
      const urlPath = '/' + relativePath
        .replace(/\.mdx$/, '')
        .replace(/\\/g, '/');
      
      this.validPaths.add(urlPath);
      
      // Add locale-prefixed paths
      const parts = relativePath.split(path.sep);
      if (parts.length >= 2) {
        const locale = parts[0];
        const pathWithoutLocale = parts.slice(1).join('/').replace(/\.mdx$/, '');
        this.validPaths.add(`/${locale}/docs/${pathWithoutLocale}`);
        
        // Add common documentation paths
        this.validPaths.add(`/docs/${pathWithoutLocale}`);
      }
    }

    // Add known API paths
    this.validPaths.add('/api/config');
    this.validPaths.add('/api/health');
    this.validPaths.add('/api/search/metadata');
    this.validPaths.add('/api/redirects');
  }

  private async validateFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content: mdxContent } = matter(content);

      // Validate frontmatter
      this.validateFrontmatter(filePath, frontmatter);

      // Validate MDX syntax
      await this.validateMdxSyntax(filePath, content);

      // Validate internal links
      await this.validateLinks(filePath, mdxContent);

      // Validate content structure
      this.validateContentStructure(filePath, mdxContent);

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addError(filePath, 'syntax', `Failed to parse file: ${message}`);
    }
  }

  private validateFrontmatter(filePath: string, frontmatter: any): void {
    const required = ['title', 'description', 'version', 'locale', 'order'];
    
    for (const field of required) {
      if (!frontmatter[field]) {
        this.addError(filePath, 'frontmatter', `Missing required field: ${field}`);
      }
    }

    // Validate field types
    if (frontmatter.order && typeof frontmatter.order !== 'number') {
      this.addError(filePath, 'frontmatter', 'Field "order" must be a number');
    }

    if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
      this.addError(filePath, 'frontmatter', 'Field "tags" must be an array');
    }

    // Validate locale format
    if (frontmatter.locale && !['en', 'es', 'pt'].includes(frontmatter.locale)) {
      this.addError(filePath, 'frontmatter', `Invalid locale: ${frontmatter.locale}`);
    }

    // Validate version format
    if (frontmatter.version && !frontmatter.version.match(/^v\d+$/)) {
      this.addError(filePath, 'frontmatter', `Invalid version format: ${frontmatter.version}`);
    }
  }

  private async validateMdxSyntax(filePath: string, content: string): Promise<void> {
    try {
      await remark()
        .use(remarkMdx)
        .process(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.addError(filePath, 'syntax', `MDX syntax error: ${message}`);
    }
  }

  private async validateLinks(filePath: string, content: string): Promise<void> {
    const processor = remark().use(remarkMdx);
    const tree = processor.parse(content);

    visit(tree, 'link', (node: any) => {
      const url = node.url;
      
      // Skip external links and anchors
      if (url.startsWith('http') || url.startsWith('#') || url.startsWith('mailto:')) {
        return;
      }

      // Validate internal links
      if (url.startsWith('/')) {
        const cleanUrl = url.split('#')[0]; // Remove anchor
        if (!this.validPaths.has(cleanUrl)) {
          this.addError(filePath, 'link', `Broken internal link: ${url}`);
        }
      }
    });

    // Check for relative links (should be absolute)
    visit(tree, 'link', (node: any) => {
      const url = node.url;
      if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('#') && !url.startsWith('mailto:')) {
        this.addError(filePath, 'link', `Relative link should be absolute: ${url}`);
      }
    });
  }

  private validateContentStructure(filePath: string, content: string): void {
    const lines = content.split('\n');
    
    // Check for proper heading hierarchy
    let lastHeadingLevel = 0;
    let hasH1 = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];

        if (level === 1) {
          hasH1 = true;
        }

        // Check heading hierarchy (no skipping levels) - but allow h3 after h1 for API docs
        if (level > lastHeadingLevel + 1 && !(lastHeadingLevel === 1 && level === 3)) {
          this.addError(filePath, 'structure', 
            `Heading hierarchy skip at line ${i + 1}: h${level} after h${lastHeadingLevel}`, 
            i + 1
          );
        }

        lastHeadingLevel = level;

        // Check for empty headings
        if (!text.trim()) {
          this.addError(filePath, 'structure', `Empty heading at line ${i + 1}`, i + 1);
        }
      }
    }

    if (!hasH1) {
      this.addError(filePath, 'structure', 'Missing main heading (h1)');
    }

    // Check for code blocks without language specification
    // Allow plain text blocks for URLs and simple examples
    const codeBlockRegex = /^```\s*\n([\s\S]*?)\n```/gm;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const blockContent = match[1].trim();
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      // Skip validation for various types of content blocks
      const isUrlBlock = blockContent.startsWith('http') || blockContent.includes('api.example.com');
      const isSimpleText = blockContent.split('\n').length === 1 && !blockContent.includes('(') && !blockContent.includes('{');
      const isAuthHeader = blockContent.startsWith('Authorization:') || blockContent.includes('Bearer');
      const isTableContent = blockContent.includes('|') && blockContent.includes('---');
      const isInstallCommand = blockContent.includes('npm install') || blockContent.includes('pip install');
      const isConfigExample = blockContent.includes('{') && blockContent.includes('}') && blockContent.length < 200;
      
      if (!isUrlBlock && !isSimpleText && !isAuthHeader && !isTableContent && !isInstallCommand && !isConfigExample) {
        // Only warn for code blocks that clearly look like programming code
        const hasCodeKeywords = blockContent.includes('function') || 
                               blockContent.includes('const ') || 
                               blockContent.includes('import ') ||
                               blockContent.includes('class ') ||
                               blockContent.includes('def ') ||
                               (blockContent.includes('=') && blockContent.includes('('));
        
        if (hasCodeKeywords) {
          this.addError(filePath, 'structure', 
            `Code block without language specification at line ${lineNumber}`, 
            lineNumber
          );
        }
      }
    }
  }

  private addError(file: string, type: ValidationError['type'], message: string, line?: number): void {
    this.errors.push({ file, type, message, line });
  }

  private reportResults(): void {
    if (this.errors.length === 0) {
      console.log('✅ All content validation checks passed!');
      return;
    }

    console.log(`❌ Found ${this.errors.length} validation errors:\n`);

    // Group errors by file
    const errorsByFile = this.errors.reduce((acc, error) => {
      if (!acc[error.file]) acc[error.file] = [];
      acc[error.file].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    for (const [file, errors] of Object.entries(errorsByFile)) {
      console.log(`📄 ${file}:`);
      for (const error of errors) {
        const location = error.line ? `:${error.line}` : '';
        console.log(`  ${this.getErrorIcon(error.type)} [${error.type}${location}] ${error.message}`);
      }
      console.log();
    }

    // Summary by type
    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Error summary:');
    for (const [type, count] of Object.entries(errorsByType)) {
      console.log(`  ${this.getErrorIcon(type as ValidationError['type'])} ${type}: ${count}`);
    }
  }

  private getErrorIcon(type: ValidationError['type']): string {
    const icons = {
      frontmatter: '📋',
      link: '🔗',
      syntax: '⚠️',
      structure: '🏗️'
    };
    return icons[type] || '❓';
  }
}

// CLI execution
async function main() {
  const validator = new ContentValidator();
  const isValid = await validator.validate();
  
  if (!isValid) {
    console.log('\n💡 Fix the validation errors above before building.');
    process.exit(1);
  }
  
  console.log('\n🎉 Content validation completed successfully!');
}

if (require.main === module) {
  main().catch(console.error);
}

export { ContentValidator };