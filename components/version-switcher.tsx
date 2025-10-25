'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, GitBranch } from 'lucide-react';
import { type Locale } from '@/lib/locale-config';

interface VersionSwitcherProps {
  currentVersion: string;
  locale: Locale;
}

// Available versions - this would typically come from a config or API
const availableVersions = [
  { value: 'v2', label: 'v2.0', status: 'latest' as const },
  { value: 'v1', label: 'v1.0', status: 'stable' as const },
] as const;

export function VersionSwitcher({ currentVersion, locale }: VersionSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  // Switch version while preserving the current path
  const switchVersion = (newVersion: string) => {
    setIsOpen(false);
    
    // Extract the path after /docs
    const docsPath = pathname.replace(`/${locale}/docs`, '') || '/';
    
    // Navigate to the new version with the same path
    const newPath = `/${locale}/docs/${newVersion}${docsPath === '/' ? '' : docsPath}`;
    router.push(newPath);
  };

  const currentVersionInfo = availableVersions.find(v => v.value === currentVersion);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current version: ${currentVersionInfo?.label}. Click to change version.`}
      >
        <GitBranch className="h-4 w-4" />
        <span>{currentVersionInfo?.label || currentVersion}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[160px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
          role="listbox"
          aria-label="Select version"
        >
          {availableVersions.map((version) => {
            const isSelected = version.value === currentVersion;
            
            return (
              <button
                key={version.value}
                onClick={() => switchVersion(version.value)}
                className={`w-full rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none ${
                  isSelected ? 'bg-accent text-accent-foreground' : ''
                }`}
                role="option"
                aria-selected={isSelected}
                disabled={isSelected}
              >
                <div className="flex items-center justify-between">
                  <span>{version.label}</span>
                  <div className="flex items-center gap-2">
                    {version.status === 'latest' && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                        Latest
                      </span>
                    )}
                    {version.status === 'stable' && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Stable
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}