/**
 * LinkAuditor - Comprehensive link validation and fixing for documentation content
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { BrokenLink, FixedLink, AuditResult, FixResult } from './content-types';

export class LinkAuditor {
  private contentRoot: string;
  private availableFiles: Map<string, string> = new Map(); // slug -> filePath
  private fileExtensions = ['.mdx', '.md'];

  constructor(contentRoot: string = 'content') {
    this.contentRoot = contentRoot;
  }

  /**
   * Audit all links in markdown files for a specific locale/version
   */
  async auditAllLinks(locale: string, version: string): Promise<AuditResult> {
    const contentPath = path.join(this.contentRoot, locale, version);
    
    // Build map of available files
    await this.buildAvailableFilesMap(contentPath);
    
    // Find all markdown files
    const markdownFiles = await this.findMarkdownFiles(contentPath);
    
    const result: AuditResult = {
      totalLinks: 0,
      validLinks: 0,
      brokenLinks: [],
      fixableLinks: [],
      unfixableLinks: [],
      processedFiles: markdownFiles.length
    };

    for (const filePath of markdownFiles) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const links = this.extractMarkdownLinks(fileContent, filePath);
        
        result.totalLinks += links.length;

        for (const link of links) {
          const validation = await this.validateLink(link, locale, version);
          
          if (validation.isValid) {
            result.validLinks++;
          } else {
            const brokenLink: BrokenLink = {
              filePath: link.filePath,
              linkText: link.text,
              originalUrl: link.url,
              lineNumber: link.lineNumber,
              reason: validation.reason
            };

            // Try to find a plausible target
            const suggestedFix = this.findPlausibleTarget(link.url, locale, version);
            if (suggestedFix) {
              brokenLink.suggestedFix = suggestedFix;
              result.fixableLinks.push(brokenLink);
            } else {
              result.unfixableLinks.push(brokenLink);
            }
            
            result.brokenLinks.push(brokenLink);
          }
        }
      } catch (error) {
        console.warn(`Error processing file ${filePath}:`, error);
      }
    }

    return result;
  }

  /**
   * Fix broken links automatically where possible
   */
  async fixBrokenLinks(locale: string, version: string, dryRun: boolean = false): Promise<FixResult> {
    const auditResult = await this.auditAllLinks(locale, version);
    
    const result: FixResult = {
      totalFixed: 0,
      fixedLinks: [],
      strippedLinks: [],
      backupCreated: false,
      errors: []
    };

    if (!dryRun && auditResult.brokenLinks.length > 0) {
      // Create backup
      try {
        await this.createBackup(locale, version);
        result.backupCreated = true;
      } catch (error) {
        result.errors.push(`Failed to create backup: ${error}`);
        return result;
      }
    }

    // Group broken links by file for efficient processing
    const linksByFile = new Map<string, BrokenLink[]>();
    for (const link of auditResult.brokenLinks) {
      if (!linksByFile.has(link.filePath)) {
        linksByFile.set(link.filePath, []);
      }
      linksByFile.get(link.filePath)!.push(link);
    }

    // Process each file
    for (const [filePath, links] of linksByFile) {
      try {
        let fileContent = await fs.readFile(filePath, 'utf-8');
        let modified = false;

        // Sort links by line number (descending) to avoid offset issues
        const sortedLinks = links.sort((a, b) => (b.lineNumber || 0) - (a.lineNumber || 0));

        for (const link of sortedLinks) {
          if (link.suggestedFix) {
            // Fix the link
            const oldPattern = `[${link.linkText}](${link.originalUrl})`;
            const newPattern = `[${link.linkText}](${link.suggestedFix})`;
            
            if (fileContent.includes(oldPattern)) {
              fileContent = fileContent.replace(oldPattern, newPattern);
              modified = true;
              result.totalFixed++;
              
              result.fixedLinks.push({
                filePath: link.filePath,
                originalUrl: link.originalUrl,
                newUrl: link.suggestedFix,
                linkText: link.linkText,
                lineNumber: link.lineNumber
              });
            }
          } else {
            // Strip the link, keep the text
            const linkPattern = `[${link.linkText}](${link.originalUrl})`;
            
            if (fileContent.includes(linkPattern)) {
              fileContent = fileContent.replace(linkPattern, link.linkText);
              modified = true;
              result.strippedLinks.push(link);
            }
          }
        }

        // Write the modified file
        if (modified && !dryRun) {
          await fs.writeFile(filePath, fileContent, 'utf-8');
        }
      } catch (error) {
        result.errors.push(`Error processing ${filePath}: ${error}`);
      }
    }

    return result;
  }

  /**
   * Find a plausible target for a broken link
   */
  findPlausibleTarget(brokenUrl: string, locale: string, version: string): string | null {
    // Normalize the broken URL
    const normalizedUrl = this.normalizeLink(brokenUrl, locale, version);
    
    // Extract the slug from the URL
    const slug = this.extractSlugFromUrl(normalizedUrl);
    if (!slug) return null;

    // Look for exact matches first
    if (this.availableFiles.has(slug)) {
      return this.availableFiles.get(slug)!;
    }

    // Look for similar slugs (same name, different extension)
    const baseName = path.basename(slug, path.extname(slug));
    
    for (const [availableSlug, availablePath] of this.availableFiles) {
      const availableBaseName = path.basename(availableSlug, path.extname(availableSlug));
      
      if (availableBaseName === baseName) {
        return availablePath;
      }
    }

    // Look for partial matches (fuzzy matching)
    const candidates: Array<{ slug: string; path: string; score: number }> = [];
    
    for (const [availableSlug, availablePath] of this.availableFiles) {
      const score = this.calculateSimilarity(slug, availableSlug);
      if (score > 0.6) { // Threshold for similarity
        candidates.push({ slug: availableSlug, path: availablePath, score });
      }
    }

    // Return the best match
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].path;
    }

    return null;
  }

  /**
   * Normalize a link to be locale/version-aware
   */
  normalizeLink(link: string, locale: string, version: string): string {
    // Skip external links
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('//')) {
      return link;
    }

    // Skip anchor links
    if (link.startsWith('#')) {
      return link;
    }

    // Remove leading slash if present
    let normalizedLink = link.startsWith('/') ? link.slice(1) : link;

    // If the link doesn't start with locale/version, prepend it
    if (!normalizedLink.startsWith(`${locale}/${version}/`)) {
      normalizedLink = `${locale}/${version}/${normalizedLink}`;
    }

    return normalizedLink;
  }

  /**
   * Build a map of available files for quick lookup
   */
  private async buildAvailableFilesMap(contentPath: string): Promise<void> {
    this.availableFiles.clear();
    
    try {
      const files = await this.findMarkdownFiles(contentPath);
      
      for (const filePath of files) {
        // Convert file path to URL slug
        const relativePath = path.relative(this.contentRoot, filePath);
        const slug = this.filePathToSlug(relativePath);
        this.availableFiles.set(slug, relativePath);
      }
    } catch (error) {
      console.warn('Error building available files map:', error);
    }
  }

  /**
   * Find all markdown files in a directory
   */
  private async findMarkdownFiles(contentPath: string): Promise<string[]> {
    const patterns = this.fileExtensions.map(ext => `${contentPath}/**/*${ext}`);
    const files: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, { absolute: true });
        files.push(...matches);
      } catch (error) {
        console.warn(`Error finding files with pattern ${pattern}:`, error);
      }
    }
    
    return files;
  }

  /**
   * Extract markdown links from file content
   */
  private extractMarkdownLinks(content: string, filePath: string): Array<{
    text: string;
    url: string;
    filePath: string;
    lineNumber?: number;
  }> {
    const links: Array<{ text: string; url: string; filePath: string; lineNumber?: number }> = [];
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        const [, text, url] = match;
        
        // Skip external links and anchors for internal validation
        if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//') && !url.startsWith('#')) {
          links.push({
            text,
            url,
            filePath,
            lineNumber: index + 1
          });
        }
      }
    });
    
    return links;
  }

  /**
   * Validate a single link
   */
  private async validateLink(
    link: { text: string; url: string; filePath: string; lineNumber?: number },
    locale: string,
    version: string
  ): Promise<{ isValid: boolean; reason: string }> {
    try {
      const normalizedUrl = this.normalizeLink(link.url, locale, version);
      const slug = this.extractSlugFromUrl(normalizedUrl);
      
      if (!slug) {
        return { isValid: false, reason: 'Invalid URL format' };
      }

      // Check if the target file exists
      if (this.availableFiles.has(slug)) {
        return { isValid: true, reason: 'Valid link' };
      }

      // Check if it's a valid file path
      const targetPath = path.join(this.contentRoot, slug);
      try {
        await fs.access(targetPath);
        return { isValid: true, reason: 'Valid file path' };
      } catch {
        return { isValid: false, reason: 'Target file does not exist' };
      }
    } catch (error) {
      return { isValid: false, reason: `Validation error: ${error}` };
    }
  }

  /**
   * Extract slug from URL
   */
  private extractSlugFromUrl(url: string): string | null {
    // Remove query parameters and fragments
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Remove leading slash
    return cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;
  }

  /**
   * Convert file path to URL slug
   */
  private filePathToSlug(filePath: string): string {
    // Remove file extension and convert to URL format
    const withoutExt = filePath.replace(/\.(mdx?|md)$/, '');
    return withoutExt.replace(/\\/g, '/'); // Normalize path separators
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Create backup of content before making changes
   */
  private async createBackup(locale: string, version: string): Promise<void> {
    const contentPath = path.join(this.contentRoot, locale, version);
    const backupPath = path.join(this.contentRoot, `${locale}-${version}-backup-${Date.now()}`);
    
    try {
      await fs.cp(contentPath, backupPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }
}