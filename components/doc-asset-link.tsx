'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Download, File, FileText, Archive, Image as ImageIcon } from 'lucide-react';
import { 
  getAssetContextFromPathname, 
  resolveAssetWithFallback, 
  generateDirectAssetPath,
  type AssetContext 
} from '@/lib/asset-context';
import type { AssetManifest, ManifestEntry } from '@/lib/asset-processor';

interface DocAssetLinkProps {
  src: string;
  children?: React.ReactNode;
  download?: boolean | string;
  className?: string;
  showMetadata?: boolean;
}



// Cache for the asset manifest to avoid repeated fetches
let manifestCache: AssetManifest | null = null;
let manifestPromise: Promise<AssetManifest> | null = null;

// Export function to clear cache (for testing)
export function clearManifestCache() {
  manifestCache = null;
  manifestPromise = null;
}

/**
 * Load the asset manifest from the public directory
 */
async function loadAssetManifest(): Promise<AssetManifest> {
  if (manifestCache) {
    return manifestCache;
  }

  if (manifestPromise) {
    return manifestPromise;
  }

  manifestPromise = fetch('/assets/assets-manifest.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load asset manifest: ${response.status}`);
      }
      return response.json();
    })
    .then(manifest => {
      manifestCache = manifest;
      return manifest;
    })
    .catch(error => {
      manifestPromise = null; // Reset promise on error to allow retry
      throw error;
    });

  return manifestPromise;
}

/**
 * Get asset context from current page
 */
function useAssetContext(): AssetContext {
  const pathname = usePathname();
  return getAssetContextFromPathname(pathname);
}



/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get file type display name from MIME type
 */
function getFileTypeDisplayName(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF Document',
    'application/zip': 'ZIP Archive',
    'application/json': 'JSON Data',
    'text/plain': 'Text File',
    'text/csv': 'CSV Spreadsheet',
    'application/vnd.ms-excel': 'Excel Spreadsheet',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'image/jpeg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/webp': 'WebP Image',
    'image/avif': 'AVIF Image',
    'image/gif': 'GIF Image',
    'image/svg+xml': 'SVG Image',
  };

  return typeMap[mimeType] || 'File';
}

/**
 * Get appropriate icon for file type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return ImageIcon;
  }
  
  switch (mimeType) {
    case 'application/pdf':
    case 'text/plain':
    case 'text/csv':
      return FileText;
    case 'application/zip':
      return Archive;
    default:
      return File;
  }
}

/**
 * Loading skeleton for asset link
 */
function AssetLinkSkeleton({ className }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2 animate-pulse ${className}`}>
      <div className="w-4 h-4 bg-muted rounded" />
      <div className="w-24 h-4 bg-muted rounded" />
      <div className="w-16 h-3 bg-muted rounded" />
    </div>
  );
}

/**
 * Error fallback for failed asset resolution
 */
function AssetLinkError({ 
  src, 
  children, 
  className, 
  onRetry 
}: { 
  src: string; 
  children?: React.ReactNode; 
  className?: string; 
  onRetry?: () => void;
}) {
  return (
    <span 
      className={`inline-flex items-center gap-2 text-muted-foreground ${className}`}
      role="link"
      aria-label={`Failed to load asset: ${src}`}
    >
      <File className="w-4 h-4" />
      <span className="text-sm">
        {children || src}
      </span>
      <span className="text-xs text-destructive">(unavailable)</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-primary hover:text-primary/80 underline ml-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
        >
          retry
        </button>
      )}
    </span>
  );
}

/**
 * DocAssetLink component for displaying downloadable asset links with metadata
 */
export function DocAssetLink({
  src,
  children,
  download = true,
  className = '',
  showMetadata = true,
}: DocAssetLinkProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [assetEntry, setAssetEntry] = useState<ManifestEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackInfo, setFallbackInfo] = useState<{ used: boolean; type?: string } | null>(null);
  
  const context = useAssetContext();

  // Load and resolve asset path
  useEffect(() => {
    let isMounted = true;

    const resolveAsset = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load the asset manifest
        const manifest = await loadAssetManifest();
        
        if (!isMounted) return;

        // Resolve the asset path with fallback logic
        const resolved = resolveAssetWithFallback(src, context, manifest);
        
        if (resolved) {
          setResolvedSrc(resolved.publicPath);
          setAssetEntry(resolved.entry);
          setFallbackInfo({ 
            used: resolved.fallbackUsed || false, 
            type: resolved.fallbackType 
          });
          
          // Log fallback usage for debugging
          if (resolved.fallbackUsed) {
            console.info(`Asset fallback used for ${src}: ${resolved.fallbackType} fallback to ${resolved.publicPath}`);
          }
        } else {
          // Asset not found in manifest, use direct path
          // This is expected when assets haven't been processed yet or when using external URLs
          const directPath = generateDirectAssetPath(src, context);
          setResolvedSrc(directPath);
          setAssetEntry(null);
          setFallbackInfo({ used: true, type: 'direct' });
        }
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to resolve asset';
        console.error('DocAssetLink: Failed to resolve asset:', errorMessage);
        setError(errorMessage);
        
        // Fallback to original src
        setResolvedSrc(src);
        setAssetEntry(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    resolveAsset();

    return () => {
      isMounted = false;
    };
  }, [src, context.locale, context.version, retryCount]);

  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Show loading skeleton while resolving asset
  if (isLoading) {
    return <AssetLinkSkeleton className={className} />;
  }

  // Show error state if resolution failed and no fallback src
  if (error && !resolvedSrc) {
    return (
      <AssetLinkError
        src={src}
        className={className}
        onRetry={handleRetry}
      >
        {children}
      </AssetLinkError>
    );
  }

  // Determine download filename
  const downloadFilename = typeof download === 'string' ? download : 
                          assetEntry?.hashedFilename || 
                          src.split('/').pop() || 
                          'download';

  // Get file metadata
  const fileSize = assetEntry?.fileSize;
  const mimeType = assetEntry?.mimeType || 'application/octet-stream';
  const fileTypeDisplay = getFileTypeDisplayName(mimeType);
  const FileIconComponent = getFileIcon(mimeType);

  // Determine link text
  const linkText = children || src.split('/').pop() || 'Download';

  return (
    <a
      href={resolvedSrc || src}
      download={download ? downloadFilename : undefined}
      className={`inline-flex items-center gap-2 text-primary hover:text-primary/80 underline decoration-1 underline-offset-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded ${className}`}
      target={download ? undefined : '_blank'}
      rel={download ? undefined : 'noopener noreferrer'}
      aria-label={`${download ? 'Download' : 'Open'} ${fileTypeDisplay}${fileSize ? ` (${formatFileSize(fileSize)})` : ''}`}
    >
      <FileIconComponent className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">
        {linkText}
      </span>
      {download && (
        <Download className="w-3 h-3 flex-shrink-0 opacity-70" />
      )}
      {showMetadata && assetEntry && (
        <span className="text-xs text-muted-foreground ml-1">
          ({fileTypeDisplay}
          {fileSize && `, ${formatFileSize(fileSize)}`})
        </span>
      )}
    </a>
  );
}

export default DocAssetLink;