'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Command, Loader2, FileText, ExternalLink } from 'lucide-react';

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

interface SearchUIProps {
  locale: string;
  version: string;
  placeholder?: string;
  className?: string;
  onSearch?: (query: string, results: SearchResult[]) => void;
  onResultClick?: (result: SearchResult, query: string) => void;
}

export function SearchUI({ 
  locale, 
  version, 
  placeholder = "Search documentation...",
  className = "",
  onSearch,
  onResultClick
}: SearchUIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pagefind, setPagefind] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initialize Pagefind
  useEffect(() => {
    const initPagefind = async () => {
      try {
        // Create script element to load Pagefind
        const script = document.createElement('script');
        script.src = `/search/${locale}/${version}/pagefind.js`;
        script.onload = () => {
          // @ts-ignore - Pagefind is loaded globally
          if (window.pagefind) {
            // @ts-ignore
            setPagefind(window.pagefind);
          }
        };
        script.onerror = () => {
          setError(`Search is not available for ${locale}/${version}`);
        };
        
        document.head.appendChild(script);

        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      } catch (error) {
        console.warn('Could not initialize search:', error);
        setError('Search is not available');
      }
    };

    initPagefind();
  }, [locale, version]);

  const handleResultClick = useCallback(async (result: SearchResult) => {
    // Log analytics
    try {
      await fetch('/api/search/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          locale,
          version,
          resultsCount: results.length,
          clickedResultPath: result.url
        })
      });
    } catch (error) {
      console.warn('Failed to log search analytics:', error);
    }

    // Call analytics callback
    if (onResultClick) {
      onResultClick(result, query);
    }

    // Navigate to the result
    window.location.href = result.url;
    setIsOpen(false);
    setQuery('');
    setResults([]);
  }, [query, locale, version, results.length, onResultClick]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Open search with Cmd+K or Ctrl+K
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
        return;
      }

      // Handle navigation within search results
      if (isOpen) {
        switch (event.key) {
          case 'Escape':
            event.preventDefault();
            setIsOpen(false);
            setQuery('');
            setResults([]);
            break;
          case 'ArrowDown':
            event.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
            break;
          case 'ArrowUp':
            event.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
            break;
          case 'Enter':
            event.preventDefault();
            if (results[selectedIndex]) {
              handleResultClick(results[selectedIndex]);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, handleResultClick]);

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current && results.length > 0) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex, results]);

  // Perform search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!pagefind || !searchQuery.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const searchResults = await pagefind.search(searchQuery, {
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

      setResults(results);
      setSelectedIndex(0);

      // Log search analytics
      try {
        await fetch('/api/search/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            locale,
            version,
            resultsCount: results.length
          })
        });
      } catch (error) {
        console.warn('Failed to log search analytics:', error);
      }

      // Call analytics callback
      if (onSearch) {
        onSearch(searchQuery, results);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagefind, locale, version, onSearch]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400
          bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700
          hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
          ${className}
        `}
        aria-label="Open search"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">{placeholder}</span>
        <div className="hidden sm:flex items-center gap-1 ml-auto text-xs">
          <Command className="w-3 h-3" />
          <span>K</span>
        </div>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="fixed inset-x-4 top-20 mx-auto max-w-2xl">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 outline-none"
                  autoFocus
                />
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ESC to close
                </div>
              </div>

              {/* Search Results */}
              <div 
                ref={resultsRef}
                className="max-h-96 overflow-y-auto"
              >
                {error ? (
                  <div className="p-8 text-center text-red-500 dark:text-red-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{error}</p>
                  </div>
                ) : results.length > 0 ? (
                  <div className="p-2">
                    {results.map((result, index) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className={`
                          w-full text-left p-3 rounded-md transition-colors
                          ${index === selectedIndex 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="w-4 h-4 mt-1 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {highlightText(result.title, query)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {highlightText(result.excerpt, query)}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                {result.meta.locale.toUpperCase()}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                {result.meta.version}
                              </span>
                              {result.meta.tags && (
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                                  {result.meta.tags}
                                </span>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : query.trim() && !isLoading ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No results found for &ldquo;{query}&rdquo;</p>
                    <p className="text-sm mt-1">Try different keywords or check your spelling</p>
                  </div>
                ) : !query.trim() ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Start typing to search documentation</p>
                    <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">↑↓</kbd>
                        <span>Navigate</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">↵</kbd>
                        <span>Select</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">ESC</kbd>
                        <span>Close</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}