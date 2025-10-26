import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import remarkHtml from 'remark-html';
import { visit } from 'unist-util-visit';
import { TOCItem } from './content-types';

/**
 * Custom remark plugin to extract table of contents and add IDs to headings
 */
function remarkToc() {
  return (tree: any, file: any) => {
    const toc: TOCItem[] = [];
    const headingStack: TOCItem[] = [];
    const existingIds = new Set<string>();

    visit(tree, 'heading', (node: any) => {
      if (node.depth >= 1 && node.depth <= 6) {
        const title = extractTextFromNode(node);
        const id = generateHeadingId(title, existingIds);
        
        // Add id attribute to the heading for HTML output
        if (!node.data) node.data = {};
        if (!node.data.hProperties) node.data.hProperties = {};
        node.data.hProperties.id = id;

        // Only include h2-h4 in TOC
        if (node.depth >= 2 && node.depth <= 4) {
          const tocItem: TOCItem = {
            id,
            title,
            level: node.depth,
            children: []
          };

          // Build hierarchical structure
          while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= node.depth) {
            headingStack.pop();
          }

          if (headingStack.length === 0) {
            toc.push(tocItem);
          } else {
            const parent = headingStack[headingStack.length - 1];
            if (!parent.children) parent.children = [];
            parent.children.push(tocItem);
          }

          headingStack.push(tocItem);
        }
      }
    });

    // Store TOC in file data
    if (!file.data) file.data = {};
    file.data.toc = toc;
  };
}

/**
 * Custom remark plugin to validate internal links
 */
function remarkLinkValidator(contentPages: Map<string, string>) {
  return (tree: any, file: any) => {
    const errors: string[] = [];

    visit(tree, 'link', (node: any) => {
      const url = node.url;
      
      // Skip external links
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
        return;
      }

      // Skip anchor links
      if (url.startsWith('#')) {
        return;
      }

      // Check if internal link exists
      // Extract slug from URL pattern: /locale/docs/version/slug -> slug
      const urlParts = url.replace(/^\//, '').replace(/\/$/, '').split('/');
      let slug = '';
      
      // Handle different URL patterns
      if (urlParts.length >= 4 && urlParts[1] === 'docs') {
        // Pattern: /en/docs/v1/slug or /en/docs/v1/path/to/slug
        slug = urlParts.slice(3).join('/');
      } else {
        // Fallback to original logic for other patterns
        slug = urlParts.join('/');
      }
      
      if (slug && !contentPages.has(slug)) {
        errors.push(`Broken internal link: ${url}`);
      }
    });

    // Store validation errors in file data
    if (!file.data) file.data = {};
    file.data.linkValidationErrors = errors;
  };
}

/**
 * Extract text content from a heading node
 */
function extractTextFromNode(node: any): string {
  if (node.type === 'text') {
    return node.value;
  }
  
  if (node.children) {
    return node.children.map(extractTextFromNode).join('');
  }
  
  return '';
}

/**
 * Generate a URL-safe ID from heading text with uniqueness tracking
 */
function generateHeadingId(text: string, existingIds: Set<string> = new Set()): string {
  let baseId = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  
  // Ensure uniqueness by adding a counter if needed
  let id = baseId;
  let counter = 1;
  while (existingIds.has(id)) {
    id = `${baseId}-${counter}`;
    counter++;
  }
  
  existingIds.add(id);
  return id;
}

/**
 * Custom remark plugin for enhanced code blocks
 */
function remarkCodeBlocks() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      if (node.lang) {
        // Create enhanced code block with language class
        const escapedCode = escapeHtml(node.value);
        const wrappedHtml = `
          <div class="code-block-wrapper">
            <pre class="language-${node.lang}"><code class="language-${node.lang}">${escapedCode}</code></pre>
          </div>
        `;

        // Replace the code node with raw HTML
        node.type = 'html';
        node.value = wrappedHtml;
        delete node.lang;
        delete node.meta;
      } else {
        // No language specified, use plain code block
        node.type = 'html';
        node.value = `<div class="code-block-wrapper"><pre><code>${escapeHtml(node.value)}</code></pre></div>`;
      }
    });
  };
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * MDX processor with enhanced markdown processing
 */
