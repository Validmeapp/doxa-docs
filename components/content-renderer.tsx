'use client';

import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { MDXCodeBlock } from './mdx-code-block';

interface ContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Content renderer that processes HTML content and replaces code blocks
 * with React components for client-side rendering
 */
export function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Array<{ root: any; element: HTMLElement }>>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous roots asynchronously to avoid race conditions
    const previousRoots = rootsRef.current;
    rootsRef.current = [];
    
    // Schedule cleanup for next tick to avoid synchronous unmounting during render
    if (previousRoots.length > 0) {
      setTimeout(() => {
        previousRoots.forEach(({ root }) => {
          try {
            root.unmount();
          } catch (error) {
            // Ignore unmount errors as the root might already be unmounted
            console.debug('Root already unmounted:', error);
          }
        });
      }, 0);
    }

    // Find all MDX code block markers
    const codeBlockMarkers = containerRef.current.querySelectorAll('div[data-mdx-code-block]');
    
    codeBlockMarkers.forEach((marker, index) => {
      const encodedData = marker.getAttribute('data-mdx-code-block');
      
      if (!encodedData) return;

      try {
        // Decode the code block data (using atob for browser compatibility)
        const codeBlockData = JSON.parse(atob(encodedData));
        
        const { language, code, filename, highlightLines, showLineNumbers, ...otherProps } = codeBlockData;
        
        // Create a new div to replace the marker
        const newDiv = document.createElement('div');
        marker.parentNode?.replaceChild(newDiv, marker);
        
        // Create a React root and render the MDXCodeBlock component
        const root = createRoot(newDiv);
        root.render(
          <MDXCodeBlock
            className={`language-${language}`}
            filename={filename}
            highlightLines={highlightLines}
            showLineNumbers={showLineNumbers === 'true' || showLineNumbers === true}
            {...otherProps}
          >
            {code}
          </MDXCodeBlock>
        );
        
        // Store the root for cleanup
        rootsRef.current.push({ root, element: newDiv });
      } catch (error) {
        console.error('Failed to parse code block data:', error);
        // Leave the marker as-is if parsing fails
      }
    });

    // Cleanup function
    return () => {
      // Schedule cleanup asynchronously to avoid race conditions
      const currentRoots = rootsRef.current;
      rootsRef.current = [];
      
      if (currentRoots.length > 0) {
        setTimeout(() => {
          currentRoots.forEach(({ root }) => {
            try {
              root.unmount();
            } catch (error) {
              // Ignore unmount errors as the root might already be unmounted
              console.debug('Root already unmounted:', error);
            }
          });
        }, 0);
      }
    };
  }, [content]);

  return (
    <div 
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default ContentRenderer;