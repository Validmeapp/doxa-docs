import { remark } from 'remark';
import { rehype } from 'rehype';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import { visit } from 'unist-util-visit';
import { TOCItem } from './content-types';

/**
 * Custom remark plugin to extract table of contents
 */
function remarkToc() {
  return (tree: any, file: any) => {
    const toc: TOCItem[] = [];
    const headingStack: TOCItem[] = [];

    visit(tree, 'heading', (node: any) => {
      if (node.depth >= 2 && node.depth <= 4) {
        const title = extractTextFromNode(node);
        const id = generateHeadingId(title);
        
        const tocItem: TOCItem = {
          id,
          title,
          level: node.depth,
          children: []
        };

        // Add id to the heading node for later processing
        if (!node.data) node.data = {};
        if (!node.data.hProperties) node.data.hProperties = {};
        node.data.hProperties.id = id;

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
      const cleanUrl = url.replace(/^\//, '').replace(/\/$/, '');
      if (!contentPages.has(cleanUrl)) {
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
 * Generate a URL-safe ID from heading text
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * MDX processor with enhanced markdown processing
 */
export class MDXProcessor {
  private remarkProcessor: any;
  private rehypeProcessor: any;
  private contentPages: Map<string, string> = new Map();

  constructor() {
    this.initializeProcessors();
  }

  /**
   * Initialize remark and rehype processors with plugins
   */
  private initializeProcessors() {
    this.remarkProcessor = remark()
      .use(remarkGfm) // GitHub Flavored Markdown
      .use(remarkFrontmatter) // Parse frontmatter
      .use(remarkToc) // Extract table of contents
      .use(remarkLinkValidator, this.contentPages); // Validate internal links

    this.rehypeProcessor = rehype()
      .use(rehypeSlug) // Add IDs to headings
      .use(rehypeAutolinkHeadings, {
        behavior: 'wrap',
        properties: {
          className: ['heading-link'],
          ariaLabel: 'Link to this heading'
        }
      }); // Add links to headings
      // Note: rehype-highlight removed temporarily due to dependency issues
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
      // Process with remark
      const remarkResult = await this.remarkProcessor.process(content);
      
      // Extract TOC and validation errors from file data
      const toc = remarkResult.data?.toc || [];
      const linkValidationErrors = remarkResult.data?.linkValidationErrors || [];

      // Convert to HTML with rehype
      const rehypeResult = await this.rehypeProcessor.process(remarkResult.toString());
      
      return {
        processedContent: rehypeResult.toString(),
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
        const cleanUrl = url.replace(/^\//, '').replace(/\/$/, '');
        if (!contentMap.has(cleanUrl)) {
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