export class MDXProcessor {
  private remarkProcessor: any;
  private contentPages: Map<string, string> = new Map();

  constructor() {
    this.initializeProcessors();
  }

  /**
   * Initialize remark processor with plugins
   */
  private initializeProcessors() {
    this.remarkProcessor = remark()
      .use(remarkGfm) // GitHub Flavored Markdown
      .use(remarkFrontmatter) // Parse frontmatter
      .use(remarkToc) // Extract table of contents
      .use(remarkLinkValidator, this.contentPages) // Validate internal links
      .use(remarkCodeBlocks) // Add enhanced code blocks
      .use(remarkHtml); // Convert to HTML
  }

  /**
   * Update the content pages map for link validation
   */
  public updateContentPages(pages: Map<string, string>) {
    this.contentPages = pages;
    // Reinitialize processors with updated content map
    this.initializeProcessors();
  }

  /**
   * Process markdown content and extract metadata
   */
  public async processMarkdown(content: string): Promise<{
    processedContent: string;
    tableOfContents: TOCItem[];
    linkValidationErrors: string[];
  }> {
    try {
      // Process with remark to HTML
      const result = await this.remarkProcessor.process(content);
      
      // Extract TOC and validation errors from file data
      const toc = result.data?.toc || [];
      const linkValidationErrors = result.data?.linkValidationErrors || [];
      
      return {
        processedContent: result.toString(),
        tableOfContents: toc,
        linkValidationErrors
      };
    } catch (error) {
      console.error('Error processing markdown:', error);
      return {
        processedContent: content,
        tableOfContents: [],
        linkValidationErrors: [`Processing error: ${error}`]
      };
    }
  }

  /**
   * Process MDX content specifically
   */
  public async processMDX(content: string): Promise<{
    processedContent: string;
    tableOfContents: TOCItem[];
    linkValidationErrors: string[];
  }> {
    // For now, treat MDX the same as markdown
    // In the future, we could add MDX-specific processing
    return this.processMarkdown(content);
  }

  /**
   * Validate all links in a batch of content
   */
  public validateAllLinks(contentMap: Map<string, string>): Map<string, string[]> {
    const validationResults = new Map<string, string[]>();
    
    for (const [path, content] of contentMap) {
      const errors: string[] = [];
      
      // Simple regex to find markdown links
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      
      while ((match = linkRegex.exec(content)) !== null) {
        const url = match[2];
        
        // Skip external links and anchors
        if (url.startsWith('http://') || url.startsWith('https://') || 
            url.startsWith('mailto:') || url.startsWith('#')) {
          continue;
        }
        
        // Check if internal link exists
        // Extract slug from URL pattern: /locale/docs/version/slug -> slug
        const urlParts = url.replace(/^\//, '').replace(/\/$/, '').split('/');
        let slug = '';
        
        // Handle different URL patterns
        if (urlParts.length >= 4 && urlParts[1] === 'docs') {
          // Pattern: /en/docs/v1/slug or /en/docs/v1/path/to/slug
          slug = urlParts.slice(3).join('/');
        } else {
          // Fallback to original logic for other patterns
          slug = urlParts.join('/');
        }
        
        if (slug && !contentMap.has(slug)) {
          errors.push(`Broken internal link: ${url}`);
        }
      }
      
      if (errors.length > 0) {
        validationResults.set(path, errors);
      }
    }
    
    return validationResults;
  }

  /**
   * Extract headings from content for TOC generation
   */
  public extractHeadings(content: string): TOCItem[] {
    const headings: TOCItem[] = [];
    const headingRegex = /^(#{2,4})\s+(.+)$/gm;
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      const id = generateHeadingId(title);

      headings.push({
        id,
        title,
        level,
        children: []
      });
    }

    // Build hierarchical structure
    const result: TOCItem[] = [];
    const stack: TOCItem[] = [];

    for (const heading of headings) {
      // Remove items from stack that are at same or deeper level
      while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        result.push(heading);
      } else {
        const parent = stack[stack.length - 1];
        if (!parent.children) parent.children = [];
        parent.children.push(heading);
      }

      stack.push(heading);
    }

    return result;
  }
}

// Export singleton instance
export const mdxProcessor = new MDXProcessor();