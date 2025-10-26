import fs from 'fs';
import path from 'path';
import { NavigationItem, NavigationTree, ContentPage, SidebarConfig, SidebarGroup } from './content-types';
import { contentLoader } from './content-loader';

/**
 * Navigation tree builder that generates hierarchical navigation from content files
 */
export class NavigationBuilder {
  private contentDir: string;

  constructor(contentDir: string = 'content') {
    this.contentDir = path.resolve(process.cwd(), contentDir);
  }

  /**
   * Builds navigation tree for a specific locale and version
   * Now uses the enhanced filesystem-based generation by default
   */
  public async buildNavigationTree(locale: string, version: string): Promise<NavigationTree> {
    // Use the new filesystem-based navigation generation
    return await this.buildFilesystemNavigation(locale, version);
  }



  /**
   * Generates the navigation path for a content page
   */
  private generateNavigationPath(page: ContentPage, pathParts: string[]): string {
    // Use the page slug which already has the correct path structure
    return `/${page.frontmatter.version}/${page.slug}`;
  }



  /**
   * Enhanced method to generate human-friendly labels from directory names
   * Supports various naming conventions and special cases
   */
  public formatDirectoryName(dirName: string): string {
    // Handle special cases
    const specialCases: Record<string, string> = {
      'api': 'API',
      'ui': 'UI',
      'ux': 'UX',
      'faq': 'FAQ',
      'sdk': 'SDK',
      'cli': 'CLI',
      'http': 'HTTP',
      'https': 'HTTPS',
      'json': 'JSON',
      'xml': 'XML',
      'css': 'CSS',
      'html': 'HTML',
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'oauth': 'OAuth',
      'jwt': 'JWT',
      'rest': 'REST',
      'graphql': 'GraphQL',
      'websocket': 'WebSocket',
      'webhook': 'Webhook',
      'webhooks': 'Webhooks'
    };

    // Split on various separators
    const words = dirName
      .toLowerCase()
      .split(/[-_\s\.]+/)
      .filter(word => word.length > 0);

    return words
      .map(word => {
        // Check for special cases first
        if (specialCases[word]) {
          return specialCases[word];
        }
        
        // Handle version patterns (v1, v2, etc.)
        if (/^v\d+$/.test(word)) {
          return word.toUpperCase();
        }
        
        // Handle numbered items (01, 02, etc.) - skip them if they're just numbers
        if (/^\d+$/.test(word)) {
          return ''; // Skip pure number words
        }
        
        // Default capitalization
        return this.capitalizeWord(word);
      })
      .filter(word => word.length > 0) // Remove empty strings
      .join(' ');
  }

