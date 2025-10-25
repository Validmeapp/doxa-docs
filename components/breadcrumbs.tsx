'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { type NavigationItem } from '@/lib/content-types';
import { type Locale } from '@/lib/locale-config';

interface BreadcrumbItem {
  title: string;
  href: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbsProps {
  navigation: NavigationItem[];
  locale: Locale;
  version: string;
  className?: string;
}

export function Breadcrumbs({ navigation, locale, version, className = '' }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  // Extract the docs path from the full pathname
  const docsPath = pathname.replace(`/${locale}/docs`, '') || '/';

  // Generate breadcrumb items from navigation and current path
  const breadcrumbItems = useMemo(() => {
    const items: BreadcrumbItem[] = [];
    
    // Always start with home
    items.push({
      title: 'Documentation',
      href: `/${locale}/docs`,
    });

    // Find the current page in navigation tree
    const findPageInNavigation = (navItems: NavigationItem[], targetPath: string): NavigationItem[] | null => {
      for (const item of navItems) {
        if (item.path === targetPath) {
          return [item];
        }
        
        if (item.children) {
          const childPath = findPageInNavigation(item.children, targetPath);
          if (childPath) {
            return [item, ...childPath];
          }
        }
      }
      return null;
    };

    const pathToCurrentPage = findPageInNavigation(navigation, docsPath);
    
    if (pathToCurrentPage) {
      // Add each item in the path as a breadcrumb
      pathToCurrentPage.forEach((item, index) => {
        const isLast = index === pathToCurrentPage.length - 1;
        items.push({
          title: item.title,
          href: isLast ? '' : `/${locale}/docs${item.path}`,
          isCurrentPage: isLast,
        });
      });
    } else if (docsPath !== '/') {
      // Fallback: generate breadcrumbs from URL path
      const pathSegments = docsPath.split('/').filter(Boolean);
      let currentPath = '';
      
      pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        const isLast = index === pathSegments.length - 1;
        
        // Try to find a nice title from navigation
        const findItemByPath = (navItems: NavigationItem[]): string | null => {
          for (const item of navItems) {
            if (item.path === currentPath) {
              return item.title;
            }
            if (item.children) {
              const childTitle = findItemByPath(item.children);
              if (childTitle) return childTitle;
            }
          }
          return null;
        };

        const title = findItemByPath(navigation) || 
                     segment.split('-').map(word => 
                       word.charAt(0).toUpperCase() + word.slice(1)
                     ).join(' ');

        items.push({
          title,
          href: isLast ? '' : `/${locale}/docs${currentPath}`,
          isCurrentPage: isLast,
        });
      });
    }

    return items;
  }, [navigation, docsPath, locale]);

  // Don't render if only home breadcrumb
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  // Generate JSON-LD structured data for SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.title,
      ...(item.href && { 'item': `${process.env.NEXT_PUBLIC_SITE_URL || ''}${item.href}` }),
    })),
  };

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      {/* Breadcrumb navigation */}
      <nav 
        className={`flex items-center space-x-1 text-sm text-muted-foreground ${className}`}
        aria-label="Breadcrumb navigation"
      >
        <ol className="flex items-center space-x-1" role="list">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="flex items-center space-x-1">
              {index > 0 && (
                <ChevronRight 
                  className="h-4 w-4 flex-shrink-0" 
                  aria-hidden="true" 
                />
              )}
              
              {item.isCurrentPage ? (
                <span 
                  className="font-medium text-foreground truncate max-w-xs"
                  aria-current="page"
                >
                  {index === 0 && <Home className="h-4 w-4 inline mr-1" aria-hidden="true" />}
                  {item.title}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors truncate max-w-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm px-1 py-0.5"
                  title={item.title}
                >
                  {index === 0 && <Home className="h-4 w-4 inline mr-1" aria-hidden="true" />}
                  {item.title}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}