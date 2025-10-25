'use client';

import { useState, useEffect, useCallback } from 'react';

interface SearchResult {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  meta: {
    locale: string;
    version: string;
    tags?: string;
  };
  score: number;
}

interface UseSearchOptions {
  locale: string;
  version: string;
  onSearch?: (query: string, results: SearchResult[]) => void;
  onResultClick?: (result: SearchResult, query: string) => void;
}

export function useSearch({ locale, version, onSearch, onResultClick }: UseSearchOptions) {
  const [pagefind, setPagefind] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Pagefind
  useEffect(() => {
    const initPagefind = async () => {
      try {
        // Dynamically import Pagefind from the generated search index
        const pagefindPath = `/search/${locale}/${version}/pagefind.js`;
        
        // Create script element to load Pagefind
        const script = document.createElement('script');
        script.src = pagefindPath;
        script.onload = () => {
          // @ts-ignore - Pagefind is loaded globally
          if (window.pagefind) {
            // @ts-ignore
            setPagefind(window.pagefind);
          }
        };
        script.onerror = () => {
          setError(`Could not load search index for ${locale}/${version}`);
        };
        
        document.head.appendChild(script);

        return () => {
          document.head.removeChild(script);
        };
      } catch (error) {
        console.warn('Could not initialize search:', error);
        setError('Search is not available');
      }
    };

    initPagefind();
  }, [locale, version]);

  // Perform search
  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!pagefind || !query.trim()) {
      return [];
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const searchResults = await pagefind.search(query, {
        filters: {
          locale: locale,
          version: version
        }
      });

      const results: SearchResult[] = await Promise.all(
        searchResults.results.slice(0, 10).map(async (result: any) => {
          const data = await result.data();
          return {
            id: result.id,
            url: data.url,
            title: data.meta.title || 'Untitled',
            excerpt: data.excerpt,
            meta: {
              locale: data.meta.locale || locale,
              version: data.meta.version || version,
              tags: data.meta.tags
            },
            score: result.score
          };
        })
      );

      // Call analytics callback
      if (onSearch) {
        onSearch(query, results);
      }

      return results;
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please try again.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [pagefind, locale, version, onSearch]);

  // Handle result click
  const handleResultClick = useCallback((result: SearchResult, query: string) => {
    if (onResultClick) {
      onResultClick(result, query);
    }
  }, [onResultClick]);

  return {
    search,
    handleResultClick,
    isLoading,
    error,
    isReady: !!pagefind
  };
}