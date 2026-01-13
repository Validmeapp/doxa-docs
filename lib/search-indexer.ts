import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'path';
import { getDatabase } from './database';

interface SearchIndexConfig {
  locale: string;
  version: string;
  outputDir: string;
  contentDir: string;
}

interface SearchMetadata {
  indexVersion: string;
  locale: string;
  version: string;
  pageCount: number;
  indexSizeBytes: number;
  indexedAt: string;
}

export class SearchIndexer {
  private db = getDatabase();

  /**
   * Generate search index for a specific locale and version
   */
  async generateIndex(config: SearchIndexConfig): Promise<void> {
    const { locale, version, outputDir, contentDir } = config;
    
    console.log(`Generating search index for ${locale}/${version}...`);

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Create a temporary HTML file structure for Pagefind to index
    const tempDir = path.join(process.cwd(), '.temp-search', locale, version);
    await this.createTempHtmlFiles(contentDir, tempDir, locale, version);

    try {
      // Run Pagefind indexing
      const pagefindCommand = `npx pagefind --site "${tempDir}" --output-path "${outputDir}" --glob "**/*.html"`;
      execSync(pagefindCommand, { stdio: 'inherit' });

      // Store metadata about the generated index
      await this.storeIndexMetadata({
        indexVersion: this.generateIndexVersion(),
        locale,
        version,
        pageCount: await this.countIndexedPages(tempDir),
        indexSizeBytes: await this.getIndexSize(outputDir),
        indexedAt: new Date().toISOString()
      });

      console.log(`✅ Search index generated for ${locale}/${version}`);
    } catch (error) {
      console.error(`❌ Failed to generate search index for ${locale}/${version}:`, error);
      throw error;
    } finally {
      // Clean up temporary files
      await this.cleanupTempFiles(tempDir);
    }
  }

  /**
   * Generate search indexes for all available locales and versions
   */
  async generateAllIndexes(): Promise<void> {
    const contentDir = path.join(process.cwd(), 'content');
    const outputDir = path.join(process.cwd(), 'public', 'search');

    // Get all available locales and versions from content directory
    const localesAndVersions = await this.getAvailableLocalesAndVersions(contentDir);

    for (const { locale, version } of localesAndVersions) {
      const localeVersionOutputDir = path.join(outputDir, locale, version);
      const localeVersionContentDir = path.join(contentDir, locale, version);

      // Check if directory has any MDX files before processing
      const hasMdxFiles = await this.hasContentFiles(localeVersionContentDir);
      if (!hasMdxFiles) {
        console.log(`⏭️  Skipping ${locale}/${version} - no content files found`);
        continue;
      }

      await this.generateIndex({
        locale,
        version,
        outputDir: localeVersionOutputDir,
        contentDir: localeVersionContentDir
      });
    }
  }

