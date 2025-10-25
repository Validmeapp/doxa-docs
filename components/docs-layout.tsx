'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TableOfContents } from '@/components/table-of-contents';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { VersionSwitcher } from '@/components/version-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSwitcher } from '@/components/language-switcher';
import { SearchUI } from '@/components/search-ui';
import { type Locale } from '@/lib/locale-config';
import { type NavigationItem } from '@/lib/content-types';

interface DocsLayoutProps {
  children: React.ReactNode;
  locale: Locale;
  version: string;
  navigation: NavigationItem[];
}

export function DocsLayout({
  children,
  locale,
  version,
  navigation,
}: DocsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen]);

  // Prevent scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className="skip-to-content"
        onFocus={(e) => e.currentTarget.focus()}
      >
        Skip to main content
      </a>

      {/* Header */}
      <header 
        className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        role="banner"
        aria-label="Site header"
      >
        <div className="container flex h-14 items-center">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10 lg:hidden"
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-navigation"
          >
            {sidebarOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>

          {/* Logo/Title */}
          <div className="flex items-center space-x-2 lg:space-x-0">
            <h1 className="text-lg font-semibold">
              Documentation
            </h1>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Header controls */}
          <nav 
            className="flex items-center space-x-2"
            role="navigation"
            aria-label="Site utilities"
          >
            <SearchUI locale={locale} version={version} className="w-64" />
            <VersionSwitcher currentVersion={version} locale={locale} />
            <LanguageSwitcher currentLocale={locale} />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          id="sidebar-navigation"
          className={`fixed inset-y-0 left-0 z-50 w-sidebar transform border-r bg-background transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="navigation"
          aria-label="Documentation navigation"
          aria-hidden={!sidebarOpen ? "true" : "false"}
        >
          <div className="flex h-full flex-col">
            {/* Sidebar header (mobile only) */}
            <div className="flex h-14 items-center border-b px-4 lg:hidden">
              <h2 className="text-lg font-semibold" id="sidebar-title">
                Navigation
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-auto inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
                aria-label="Close navigation menu"
                aria-describedby="sidebar-title"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-y-auto py-4" role="tree" aria-label="Documentation sections">
              <Sidebar
                navigation={navigation}
                locale={locale}
                version={version}
              />
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSidebarOpen(false);
              }
            }}
            aria-hidden="true"
            role="button"
            tabIndex={0}
            aria-label="Close navigation menu"
          />
        )}

        {/* Main content area */}
        <main 
          className="flex-1 lg:ml-0"
          role="main"
          aria-label="Main content"
        >
          <div className="flex">
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="container py-6 lg:py-8">
                <div className="mx-auto max-w-4xl">
                  {/* Breadcrumbs */}
                  <nav 
                    className="mb-6"
                    role="navigation"
                    aria-label="Breadcrumb navigation"
                  >
                    <Breadcrumbs
                      navigation={navigation}
                      locale={locale}
                      version={version}
                    />
                  </nav>
                  
                  <div id="main-content" tabIndex={-1}>
                    {children}
                  </div>
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <aside 
              className="hidden xl:block w-toc flex-shrink-0"
              role="navigation"
              aria-label="Table of contents"
            >
              <div className="sticky top-20 py-6">
                <TableOfContents />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}