  /**
   * Capitalizes a single word properly
   */
  private capitalizeWord(word: string): string {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  /**
   * Builds navigation tree using filesystem-based generation with single-pass traversal
   * This is the enhanced method that supports sidebar_position and directory grouping
   */
  public async buildFilesystemNavigation(locale: string, version: string): Promise<NavigationTree> {
    const contentPath = path.join(this.contentDir, locale, version);
    
    // Check if the content directory exists
    if (!fs.existsSync(contentPath)) {
      return [];
    }

    // Load sidebar configuration if it exists
    const sidebarConfig = await this.loadSidebarConfig(locale, version);
    
    // Single-pass filesystem traversal
    const filesystemTree = await this.scanFilesystemTree(contentPath, '');
    
    // Apply sidebar configuration if available
    const navigationTree = sidebarConfig 
      ? this.applySidebarConfig(filesystemTree, sidebarConfig)
      : filesystemTree;

    // Sort the final tree
    return this.sortNavigationTree(navigationTree);
  }

  /**
   * Loads sidebar configuration from _sidebar.json or _sidebar.mjs files
   */
  public async loadSidebarConfig(locale: string, version: string): Promise<SidebarConfig | null> {
    const contentPath = path.join(this.contentDir, locale, version);
    
    // Try _sidebar.json first
    const jsonConfigPath = path.join(contentPath, '_sidebar.json');
    if (fs.existsSync(jsonConfigPath)) {
      try {
        const configContent = fs.readFileSync(jsonConfigPath, 'utf-8');
        const config = JSON.parse(configContent) as SidebarConfig;
        
        // Validate the configuration
        const validationErrors = this.validateSidebarConfig(config);
        if (validationErrors.length > 0) {
          console.warn(`Invalid sidebar config at ${jsonConfigPath}:`, validationErrors);
          console.warn('Falling back to filesystem-based navigation');
          return null;
        }
        
        return config;
      } catch (error) {
        console.warn(`Failed to parse sidebar config at ${jsonConfigPath}:`, error);
        console.warn('Falling back to filesystem-based navigation');
        return null;
      }
    }

    // Try _sidebar.mjs
    const mjsConfigPath = path.join(contentPath, '_sidebar.mjs');
    if (fs.existsSync(mjsConfigPath)) {
      try {
        // Use dynamic import for .mjs files with proper path resolution
        const absolutePath = path.resolve(mjsConfigPath);
        const configModule = await import(absolutePath);
        const config = configModule.default || configModule;
        
        // Validate the configuration
        const validationErrors = this.validateSidebarConfig(config);
        if (validationErrors.length > 0) {
          console.warn(`Invalid sidebar config at ${mjsConfigPath}:`, validationErrors);
          console.warn('Falling back to filesystem-based navigation');
          return null;
        }
        
        return config as SidebarConfig;
      } catch (error) {
        console.warn(`Failed to load sidebar config at ${mjsConfigPath}:`, error);
        console.warn('Falling back to filesystem-based navigation');
        return null;
      }
    }

    return null;
  }

  /**
   * Applies sidebar configuration to the filesystem-based navigation tree
   */
  public applySidebarConfig(tree: NavigationTree, config: SidebarConfig): NavigationTree {
    let result = [...tree];

    // Apply hidden items filter
    if (config.hidden && config.hidden.length > 0) {
      result = this.filterHiddenItems(result, config.hidden);
    }

    // Apply group configurations first (they provide base titles)
    if (config.groups) {
      result = this.applyGroupConfig(result, config.groups);
    }

    // Apply custom labels (these override group titles)
    if (config.labels) {
      result = this.applyCustomLabels(result, config.labels);
    }

    // Apply custom ordering
    if (config.order && config.order.length > 0) {
      result = this.applyCustomOrder(result, config.order);
    }

    return result;
  }

  /**
   * Scans filesystem tree in a single pass and builds navigation structure
   */
  private async scanFilesystemTree(basePath: string, relativePath: string): Promise<NavigationTree> {
    const fullPath = path.join(basePath, relativePath);
    const items: NavigationItem[] = [];

    try {
      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip hidden files and sidebar config files
        if (entry.name.startsWith('.') || entry.name.startsWith('_sidebar.')) {
          continue;
        }

        const entryPath = path.join(relativePath, entry.name);
        const fullEntryPath = path.join(fullPath, entry.name);

        if (entry.isDirectory()) {
          // Process directory
          const children = await this.scanFilesystemTree(basePath, entryPath);
          
          if (children.length > 0) {
            // Calculate directory order based on first child's order or use 0
            const minOrder = children.length > 0 
              ? Math.min(...children.map(child => child.order || 0))
              : 0;

            const dirItem: NavigationItem = {
              title: this.formatDirectoryName(entry.name),
              path: '', // Directory items don't have direct paths
              order: minOrder,
              children,
              isDirectory: true,
              originalPath: entryPath,
              customLabel: false
            };

            items.push(dirItem);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.mdx') || entry.name.endsWith('.md'))) {
          // Process markdown file
          try {
            const content = await contentLoader.loadContentFile(fullEntryPath);
            if (content) {
              // Use sidebar_position if available, otherwise fall back to order
              const order = content.frontmatter.sidebar_position ?? content.frontmatter.order ?? 0;
              
              // Use sidebar_label if available, otherwise use title
              const title = content.frontmatter.sidebar_label ?? content.frontmatter.title;

              const fileItem: NavigationItem = {
                title,
                path: this.generateNavigationPath(content, [content.frontmatter.locale, content.frontmatter.version, ...entryPath.split(path.sep)]),
                order,
                isDirectory: false,
                originalPath: entryPath,
                customLabel: !!content.frontmatter.sidebar_label,
                badge: content.frontmatter.deprecated ? 'deprecated' : undefined
              };

              items.push(fileItem);
            } else {
              console.warn(`Content loader returned null for file: ${fullEntryPath}`);
            }
          } catch (error) {
            console.warn(`Failed to process file ${fullEntryPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${fullPath}:`, error);
    }

    return items;
  }

  /**
   * Filters out hidden items from navigation tree
   */
  private filterHiddenItems(tree: NavigationTree, hiddenPaths: string[]): NavigationTree {
    return tree
      .filter(item => {
        const originalPath = item.originalPath || '';
        
        // Check exact match first
        if (hiddenPaths.includes(originalPath)) {
          return false;
        }
        
        // Check path variants for more flexible matching
        const pathVariants = [
          originalPath,
          originalPath.replace(/\/$/, ''), // Remove trailing slash
          originalPath.replace(/^\//, ''), // Remove leading slash
          path.basename(originalPath) // Just the filename/dirname
        ];
        
        return !pathVariants.some(variant => hiddenPaths.includes(variant));
      })
      .map(item => ({
        ...item,
        children: item.children ? this.filterHiddenItems(item.children, hiddenPaths) : undefined
      }));
  }

  /**
   * Applies custom labels to navigation items
   */
  private applyCustomLabels(tree: NavigationTree, labels: Record<string, string>): NavigationTree {
    return tree.map(item => {
      // Check for exact path match first
      let customLabel = labels[item.originalPath || ''];
      
      // For directories, also check without trailing slash and with various formats
      if (!customLabel && item.isDirectory && item.originalPath) {
        const pathVariants = [
          item.originalPath,
          item.originalPath.replace(/\/$/, ''), // Remove trailing slash
          item.originalPath.replace(/^\//, ''), // Remove leading slash
          path.basename(item.originalPath) // Just the directory name
        ];
        
        for (const variant of pathVariants) {
          if (labels[variant]) {
            customLabel = labels[variant];
            break;
          }
        }
      }
      
      return {
        ...item,
        title: customLabel || item.title,
        customLabel: !!customLabel,
        children: item.children ? this.applyCustomLabels(item.children, labels) : undefined
      };
    });
  }

  /**
   * Applies custom ordering to navigation items
   */
  private applyCustomOrder(tree: NavigationTree, order: string[]): NavigationTree {
    const orderMap = new Map(order.map((path, index) => [path, index]));
    
    return tree
      .map(item => ({
        ...item,
        children: item.children ? this.applyCustomOrder(item.children, order) : undefined
      }))
      .sort((a, b) => {
        // Check for exact path matches first
        let aOrder = orderMap.get(a.originalPath || '');
        let bOrder = orderMap.get(b.originalPath || '');
        
        // For directories, also check path variants
        if (aOrder === undefined && a.isDirectory && a.originalPath) {
          const pathVariants = [
            a.originalPath,
            a.originalPath.replace(/\/$/, ''),
            a.originalPath.replace(/^\//, ''),
            path.basename(a.originalPath)
          ];
          
          for (const variant of pathVariants) {
            if (orderMap.has(variant)) {
              aOrder = orderMap.get(variant);
              break;
            }
          }
        }
        
        if (bOrder === undefined && b.isDirectory && b.originalPath) {
          const pathVariants = [
            b.originalPath,
            b.originalPath.replace(/\/$/, ''),
            b.originalPath.replace(/^\//, ''),
            path.basename(b.originalPath)
          ];
          
          for (const variant of pathVariants) {
            if (orderMap.has(variant)) {
              bOrder = orderMap.get(variant);
              break;
            }
          }
        }
        
        // If both have custom order, use that
        if (aOrder !== undefined && bOrder !== undefined) {
          return aOrder - bOrder;
        }
        
        // If only one has custom order, prioritize it
        if (aOrder !== undefined) return -1;
        if (bOrder !== undefined) return 1;
        
        // Fall back to original order
        return a.order - b.order;
      });
  }

  /**
   * Validates sidebar configuration structure and content
   */
  private validateSidebarConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return errors;
    }
    
    // Validate order array
    if (config.order !== undefined) {
      if (!Array.isArray(config.order)) {
        errors.push('order must be an array of strings');
      } else if (!config.order.every((item: any) => typeof item === 'string')) {
        errors.push('order array must contain only strings');
      }
    }
    
    // Validate hidden array
    if (config.hidden !== undefined) {
      if (!Array.isArray(config.hidden)) {
        errors.push('hidden must be an array of strings');
      } else if (!config.hidden.every((item: any) => typeof item === 'string')) {
        errors.push('hidden array must contain only strings');
      }
    }
    
    // Validate labels object
    if (config.labels !== undefined) {
      if (typeof config.labels !== 'object' || Array.isArray(config.labels)) {
        errors.push('labels must be an object with string keys and values');
      } else {
        for (const [key, value] of Object.entries(config.labels)) {
          if (typeof key !== 'string' || typeof value !== 'string') {
            errors.push(`labels entry "${key}" must have string key and value`);
          }
        }
      }
    }
    
    // Validate groups object
    if (config.groups !== undefined) {
      if (typeof config.groups !== 'object' || Array.isArray(config.groups)) {
        errors.push('groups must be an object');
      } else {
        for (const [groupKey, groupConfig] of Object.entries(config.groups)) {
          if (typeof groupKey !== 'string') {
            errors.push(`group key "${groupKey}" must be a string`);
            continue;
          }
          
          const group = groupConfig as any;
          if (typeof group !== 'object' || Array.isArray(group)) {
            errors.push(`group "${groupKey}" must be an object`);
            continue;
          }
          
          if (group.title !== undefined && typeof group.title !== 'string') {
            errors.push(`group "${groupKey}" title must be a string`);
          }
          
          if (group.order !== undefined && typeof group.order !== 'number') {
            errors.push(`group "${groupKey}" order must be a number`);
          }
          
          if (group.collapsed !== undefined && typeof group.collapsed !== 'boolean') {
            errors.push(`group "${groupKey}" collapsed must be a boolean`);
          }
        }
      }
    }
    
    return errors;
  }

  /**
   * Applies group configuration to navigation items
   */
  private applyGroupConfig(tree: NavigationTree, groups: Record<string, SidebarGroup>): NavigationTree {
    return tree.map(item => {
      // Apply group configuration if this item has a matching group config
      const groupConfig = groups[item.originalPath || ''];
      if (groupConfig && item.isDirectory) {
        return {
          ...item,
          title: groupConfig.title || item.title,
          order: groupConfig.order !== undefined ? groupConfig.order : item.order,
          // Note: collapsed state would be handled by the UI component
          children: item.children ? this.applyGroupConfig(item.children, groups) : undefined
        };
      }
      
      // Recursively apply to children
      return {
        ...item,
        children: item.children ? this.applyGroupConfig(item.children, groups) : undefined
      };
    });
  }

  /**
   * Sorts navigation tree by order and title recursively
   */
  private sortNavigationTree(tree: NavigationTree): NavigationTree {
    return tree
      .map(item => ({
        ...item,
        children: item.children ? this.sortNavigationTree(item.children) : undefined,
      }))
      .sort((a, b) => {
        // First sort by order
        if (a.order !== b.order) {
          return a.order - b.order;
        }
        
        // If orders are equal, sort by title
        return a.title.localeCompare(b.title);
      });
  }

  /**
   * Gets all available navigation structures grouped by locale and version
   */
  public async getAllNavigationTrees(): Promise<Record<string, Record<string, NavigationTree>>> {
    const locales = await contentLoader.getAvailableLocales();
    const versions = await contentLoader.getAvailableVersions();
    const result: Record<string, Record<string, NavigationTree>> = {};

    for (const locale of locales) {
      result[locale] = {};
      for (const version of versions) {
        result[locale][version] = await this.buildNavigationTree(locale, version);
      }
    }

    return result;
  }

  /**
   * Finds a navigation item by path in the tree
   */
  public findNavigationItem(tree: NavigationTree, targetPath: string): NavigationItem | null {
    for (const item of tree) {
      if (item.path === targetPath) {
        return item;
      }
      
      if (item.children) {
        const found = this.findNavigationItem(item.children, targetPath);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }

  /**
   * Gets breadcrumb trail for a given path
   */
  public getBreadcrumbs(tree: NavigationTree, targetPath: string): NavigationItem[] {
    const breadcrumbs: NavigationItem[] = [];
    
    const findPath = (items: NavigationTree, path: NavigationItem[]): boolean => {
      for (const item of items) {
        const currentPath = [...path, item];
        
        if (item.path === targetPath) {
          breadcrumbs.push(...currentPath);
          return true;
        }
        
        if (item.children && findPath(item.children, currentPath)) {
          return true;
        }
      }
      return false;
    };
    
    findPath(tree, []);
    return breadcrumbs;
  }

  /**
   * Gets navigation statistics for debugging and monitoring
   */
  public getNavigationStats(tree: NavigationTree): {
    totalItems: number;
    maxDepth: number;
    directoriesCount: number;
    pagesCount: number;
  } {
    let totalItems = 0;
    let maxDepth = 0;
    let directoriesCount = 0;
    let pagesCount = 0;

    const traverse = (items: NavigationTree, depth: number = 0): void => {
      maxDepth = Math.max(maxDepth, depth);
      
      for (const item of items) {
        totalItems++;
        
        if (item.path === '' || !item.path) {
          directoriesCount++;
        } else {
          pagesCount++;
        }
        
        if (item.children) {
          traverse(item.children, depth + 1);
        }
      }
    };

    traverse(tree);

    return {
      totalItems,
      maxDepth,
      directoriesCount,
      pagesCount,
    };
  }

  /**
   * Validates navigation tree structure
   */
  public validateNavigationTree(tree: NavigationTree): string[] {
    const errors: string[] = [];
    const seenPaths = new Set<string>();

    const validateItem = (item: NavigationItem, depth: number = 0): void => {
      // Check for required fields
      if (!item.title) {
        errors.push(`Navigation item missing title at depth ${depth}`);
      }
      
      // Check for duplicate paths (only for items with paths)
      if (item.path && item.path !== '') {
        if (seenPaths.has(item.path)) {
          errors.push(`Duplicate navigation path: ${item.path}`);
        } else {
          seenPaths.add(item.path);
        }
      }
      
      // Validate children recursively
      if (item.children) {
        for (const child of item.children) {
          validateItem(child, depth + 1);
        }
      }
    };

    for (const item of tree) {
      validateItem(item);
    }

    return errors;
  }
}

// Export singleton instance
export const navigationBuilder = new NavigationBuilder();

/**
 * Convenience function to get navigation tree for a locale and version
 */
export async function getNavigationTree(locale: string, version: string): Promise<NavigationTree> {
  return await navigationBuilder.buildNavigationTree(locale, version);
}