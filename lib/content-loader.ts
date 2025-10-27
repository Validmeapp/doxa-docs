import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { PageFrontmatter, ContentPage, ContentValidationError } from './content-types';
import { mdxProcessor } from './mdx-processor';

/**
 * Content loader for MDX files with frontmatter parsing and validation
 */
export class ContentLoader {
  private contentDir: string;

  constructor(contentDir: string = 'content') {
    this.contentDir = path.resolve(process.cwd(), contentDir);
  }

  /**
   * Validates required frontmatter fields
   */
  private validateFrontmatter(
    frontmatter: any,
    filePath: string
  ): { isValid: boolean; errors: ContentValidationError[] } {
    const errors: ContentValidationError[] = [];
    const requiredFields = ['title', 'description', 'version', 'locale', 'order'];

    // Check required fields
    for (const field of requiredFields) {
      if (frontmatter[field] === undefined || frontmatter[field] === null) {
        errors.push({
          field,
          message: `Required field '${field}' is missing`,
          filePath,
        });
      }
    }

    // Validate field types
    if (frontmatter.title && typeof frontmatter.title !== 'string') {
      errors.push({
        field: 'title',
        message: 'Title must be a string',
        filePath,
      });
    }

    if (frontmatter.description && typeof frontmatter.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be a string',
        filePath,
      });
    }

    if (frontmatter.version && typeof frontmatter.version !== 'string') {
      errors.push({
        field: 'version',
        message: 'Version must be a string',
        filePath,
      });
    }

    if (frontmatter.locale && typeof frontmatter.locale !== 'string') {
      errors.push({
        field: 'locale',
        message: 'Locale must be a string',
        filePath,
      });
    }

    if (frontmatter.order && typeof frontmatter.order !== 'number') {
      errors.push({
        field: 'order',
        message: 'Order must be a number',
        filePath,
      });
    }

    // Validate optional fields
    if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array',
        filePath,
      });
    }

    if (frontmatter.deprecated && typeof frontmatter.deprecated !== 'boolean') {
      errors.push({
        field: 'deprecated',
        message: 'Deprecated must be a boolean',
        filePath,
      });
    }

    if (frontmatter.redirectFrom && !Array.isArray(frontmatter.redirectFrom)) {
      errors.push({
        field: 'redirectFrom',
        message: 'RedirectFrom must be an array',
        filePath,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Discovers all MDX files in the content directory
   */
  public discoverContentFiles(): string[] {
    const files: string[] = [];

    const scanDirectory = (dir: string): void => {
      if (!fs.existsSync(dir)) {
        return;
      }

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
          files.push(fullPath);
        }
      }
    };

    scanDirectory(this.contentDir);
    return files;
  }

  /**
   * Loads and parses a single MDX file
   */
  public async loadContentFile(filePath: string): Promise<ContentPage | null> {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`Content file not found: ${filePath}`);
        return null;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);

      // Validate frontmatter
      const validation = this.validateFrontmatter(frontmatter, filePath);
      if (!validation.isValid) {
        console.error(`Validation errors in ${filePath}:`, validation.errors);
        return null;
      }

      // Generate slug from file path or use custom slug from frontmatter
      const relativePath = path.relative(this.contentDir, filePath);
      const slug = frontmatter.slug || this.generateSlug(relativePath);

      // Process content with MDX processor
      const { processedContent, tableOfContents, linkValidationErrors } = await mdxProcessor.processMarkdown(content);
      
      // Log link validation errors
      if (linkValidationErrors.length > 0) {
        console.warn(`Link validation errors in ${filePath}:`, linkValidationErrors);
      }

      return {
        frontmatter: frontmatter as PageFrontmatter,
        content: processedContent, // Use processed HTML instead of raw markdown
        slug,
        filePath,
        tableOfContents,
      };
    } catch (error) {
      console.error(`Error loading content file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Loads all content files
   */
  public async loadAllContent(): Promise<ContentPage[]> {
    const files = this.discoverContentFiles();
    const content: ContentPage[] = [];

    // Build content map for link validation
    const contentMap = new Map<string, string>();
    for (const filePath of files) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter, content: markdownContent } = matter(fileContent);
        const relativePath = path.relative(this.contentDir, filePath);
        const slug = frontmatter.slug || this.generateSlug(relativePath);
        contentMap.set(slug, markdownContent);
      } catch (error) {
        console.error(`Error reading file for link validation ${filePath}:`, error);
      }
    }

    // Update MDX processor with content map for link validation
    mdxProcessor.updateContentPages(contentMap);

    for (const filePath of files) {
      const page = await this.loadContentFile(filePath);
      if (page) {
        content.push(page);
      }
    }

    return content;
  }

  /**
   * Loads content filtered by locale and version
   */
  public async loadContentByLocaleAndVersion(locale: string, version: string): Promise<ContentPage[]> {
    const allContent = await this.loadAllContent();
    return allContent.filter(
      (page) => page.frontmatter.locale === locale && page.frontmatter.version === version
    );
  }

  /**
   * Gets available locales from content
   */
  public async getAvailableLocales(): Promise<string[]> {
    const allContent = await this.loadAllContent();
    const locales = new Set(allContent.map((page) => page.frontmatter.locale));
    return Array.from(locales).sort();
  }

  /**
   * Gets available versions from content
   */
  public async getAvailableVersions(): Promise<string[]> {
    const allContent = await this.loadAllContent();
    const versions = new Set(allContent.map((page) => page.frontmatter.version));
    return Array.from(versions).sort();
  }

  /**
   * Generates a slug from file path
   */
  private generateSlug(relativePath: string): string {
    // Remove file extension
    let slug = relativePath.replace(/\.(mdx?|md)$/, '');
    
    // Convert path separators to forward slashes
    slug = slug.replace(/\\/g, '/');
    
    // Remove index from the end if present
    slug = slug.replace(/\/index$/, '');
    
    // Extract the path after locale/version (e.g., "en/v1/api-reference/users" -> "api-reference/users")
    const parts = slug.split('/');
    
    if (parts.length >= 3) {
      // Skip locale and version, return the rest of the path
      return parts.slice(2).join('/');
    }
    
    // If this is just locale/version (index file), return empty string
    if (parts.length === 2) {
      return '';
    }
    
    return slug;
  }

  /**
   * Finds content by slug
   */
  public async findContentBySlug(slug: string, locale?: string, version?: string): Promise<ContentPage | null> {
    const allContent = await this.loadAllContent();
    
    return allContent.find((page) => {
      const matchesSlug = page.slug === slug;
      const matchesLocale = !locale || page.frontmatter.locale === locale;
      const matchesVersion = !version || page.frontmatter.version === version;
      
      return matchesSlug && matchesLocale && matchesVersion;
    }) || null;
  }

  /**
   * Validates all content files and returns validation errors
   */
  public validateAllContent(): ContentValidationError[] {
    const files = this.discoverContentFiles();
    const errors: ContentValidationError[] = [];

    for (const filePath of files) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter } = matter(fileContent);
        
        const validation = this.validateFrontmatter(frontmatter, filePath);
        errors.push(...validation.errors);
      } catch (error) {
        errors.push({
          field: 'file',
          message: `Failed to parse file: ${error}`,
          filePath,
        });
      }
    }

    return errors;
  }

  /**
   * Validates all internal links across content files
   */
  public async validateAllLinks(): Promise<Map<string, string[]>> {
    const files = this.discoverContentFiles();
    const contentMap = new Map<string, string>();

    // Build content map
    for (const filePath of files) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter, content } = matter(fileContent);
        const relativePath = path.relative(this.contentDir, filePath);
        const slug = frontmatter.slug || this.generateSlug(relativePath);
        contentMap.set(slug, content);
      } catch (error) {
        console.error(`Error reading file for link validation ${filePath}:`, error);
      }
    }

    // Validate links using MDX processor
    return mdxProcessor.validateAllLinks(contentMap);
  }

  /**
   * Gets content by slug for a specific locale and version
   * If slug is empty, returns the home document
   */
  public async getContentBySlug(locale: string, version: string, slug: string): Promise<ContentPage | null> {
    // Handle empty slug as home document request
    if (!slug || slug === '' || slug === '/') {
      return this.getHomeDocument(locale, version);
    }
    
    // Ensure content map is built for proper link validation
    await this.ensureContentMapBuilt();
    
    return this.findContentBySlug(slug, locale, version);
  }

  /**
   * Ensures the content map is built for the MDX processor
   * This is needed for proper link validation when loading individual files
   */
  private contentMapBuilt = false;
  
  private async ensureContentMapBuilt(): Promise<void> {
    if (this.contentMapBuilt) {
      return;
    }
    
    const files = this.discoverContentFiles();
    const contentMap = new Map<string, string>();
    
    for (const filePath of files) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter, content: markdownContent } = matter(fileContent);
        const relativePath = path.relative(this.contentDir, filePath);
        const slug = frontmatter.slug || this.generateSlug(relativePath);
        contentMap.set(slug, markdownContent);
      } catch (error) {
        console.error(`Error reading file for content map ${filePath}:`, error);
      }
    }
    
    // Update MDX processor with content map for link validation
    mdxProcessor.updateContentPages(contentMap);
    this.contentMapBuilt = true;
  }

  /**
   * Gets the home document for a specific locale and version
   * Returns index.mdx content if it exists, otherwise returns friendly fallback
   */
  public async getHomeDocument(locale: string, version: string): Promise<ContentPage | null> {
    const indexFilePath = await this.findIndexFile(locale, version);
    
    if (indexFilePath) {
      // Ensure content map is built for proper link validation
      await this.ensureContentMapBuilt();
      
      // Load the actual index.mdx file
      return this.loadContentFile(indexFilePath);
    }
    
    // Generate friendly fallback content
    const fallbackContent = this.generateMissingHomeContent(locale, version);
    const slug = ''; // Home document has empty slug
    
    // Create a synthetic ContentPage for the fallback
    const fallbackPage: ContentPage = {
      frontmatter: {
        title: 'Missing Home Document',
        description: `Home document for ${locale}/${version} is missing`,
        version,
        locale,
        order: 0,
      },
      content: fallbackContent,
      slug,
      filePath: `content/${locale}/${version}/index.mdx`,
      tableOfContents: [],
    };
    
    return fallbackPage;
  }

  /**
   * Finds the index.mdx file for a specific locale and version
   * Returns the full file path if found, null otherwise
   */
  public async findIndexFile(locale: string, version: string): Promise<string | null> {
    const possiblePaths = [
      path.join(this.contentDir, locale, version, 'index.mdx'),
      path.join(this.contentDir, locale, version, 'index.md'),
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    
    return null;
  }

  /**
   * Generates friendly fallback content when index.mdx is missing
   */
  public generateMissingHomeContent(locale: string, version: string): string {
    // Get available content in this locale/version for suggestions
    const availableContent = this.getAvailableContentForLocaleVersion(locale, version);
    
    const contentList = availableContent.length > 0 
      ? availableContent.map(slug => `- [${this.formatSlugTitle(slug)}](/${locale}/${version}/docs/${slug})`).join('\n')
      : '- No content available yet';

    return `# Missing Home Document

Welcome to the documentation for **${locale}/${version}**.

## What's Missing?

This documentation section is missing its home page. To fix this, create an \`index.mdx\` file at:

\`\`\`
content/${locale}/${version}/index.mdx
\`\`\`

## Available Content

Here's what's currently available in this section:

${contentList}

## How to Create a Home Page

1. Create a new file: \`content/${locale}/${version}/index.mdx\`
2. Add frontmatter with required fields:

\`\`\`yaml
---
title: "Your Home Page Title"
description: "Description of this documentation section"
version: "${version}"
locale: "${locale}"
order: 1
---
\`\`\`

3. Add your content below the frontmatter using Markdown or MDX syntax

## Need Help?

Check the existing content structure for examples, or refer to the documentation authoring guide.`;
  }

  /**
   * Gets available content slugs for a specific locale/version (synchronous helper)
   */
  private getAvailableContentForLocaleVersion(locale: string, version: string): string[] {
    const files = this.discoverContentFiles();
    const slugs: string[] = [];
    
    for (const filePath of files) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data: frontmatter } = matter(fileContent);
        
        if (frontmatter.locale === locale && frontmatter.version === version) {
          const relativePath = path.relative(this.contentDir, filePath);
          const slug = frontmatter.slug || this.generateSlug(relativePath);
          
          // Don't include empty slugs (home documents) in the list
          if (slug && slug !== '') {
            slugs.push(slug);
          }
        }
      } catch (error) {
        // Skip files that can't be parsed
        continue;
      }
    }
    
    return slugs.sort();
  }

  /**
   * Formats a slug into a human-readable title
   */
  private formatSlugTitle(slug: string): string {
    return slug
      .split('/')
      .map(part => part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '))
      .join(' > ');
  }

  /**
   * Gets all content slugs for a specific locale and version
   */
  public async getAllContentSlugs(locale: string, version: string): Promise<string[]> {
    const content = await this.loadContentByLocaleAndVersion(locale, version);
    return content.map(page => page.slug);
  }
}

// Export singleton instance
export const contentLoader = new ContentLoader();

// Export convenience functions
export const getContentBySlug = (locale: string, version: string, slug: string) => 
  contentLoader.getContentBySlug(locale, version, slug);

export const getAllContentSlugs = (locale: string, version: string) => 
  contentLoader.getAllContentSlugs(locale, version);