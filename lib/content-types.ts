/**
 * Content processing types and interfaces
 */

export interface PageFrontmatter {
  title: string;
  description: string;
  version: string;
  locale: string;
  order: number;
  tags?: string[];
  lastModified?: string;
  deprecated?: boolean;
  redirectFrom?: string[];
}

export interface NavigationItem {
  title: string;
  path: string;
  order: number;
  children?: NavigationItem[];
  isExternal?: boolean;
  badge?: 'new' | 'deprecated' | 'beta';
}

export type NavigationTree = NavigationItem[];

export interface TOCItem {
  id: string;
  title: string;
  level: number; // 2, 3, 4 for h2, h3, h4
  children?: TOCItem[];
}

export interface ContentPage {
  frontmatter: PageFrontmatter;
  content: string;
  slug: string;
  filePath: string;
  tableOfContents: TOCItem[];
}

export interface ContentValidationError {
  field: string;
  message: string;
  filePath: string;
}