import fs from 'fs';
import path from 'path';
import { NavigationItem, NavigationTree, ContentPage } from './content-types';
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
   */
  public async buildNavigationTree(locale: string, version: string): Promise<NavigationTree> {
    // Load content for the specific locale and version
    const content = await contentLoader.loadContentByLocaleAndVersion(locale, version);
    
    if (content.length === 0) {
      return [];
    }

    // Group content by directory structure
    const navigationMap = this.groupContentByPath(content);
    
    // Build hierarchical tree
    const tree = this.buildHierarchy(navigationMap);
    
    // Sort tree by order and title
    return this.sortNavigationTree(tree);
  }

  /**
   * Groups content pages by their directory path structure
   */
  private groupContentByPath(content: ContentPage[]): Map<string, NavigationItem[]> {
    const navigationMap = new Map<string, NavigationItem[]>();

    for (const page of content) {
      const relativePath = path.relative(this.contentDir, page.filePath);
      const pathParts = relativePath.split(path.sep);
      
      // Remove locale and version from path (first two parts)
      // e.g., "en/v1/api-reference/users.mdx" -> "api-reference/users.mdx"
      const contentPath = pathParts.slice(2);
      
      // Get directory path (all parts except the filename)
      const dirPath = contentPath.length > 1 ? contentPath.slice(0, -1).join('/') : '';
      
      // Create navigation item
      const navItem: NavigationItem = {
        title: page.frontmatter.title,
        path: this.generateNavigationPath(page, pathParts),
        order: page.frontmatter.order,
        badge: page.frontmatter.deprecated ? 'deprecated' : undefined,
      };

      // Add to appropriate directory group
      if (!navigationMap.has(dirPath)) {
        navigationMap.set(dirPath, []);
      }
      navigationMap.get(dirPath)!.push(navItem);
    }

    return navigationMap;
  }

  /**
   * Generates the navigation path for a content page
   */
  private generateNavigationPath(page: ContentPage, pathParts: string[]): string {
    // Use the page slug which already has the correct path structure
    return `/v1/${page.slug}`;
  }

  /**
   * Builds hierarchical navigation structure from grouped content
   */
  private buildHierarchy(navigationMap: Map<string, NavigationItem[]>): NavigationTree {
    const rootItems: NavigationItem[] = [];
    const processedPaths = new Set<string>();

    // First, add all root-level items (empty directory path)
    const rootContent = navigationMap.get('') || [];
    rootItems.push(...rootContent);
    processedPaths.add('');

    // Then, process nested directories
    const sortedPaths = Array.from(navigationMap.keys())
      .filter(path => path !== '')
      .sort((a, b) => a.split('/').length - b.split('/').length);

    for (const dirPath of sortedPaths) {
      if (processedPaths.has(dirPath)) {
        continue;
      }

      const items = navigationMap.get(dirPath) || [];
      const pathParts = dirPath.split('/');
      
      // Find or create parent directory item
      const parentPath = pathParts.slice(0, -1).join('/');
      const dirName = pathParts[pathParts.length - 1];
      
      // Calculate directory order based on first child's order
      const minOrder = items.length > 0 ? Math.min(...items.map(item => item.order)) : 0;
      
      // Create directory navigation item
      const dirItem: NavigationItem = {
        title: this.formatDirectoryTitle(dirName),
        path: '', // Directory items don't have direct paths
        order: minOrder, // Use minimum order of children for sorting
        children: items,
      };

      // Add to appropriate parent
      if (parentPath === '') {
        rootItems.push(dirItem);
      } else {
        this.addToParent(rootItems, parentPath.split('/'), dirItem);
      }

      processedPaths.add(dirPath);
    }

    return rootItems;
  }

  /**
   * Adds a navigation item to its parent in the hierarchy
   */
  private addToParent(items: NavigationItem[], pathParts: string[], item: NavigationItem): void {
    if (pathParts.length === 0) {
      return;
    }

    const [currentPart, ...remainingParts] = pathParts;
    const targetTitle = this.formatDirectoryTitle(currentPart);

    for (const navItem of items) {
      if (navItem.title === targetTitle) {
        if (remainingParts.length === 0) {
          // This is the direct parent
          if (!navItem.children) {
            navItem.children = [];
          }
          navItem.children.push(item);
        } else {
          // Continue searching in children
          if (navItem.children) {
            this.addToParent(navItem.children, remainingParts, item);
          }
        }
        break;
      }
    }
  }

  /**
   * Formats directory name into a readable title
   */
  private formatDirectoryTitle(dirName: string): string {
    return dirName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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