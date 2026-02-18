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

  const decodeBase64Utf8 = (encoded: string): string => {
    // atob returns a latin1-style binary string. Convert bytes to UTF-8 text
    // so JSON payloads with non-ASCII characters parse correctly.
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Unmount previous roots synchronously before mounting new ones.
    // This avoids StrictMode races that can leave empty containers.
    if (rootsRef.current.length > 0) {
      rootsRef.current.forEach(({ root }) => {
        try {
          root.unmount();
        } catch (error) {
          console.debug('Root already unmounted:', error);
        }
      });
      rootsRef.current = [];
    }

    // Find all MDX code block markers
    const codeBlockMarkers = containerRef.current.querySelectorAll('div[data-mdx-code-block]');
    
    codeBlockMarkers.forEach((marker, index) => {
      const encodedData = marker.getAttribute('data-mdx-code-block');
      
      if (!encodedData) return;

      try {
        // Decode the code block data (using atob for browser compatibility)
        const codeBlockData = JSON.parse(decodeBase64Utf8(encodedData));
        
        const { language, code, filename, highlightLines, showLineNumbers, ...otherProps } = codeBlockData;
        
        // Mount directly on marker so re-renders can find and remount markers.
        const element = marker as HTMLElement;
        const root = createRoot(element);
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
        rootsRef.current.push({ root, element });
      } catch (error) {
        console.error('Failed to parse code block data:', error);
        const element = marker as HTMLElement;
        const encoded = marker.getAttribute('data-mdx-code-block');
        if (encoded) {
          try {
            const data = JSON.parse(decodeBase64Utf8(encoded));
            const fallbackCode = typeof data.code === 'string' ? data.code : '';
            element.innerHTML = `<pre><code>${fallbackCode
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')}</code></pre>`;
          } catch {
            // Keep marker unchanged if fallback decode also fails.
          }
        }
      }
    });

    // Cleanup function
    return () => {
      const currentRoots = rootsRef.current;
      rootsRef.current = [];

      currentRoots.forEach(({ root }) => {
        try {
          root.unmount();
        } catch (error) {
          console.debug('Root already unmounted:', error);
        }
      });
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
