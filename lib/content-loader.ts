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
      if (!frontmatter[field]) {
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

      // Generate slug from file path
      const relativePath = path.relative(this.contentDir, filePath);
      const slug = this.generateSlug(relativePath);

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
        const { content: markdownContent } = matter(fileContent);
        const relativePath = path.relative(this.contentDir, filePath);
        const slug = this.generateSlug(relativePath);
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
    
    // Extract just the filename part for the slug (without locale/version path)
    const parts = slug.split('/');
    if (parts.length >= 3) {
      // Return just the filename part (last segment)
      return parts[parts.length - 1];
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
        const { content } = matter(fileContent);
        const relativePath = path.relative(this.contentDir, filePath);
        const slug = this.generateSlug(relativePath);
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
   */
  public async getContentBySlug(locale: string, version: string, slug: string): Promise<ContentPage | null> {
    console.log(`Looking for content: locale=${locale}, version=${version}, slug=${slug}`);
    const allContent = await this.loadAllContent();
    console.log('Available content:', allContent.map(p => ({ slug: p.slug, locale: p.frontmatter.locale, version: p.frontmatter.version })));
    return this.findContentBySlug(slug, locale, version);
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