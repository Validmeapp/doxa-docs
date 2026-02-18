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
    const assetExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif',
      '.pdf', '.csv', '.json', '.txt', '.zip', '.xls', '.xlsx'
    ];

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

      // Strip hash for slug validation.
      const cleanUrl = url.split('#')[0];
      if (!cleanUrl) {
        return;
      }

      // Skip asset/document links handled by the asset pipeline.
      const isAssetLink = assetExtensions.some(ext => cleanUrl.toLowerCase().endsWith(ext));
      if (isAssetLink) {
        return;
      }

      // Check if internal link exists
      // Extract slug from URL pattern: /locale/docs/version/slug -> slug
      const urlParts = cleanUrl.replace(/^\//, '').replace(/\/$/, '').split('/');
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
 * Custom remark plugin to convert standard Markdown images to DocImage components
 */
function remarkImageConverter() {
  return (tree: any) => {
    visit(tree, 'image', (node: any, index: number | undefined, parent: any) => {
      // Skip if we don't have proper parent/index context
      if (typeof index !== 'number' || !parent || !parent.children) {
        return;
      }

      const { url, alt, title } = node;
      
      // Skip external images (they should use regular img tags)
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return;
      }

      // Build DocImage component props
      const props: string[] = [];
      
      // Add src prop (required)
      props.push(`src="${escapeHtml(url)}"`);
      
      // Add alt prop (required)
      props.push(`alt="${escapeHtml(alt || '')}"`);
      
      // Add title as additional prop if present
      if (title) {
        props.push(`title="${escapeHtml(title)}"`);
      }

      // Create the DocImage component HTML
      const componentHtml = `<DocImage ${props.join(' ')} />`;
      
      // Replace the image node with HTML node
      const htmlNode = {
        type: 'html',
        value: componentHtml
      };
      
      parent.children[index] = htmlNode;
    });
  };
}

/**
 * Custom remark plugin to convert binary file links to DocAssetLink components
 */
function remarkAssetLinkConverter() {
  // Define binary file extensions that should be converted
  const binaryExtensions = new Set([
    '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
    '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.csv', '.json', '.xml', '.sql', '.db',
    '.exe', '.dmg', '.pkg', '.deb', '.rpm',
    '.iso', '.img', '.bin'
  ]);

  return (tree: any) => {
    visit(tree, 'link', (node: any, index: number | undefined, parent: any) => {
      // Skip if we don't have proper parent/index context
      if (typeof index !== 'number' || !parent || !parent.children) {
        return;
      }

      const { url, title } = node;
      
      // Skip external links
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
        return;
      }

      // Skip anchor links
      if (url.startsWith('#')) {
        return;
      }

      // Check if this is a binary file link
      const urlLower = url.toLowerCase();
      const isBinaryFile = Array.from(binaryExtensions).some(ext => urlLower.endsWith(ext));
      
      if (!isBinaryFile) {
        return;
      }

      // Extract link text from children
      let linkText = '';
      if (node.children && node.children.length > 0) {
        linkText = extractTextFromNode({ children: node.children });
      }

      // Build DocAssetLink component props
      const props: string[] = [];
      
      // Add src prop (required)
      props.push(`src="${escapeHtml(url)}"`);
      
      // Add download prop (default to true for binary files)
      props.push('download={true}');
      
      // Add showMetadata prop (default to true)
      props.push('showMetadata={true}');
      
      // Add title as additional prop if present
      if (title) {
        props.push(`title="${escapeHtml(title)}"`);
      }

      // Create the DocAssetLink component HTML with children
      let componentHtml;
      if (linkText.trim()) {
        componentHtml = `<DocAssetLink ${props.join(' ')}>${escapeHtml(linkText)}</DocAssetLink>`;
      } else {
        componentHtml = `<DocAssetLink ${props.join(' ')} />`;
      }
      
      // Replace the link node with HTML node
      const htmlNode = {
        type: 'html',
        value: componentHtml
      };
      
      parent.children[index] = htmlNode;
    });
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
  const baseId = text
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
 * Enhanced remark plugin to render code blocks with flexible language handling
 * Supports both typed and untyped code fences with consistent styling and functionality
 */
function remarkRenderCodeBlocks() {
  return (tree: any) => {
    visit(tree, 'code', (node: any) => {
      const originalLang = node.lang || '';
      const code = node.value || '';
      const meta = node.meta || '';
      
      // Determine if this is a typed or untyped code block
      // Handle case where metadata attributes are mistakenly parsed as language
      const isMetadataAsLang = originalLang && (
        originalLang.includes('=') || 
        originalLang.startsWith('filename') ||
        originalLang.startsWith('highlightLines') ||
        originalLang.startsWith('showLineNumbers')
      );
      
      const isTyped = originalLang && originalLang.trim().length > 0 && !isMetadataAsLang;
      const lang = isTyped ? originalLang.trim() : 'text';
      
      // Parse meta attributes (e.g., filename="example.js")
      // Handle case where metadata might be in the language field due to parsing issues
      const metaAttributes: { [key: string]: string } = {};
      const metaSources = [meta];
      
      // If language field contains metadata attributes, add it to sources
      if (isMetadataAsLang && originalLang) {
        metaSources.push(originalLang);
      }
      
      for (const metaSource of metaSources) {
        if (metaSource) {
          const metaRegex = /(\w+)=["']([^"']+)["']/g;
          let match;
          while ((match = metaRegex.exec(metaSource)) !== null) {
            metaAttributes[match[1]] = match[2];
          }
        }
      }

      // Render through the React code-block pipeline via marker placeholders.
      const codeBlockPayload = {
        language: lang,
        code,
        filename: metaAttributes.filename || undefined,
        highlightLines: metaAttributes.highlightLines || undefined,
        showLineNumbers: metaAttributes.showLineNumbers || undefined,
      };
      const encodedPayload = Buffer.from(JSON.stringify(codeBlockPayload)).toString('base64');

      node.type = 'html';
      node.value = `<div data-mdx-code-block="${encodedPayload}"></div>`;
      delete node.lang;
      delete node.meta;
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
      .use(remarkImageConverter) // Convert images to DocImage components
      .use(remarkAssetLinkConverter) // Convert binary file links to DocAssetLink components
      .use(remarkRenderCodeBlocks) // Render code blocks directly as HTML
      .use(remarkHtml, { sanitize: false }); // Convert to HTML without sanitization
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
