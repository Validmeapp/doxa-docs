'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { type NavigationItem } from '@/lib/content-types';
import { type Locale } from '@/lib/locale-config';

interface SidebarProps {
  navigation: NavigationItem[];
  locale: Locale;
  version: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

interface SidebarItemProps {
  item: NavigationItem;
  locale: Locale;
  version: string;
  level: number;
  currentPath: string;
  onFocus?: (element: HTMLElement) => void;
}

function SidebarItem({ item, locale, version, level, currentPath, onFocus }: SidebarItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const itemRef = useRef<HTMLElement>(null);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = currentPath === item.path;
  const isParentOfActive = item.children?.some((child: NavigationItem) => 
    currentPath.startsWith(child.path) || 
    child.children?.some((grandchild: NavigationItem) => currentPath.startsWith(grandchild.path))
  );

  // Auto-expand if this item or its children are active
  useEffect(() => {
    if (isActive || isParentOfActive) {
      setIsExpanded(true);
    }
  }, [isActive, isParentOfActive]);

  // Load collapsed state from localStorage
  useEffect(() => {
    const storageKey = `sidebar-${item.path}-expanded`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setIsExpanded(JSON.parse(stored));
    } else if (isActive || isParentOfActive) {
      // Default to expanded if active or parent of active
      setIsExpanded(true);
    }
  }, [item.path, isActive, isParentOfActive]);

