'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MDXCodeBlock } from './mdx-code-block';

interface ContentRendererProps {
  content: string;
  className?: string;
}

interface ManagedRoot {
  root: Root;
  unmountTimer: ReturnType<typeof setTimeout> | null;
}

// Shared registry across StrictMode mount/unmount cycles in dev.
const rootRegistry = new WeakMap<HTMLElement, ManagedRoot>();

function scheduleUnmount(element: HTMLElement, managed: ManagedRoot) {
  if (managed.unmountTimer) return;

  managed.unmountTimer = setTimeout(() => {
    try {
      managed.root.unmount();
    } catch (error) {
      console.debug('Root already unmounted:', error);
    } finally {
      rootRegistry.delete(element);
      managed.unmountTimer = null;
    }
  }, 0);
}

/**
 * Content renderer that processes HTML content and replaces code blocks
 * with React components for client-side rendering
 */
export function ContentRenderer({ content, className = '' }: ContentRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Map<HTMLElement, ManagedRoot>>(new Map());

  const decodeBase64Utf8 = (encoded: string): string => {
    // atob returns a latin1-style binary string. Convert bytes to UTF-8 text
    // so JSON payloads with non-ASCII characters parse correctly.
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Find all MDX code block markers
    const codeBlockMarkers = Array.from(
      containerRef.current.querySelectorAll('div[data-mdx-code-block]')
    ) as HTMLElement[];
    const activeMarkers = new Set(codeBlockMarkers);
    
    codeBlockMarkers.forEach((marker) => {
      const encodedData = marker.getAttribute('data-mdx-code-block');
      
      if (!encodedData) return;

      try {
        // Decode the code block data (using atob for browser compatibility)
        const codeBlockData = JSON.parse(decodeBase64Utf8(encodedData));
        
        const { language, code, filename, highlightLines, showLineNumbers, ...otherProps } = codeBlockData;
        
        const element = marker as HTMLElement;
        let managed = rootsRef.current.get(element) || rootRegistry.get(element);
        if (managed?.unmountTimer) {
          clearTimeout(managed.unmountTimer);
          managed.unmountTimer = null;
        }

        if (!managed) {
          managed = {
            root: createRoot(element),
            unmountTimer: null,
          };
          rootRegistry.set(element, managed);
        }
        rootsRef.current.set(element, managed);

        managed.root.render(
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

    // Cleanup roots for markers that no longer exist after content refresh.
    for (const [element, managed] of rootsRef.current.entries()) {
      if (!activeMarkers.has(element) || !element.isConnected) {
        scheduleUnmount(element, managed);
        rootsRef.current.delete(element);
      }
    }
  }, [content]);

  useEffect(() => {
    return () => {
      const currentRoots = Array.from(rootsRef.current.entries());
      rootsRef.current.clear();

      currentRoots.forEach(([element, managed]) => {
        scheduleUnmount(element, managed);
      });
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={className}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default ContentRenderer;
