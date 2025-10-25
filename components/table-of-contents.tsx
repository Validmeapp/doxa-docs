'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface TOCItem {
  id: string;
  title: string;
  level: number;
  children?: TOCItem[];
}

interface TableOfContentsProps {
  items?: TOCItem[];
  className?: string;
}

export function TableOfContents({ items = [], className = '' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');
  const [tocItems, setTocItems] = useState<TOCItem[]>(items);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const headingElementsRef = useRef<Element[]>([]);

  // Generate a clean ID from text with uniqueness
  const generateId = useCallback((text: string, existingIds: Set<string> = new Set()): string => {
    let baseId = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
    
    // Ensure uniqueness by adding a counter if needed
    let id = baseId;
    let counter = 1;
    while (existingIds.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    
    existingIds.add(id);
    return id;
  }, []);

  // Auto-generate TOC from page headings if no items provided
  useEffect(() => {
    const generateTOC = () => {
      if (items.length === 0) {
        const headings = document.querySelectorAll('h2, h3, h4');
        const generatedItems: TOCItem[] = [];
        const existingIds = new Set<string>();

        headings.forEach((heading) => {
          const title = heading.textContent || '';
          const level = parseInt(heading.tagName.charAt(1));
          let id = heading.id;

          // Generate ID if not present
          if (!id && title) {
            id = generateId(title, existingIds);
            heading.id = id;
          } else if (id) {
            existingIds.add(id);
          }

          if (id && title) {
            generatedItems.push({
              id,
              title,
              level,
            });
          }
        });

        setTocItems(generatedItems);
        headingElementsRef.current = Array.from(headings);
      } else {
        // If items are provided, ensure corresponding headings have IDs
        const headings = document.querySelectorAll('h2, h3, h4');
        headingElementsRef.current = Array.from(headings);
        
        items.forEach((item) => {
          const heading = document.getElementById(item.id);
          if (!heading) {
            // Try to find heading by text content
            const matchingHeading = Array.from(headings).find(
              (h) => h.textContent?.trim() === item.title.trim()
            );
            if (matchingHeading && !matchingHeading.id) {
              matchingHeading.id = item.id;
            }
          }
        });
        setTocItems(items);
      }
    };

    // Use a timeout to ensure DOM is ready
    const timeoutId = setTimeout(generateTOC, 100);
    
    return () => clearTimeout(timeoutId);
  }, [generateId, items]);

  // Enhanced scroll spy with better active heading detection
  useEffect(() => {
    if (tocItems.length === 0) return;

    const handleScroll = () => {
      const headings = headingElementsRef.current;
      if (headings.length === 0) return;

      // Find the heading that's currently most visible
      let activeHeading = '';
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // If we're at the bottom of the page, activate the last heading
      if (scrollY + windowHeight >= documentHeight - 10) {
        const lastHeading = headings[headings.length - 1];
        activeHeading = lastHeading.id;
      } else {
        // Find the heading that's currently in the viewport
        for (let i = headings.length - 1; i >= 0; i--) {
          const heading = headings[i];
          const rect = heading.getBoundingClientRect();
          
          // Check if heading is above the fold (with some offset)
          if (rect.top <= 100) {
            activeHeading = heading.id;
            break;
          }
        }
      }

      if (activeHeading && activeHeading !== activeId) {
        setActiveId(activeHeading);
      }
    };

    // Set up intersection observer for more precise tracking
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-10% 0% -80% 0%',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    const headings = headingElementsRef.current;
    headings.forEach((heading) => {
      if (heading.id) {
        observer.observe(heading);
      }
    });

    // Also listen to scroll events for fallback
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call

    observerRef.current = observer;

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [tocItems]);

  // Enhanced smooth scroll to heading with offset
  const scrollToHeading = useCallback((id: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }

    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // Account for sticky header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      // Update URL hash without triggering scroll
      if (history.replaceState) {
        history.replaceState(null, '', `#${id}`);
      }

      // Set focus for accessibility
      element.setAttribute('tabindex', '-1');
      element.focus();
      
      // Remove tabindex after focus
      setTimeout(() => {
        element.removeAttribute('tabindex');
      }, 1000);
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent, id: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      scrollToHeading(id);
    }
  }, [scrollToHeading]);

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="text-sm font-semibold text-foreground">On this page</h4>
      <nav className="space-y-1" role="navigation" aria-label="Table of contents">
        <div className="max-h-96 overflow-y-auto">
          {tocItems.map((item) => {
            const isActive = activeId === item.id;
            const paddingLeft = Math.max(0, (item.level - 2) * 0.75 + 0.5);
            
            return (
              <button
                key={item.id}
                onClick={(e) => scrollToHeading(item.id, e)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                className={`
                  block w-full text-left text-sm transition-all duration-200 
                  hover:text-foreground hover:bg-accent/50
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                  rounded-sm px-2 py-1.5 border-l-2 transition-colors
                  ${isActive 
                    ? 'text-foreground font-medium bg-accent border-l-primary' 
                    : 'text-muted-foreground border-l-transparent hover:border-l-muted'
                  }
                `}
                style={{
                  paddingLeft: `${paddingLeft}rem`,
                }}
                aria-current={isActive ? 'location' : undefined}
                title={`Go to ${item.title}`}
              >
                <span className="block truncate">{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}