  // Save collapsed state to localStorage
  const toggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    localStorage.setItem(`sidebar-${item.path}-expanded`, JSON.stringify(newExpanded));
  }, [isExpanded, item.path]);

  // Enhanced keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentElement = e.currentTarget as HTMLElement;
    
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (hasChildren) {
          toggleExpanded();
        } else {
          // Navigate to the link
          currentElement.click();
        }
        break;
        
      case 'ArrowRight':
        e.preventDefault();
        if (hasChildren && !isExpanded) {
          setIsExpanded(true);
          localStorage.setItem(`sidebar-${item.path}-expanded`, 'true');
        }
        break;
        
      case 'ArrowLeft':
        e.preventDefault();
        if (hasChildren && isExpanded) {
          setIsExpanded(false);
          localStorage.setItem(`sidebar-${item.path}-expanded`, 'false');
        }
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        focusNextItem(currentElement);
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        focusPreviousItem(currentElement);
        break;
        
      case 'Home':
        e.preventDefault();
        focusFirstItem();
        break;
        
      case 'End':
        e.preventDefault();
        focusLastItem();
        break;
        
      case 'Escape':
        e.preventDefault();
        currentElement.blur();
        break;
    }
  };

  // Helper functions for keyboard navigation
  const focusNextItem = (currentElement: HTMLElement) => {
    const allItems = Array.from(document.querySelectorAll('[data-sidebar-item]'));
    const currentIndex = allItems.indexOf(currentElement);
    const nextItem = allItems[currentIndex + 1] as HTMLElement;
    if (nextItem) {
      nextItem.focus();
    }
  };

  const focusPreviousItem = (currentElement: HTMLElement) => {
    const allItems = Array.from(document.querySelectorAll('[data-sidebar-item]'));
    const currentIndex = allItems.indexOf(currentElement);
    const previousItem = allItems[currentIndex - 1] as HTMLElement;
    if (previousItem) {
      previousItem.focus();
    }
  };

  const focusFirstItem = () => {
    const firstItem = document.querySelector('[data-sidebar-item]') as HTMLElement;
    if (firstItem) {
      firstItem.focus();
    }
  };

  const focusLastItem = () => {
    const allItems = Array.from(document.querySelectorAll('[data-sidebar-item]'));
    const lastItem = allItems[allItems.length - 1] as HTMLElement;
    if (lastItem) {
      lastItem.focus();
    }
  };

  const handleFocus = () => {
    if (itemRef.current && onFocus) {
      onFocus(itemRef.current);
    }
  };

  // Define indentation classes based on level
  const getIndentationClass = (level: number) => {
    switch (level) {
      case 0: return '';
      case 1: return 'ml-4';
      case 2: return 'ml-8';
      case 3: return 'ml-12';
      default: return 'ml-16';
    }
  };

  const baseItemClasses = `
    flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200
    hover:bg-accent hover:text-accent-foreground
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
    focus-visible:bg-accent focus-visible:text-accent-foreground
    ${getIndentationClass(level)}
    ${level === 0 ? 'font-semibold' : 'font-normal'}
  `;

  const itemClasses = `
    ${baseItemClasses}
    ${isActive 
      ? 'bg-accent text-accent-foreground font-semibold border-l-2 border-primary' 
      : level === 0 
        ? 'text-foreground' 
        : 'text-muted-foreground'
    }
  `;

  return (
    <div>
      {hasChildren ? (
        <button
          ref={itemRef as React.RefObject<HTMLButtonElement>}
          onClick={toggleExpanded}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          className={itemClasses}
          aria-expanded={isExpanded}
          aria-label={`${item.title} - ${isExpanded ? 'Collapse' : 'Expand'} section`}
          data-sidebar-item
          role="treeitem"
          aria-level={level + 1}
          aria-selected={false}
        >
          <span className="flex-shrink-0 transition-transform duration-200">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
          <span className="flex-1 text-left truncate">{item.title}</span>
          {item.badge && (
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              item.badge === 'new' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
              item.badge === 'deprecated' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            }`}>
              {item.badge}
            </span>
          )}
        </button>
      ) : (
        <Link
          ref={itemRef as React.RefObject<HTMLAnchorElement>}
          href={item.isExternal ? item.path : `/${locale}/docs${item.path}`}
          className={itemClasses}
          target={item.isExternal ? '_blank' : undefined}
          rel={item.isExternal ? 'noopener noreferrer' : undefined}
          aria-current={isActive ? 'page' : undefined}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          data-sidebar-item
          role="treeitem"
          aria-level={level + 1}
        >
          <span className="flex-1 truncate">{item.title}</span>
          {item.badge && (
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              item.badge === 'new' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
              item.badge === 'deprecated' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
              'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
            }`}>
              {item.badge}
            </span>
          )}
        </Link>
      )}

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-0.5 border-l border-border ml-3 pl-3" role="group" aria-labelledby={`sidebar-${item.path}`}>
          {item.children!.map((child: NavigationItem) => (
            <SidebarItem
              key={child.path}
              item={child}
              locale={locale}
              version={version}
              level={level + 1}
              currentPath={currentPath}
              onFocus={onFocus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ navigation, locale, version, isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [focusedElement, setFocusedElement] = useState<HTMLElement | null>(null);
  
  // Extract the docs path from the full pathname
  const docsPath = pathname.replace(`/${locale}/docs`, '') || '/';

  // Handle focus management for keyboard navigation
  const handleFocus = useCallback((element: HTMLElement) => {
    setFocusedElement(element);
  }, []);

  // Scroll focused element into view
  useEffect(() => {
    if (focusedElement) {
      focusedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [focusedElement]);

  return (
    <nav 
      className="px-6 py-6" 
      role="navigation" 
      aria-label="Documentation navigation"
    >
      {/* Documentation Title */}
      <div className="mb-8 pb-4 border-b border-border">
        <Link
          href={`/${locale}/docs`}
          className="text-lg font-bold text-foreground hover:text-primary transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm block"
        >
          Documentation
        </Link>
      </div>
      
      <div 
        className="space-y-1" 
        role="tree" 
        aria-label="Documentation structure"
      >
        {navigation.map((item, index) => (
          <SidebarItem
            key={item.path || `nav-item-${index}`}
            item={item}
            locale={locale}
            version={version}
            level={0}
            currentPath={docsPath}
            onFocus={handleFocus}
          />
        ))}
      </div>
    </nav>
  );
}