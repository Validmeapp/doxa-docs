/**
 * Content processing types and interfaces
 */

export interface PageFrontmatter {
  title: string;
  description: string;
  version: string;
  locale: string;
  order: number;
  sidebar_position?: number;  // New: explicit sidebar ordering
  sidebar_label?: string;     // New: custom sidebar label
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
  isDirectory?: boolean;      // New: indicates directory vs file
  originalPath?: string;      // New: original filesystem path
  customLabel?: boolean;      // New: indicates custom vs generated label
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

// New: Sidebar configuration interfaces
export interface SidebarConfig {
  order?: string[];           // Custom ordering of items
  hidden?: string[];          // Items to hide from navigation
  labels?: Record<string, string>; // Custom labels for directories
  groups?: Record<string, SidebarGroup>;
}

export interface SidebarGroup {
  title: string;
  order?: number;
  collapsed?: boolean;
}

// Link auditing interfaces
export interface BrokenLink {
  filePath: string;
  linkText: string;
  originalUrl: string;
  suggestedFix?: string;
  lineNumber?: number;
  reason: string;
}

export interface FixedLink {
  filePath: string;
  originalUrl: string;
  newUrl: string;
  linkText: string;
  lineNumber?: number;
}

export interface AuditResult {
  totalLinks: number;
  validLinks: number;
  brokenLinks: BrokenLink[];
  fixableLinks: BrokenLink[];
  unfixableLinks: BrokenLink[];
  processedFiles: number;
}

export interface FixResult {
  totalFixed: number;
  fixedLinks: FixedLink[];
  strippedLinks: BrokenLink[];
  backupCreated: boolean;
  errors: string[];
}