  /**
   * Create temporary HTML files from MDX content for Pagefind to index
   */
  private async createTempHtmlFiles(
    contentDir: string,
    tempDir: string,
    locale: string,
    version: string
  ): Promise<void> {
    const { glob } = await import('glob');
    const matter = await import('gray-matter');

    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // Find all MDX files in the content directory
    const mdxFiles = await glob('**/*.mdx', { cwd: contentDir });

    for (const mdxFile of mdxFiles) {
      const filePath = path.join(contentDir, mdxFile);
      const content = readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content: mdxContent } = matter.default(content);

      // Skip files that don't match current locale/version
      if (frontmatter.locale !== locale || frontmatter.version !== version) {
        continue;
      }

      // Convert MDX to searchable HTML
      const htmlContent = this.convertMdxToSearchableHtml(mdxContent, frontmatter);
      
      // Create HTML file path
      const htmlFileName = mdxFile.replace('.mdx', '.html');
      const htmlFilePath = path.join(tempDir, htmlFileName);
      
      // Ensure directory exists
      const htmlFileDir = path.dirname(htmlFilePath);
      if (!existsSync(htmlFileDir)) {
        mkdirSync(htmlFileDir, { recursive: true });
      }

      writeFileSync(htmlFilePath, htmlContent);
    }
  }

  /**
   * Convert MDX content to searchable HTML
   */
  private convertMdxToSearchableHtml(content: string, frontmatter: any): string {
    // Define binary file extensions that should be excluded from search
    const binaryExtensions = [
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.csv', '.json', '.xml', '.sql', '.db',
      '.exe', '.dmg', '.pkg', '.deb', '.rpm',
      '.iso', '.img', '.bin'
    ];

    // Remove MDX-specific syntax and convert to basic HTML
    const htmlContent = content
      // Remove import statements
      .replace(/^import\s+.*$/gm, '')
      // Remove export statements
      .replace(/^export\s+.*$/gm, '')
      // Remove frontmatter if it exists
      .replace(/^---[\s\S]*?---/m, '')
      // Remove images from search content first (they don't add searchable text)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')
      // Remove binary asset links from search indexing
      .replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, linkText, url) => {
        // Check if this is a binary file link (check for extension before query params)
        const urlWithoutQuery = url.split('?')[0].toLowerCase();
        const isBinaryFile = binaryExtensions.some(ext => urlWithoutQuery.endsWith(ext));
        
        if (isBinaryFile) {
          // Exclude binary file links from search - return empty string
          return '';
        }
        
        // Keep regular links for search indexing
        return `<a href="${url}">${linkText}</a>`;
      })
      // Convert headers (order matters - start with most specific)
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Convert code blocks (preserve content for search)
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Convert inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Convert italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Convert lists
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li>$1. $2</li>')
      // Clean up extra whitespace and empty lines left by removed content
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // Convert paragraphs (split by double newlines)
    const paragraphs = htmlContent.split('\n\n').map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      
      // Don't wrap if it's already an HTML element
      if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
        return trimmed;
      }
      
      // Don't wrap list items
      if (trimmed.includes('<li>')) {
        return `<ul>${trimmed}</ul>`;
      }
      
      // Wrap in paragraph
      return `<p>${trimmed.replace(/\n/g, ' ')}</p>`;
    }).filter(p => p).join('\n');

    // Generate URL for the page
    const slug = frontmatter.slug || frontmatter.title?.toLowerCase().replace(/\s+/g, '-') || 'page';
    const pageUrl = `/${frontmatter.locale}/docs/v1/${slug}`;

    // Create full HTML document
    return `<!DOCTYPE html>
<html lang="${frontmatter.locale || 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${frontmatter.title || 'Documentation'}</title>
  <meta name="description" content="${frontmatter.description || ''}">
  <meta data-pagefind-meta="locale" content="${frontmatter.locale || 'en'}">
  <meta data-pagefind-meta="version" content="${frontmatter.version || 'v1'}">
  <meta data-pagefind-meta="tags" content="${(frontmatter.tags || []).join(', ')}">
  <meta data-pagefind-url="${pageUrl}">
</head>
<body>
  <main data-pagefind-body>
    <h1>${frontmatter.title || 'Documentation'}</h1>
    ${paragraphs}
  </main>
</body>
</html>`;
  }

  /**
   * Check if a directory contains any MDX files
   */
  private async hasContentFiles(contentDir: string): Promise<boolean> {
    if (!existsSync(contentDir)) {
      return false;
    }

    const { glob } = await import('glob');
    const mdxFiles = await glob('**/*.mdx', { cwd: contentDir });
    return mdxFiles.length > 0;
  }

  /**
   * Get all available locales and versions from content directory
   */
  private async getAvailableLocalesAndVersions(contentDir: string): Promise<Array<{ locale: string; version: string }>> {
    const { glob } = await import('glob');
    
    const localeVersionPairs: Array<{ locale: string; version: string }> = [];
    
    // Find all locale/version combinations
    const patterns = await glob('*/v*/', { cwd: contentDir });
    
    for (const pattern of patterns) {
      const parts = pattern.split('/');
      if (parts.length >= 2) {
        const locale = parts[0];
        const version = parts[1];
        localeVersionPairs.push({ locale, version });
      }
    }

    return localeVersionPairs;
  }

  /**
   * Store search index metadata in database
   */
  private async storeIndexMetadata(metadata: SearchMetadata): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO search_metadata (index_version, locale, version, page_count, index_size_bytes, indexed_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      metadata.indexVersion,
      metadata.locale,
      metadata.version,
      metadata.pageCount,
      metadata.indexSizeBytes,
      metadata.indexedAt
    );
  }

  /**
   * Generate a unique index version identifier
   */
  private generateIndexVersion(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Count the number of pages that were indexed
   */
  private async countIndexedPages(tempDir: string): Promise<number> {
    const { glob } = await import('glob');
    const htmlFiles = await glob('**/*.html', { cwd: tempDir });
    return htmlFiles.length;
  }

  /**
   * Get the total size of the generated search index
   */
  private async getIndexSize(outputDir: string): Promise<number> {
    const { glob } = await import('glob');
    const fs = await import('fs');
    
    try {
      const indexFiles = await glob('**/*', { cwd: outputDir });
      let totalSize = 0;

      for (const file of indexFiles) {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.warn('Could not calculate index size:', error);
      return 0;
    }
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(tempDir: string): Promise<void> {
    const fs = await import('fs');
    
    try {
      if (existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn('Could not clean up temporary files:', error);
    }
  }
}

// Export singleton instance
export const searchIndexer = new SearchIndexer();