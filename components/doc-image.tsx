'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  getAssetContextFromPathname, 
  resolveAssetWithFallback, 
  generateDirectAssetPath,
  type AssetContext 
} from '@/lib/asset-context';
import type { AssetManifest, ManifestEntry } from '@/lib/asset-processor';

interface DocImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  placeholder?: 'blur' | 'empty';
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
 * Skeleton loader component for images with unknown dimensions
 */
function ImageSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={`animate-pulse bg-muted rounded ${className}`}
      style={{ aspectRatio: '16/9', minHeight: '200px' }}
      role="img"
      aria-label="Loading image..."
    >
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading image...
        </div>
      </div>
    </div>
  );
}

/**
 * Error fallback component for failed image loads
 */
function ImageError({ 
  alt, 
  src, 
  className, 
  onRetry 
}: { 
  alt: string; 
  src: string; 
  className?: string; 
  onRetry?: () => void;
}) {
  return (
    <div 
      className={`border border-dashed border-muted-foreground/30 rounded bg-muted/20 p-8 text-center ${className}`}
      role="img"
      aria-label={`Failed to load image: ${alt}`}
    >
      <div className="text-muted-foreground">
        <div className="text-4xl mb-2">🖼️</div>
        <div className="text-sm font-medium mb-1">Image not available</div>
        <div className="text-xs text-muted-foreground/70 mb-3">
          {alt || 'No description provided'}
        </div>
        <div className="text-xs text-muted-foreground/50 mb-3">
          Source: {src}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * DocImage component for displaying images with asset manifest resolution
 */
export function DocImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  sizes,
  placeholder = 'empty',
}: DocImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
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
          setFallbackInfo({ 
            used: resolved.fallbackUsed || false, 
            type: resolved.fallbackType 
          });
          
          // Set dimensions if available in manifest
          if (resolved.entry.dimensions) {
            setDimensions(resolved.entry.dimensions);
          }
          
          // Log fallback usage for debugging
          if (resolved.fallbackUsed) {
            console.info(`Asset fallback used for ${src}: ${resolved.fallbackType} fallback to ${resolved.publicPath}`);
          }
        } else {
          // Asset not found in manifest, generate direct path as fallback
          console.warn(`Asset not found in manifest: ${src} for context ${context.locale}/${context.version}`);
          const directPath = generateDirectAssetPath(src, context);
          setResolvedSrc(directPath);
          setFallbackInfo({ used: true, type: 'direct' });
        }
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to resolve asset';
        console.error('DocImage: Failed to resolve asset:', errorMessage);
        setError(errorMessage);
        
        // Fallback to original src
        setResolvedSrc(src);
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

  // Show skeleton loader while resolving asset
  if (isLoading) {
    return <ImageSkeleton className={className} />;
  }

  // Show error state if resolution failed and no fallback src
  if (error && !resolvedSrc) {
    return (
      <ImageError 
        alt={alt} 
        src={src} 
        className={className} 
        onRetry={handleRetry}
      />
    );
  }

  // Determine final dimensions
  const finalWidth = width || dimensions?.width;
  const finalHeight = height || dimensions?.height;

  // If we have dimensions, use Next.js Image component
  if (finalWidth && finalHeight) {
    return (
      <Image
        src={resolvedSrc || src}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        priority={priority}
        className={className}
        sizes={sizes}
        placeholder={placeholder}
        onError={() => {
          console.error(`Failed to load image: ${resolvedSrc || src}`);
        }}
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      />
    );
  }

  // For images without known dimensions, use a wrapper with Next.js Image fill
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: '16/9', minHeight: '200px' }}>
      <Image
        src={resolvedSrc || src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        placeholder={placeholder}
        className="object-contain"
        onError={() => {
          console.error(`Failed to load image: ${resolvedSrc || src}`);
        }}
      />
    </div>
  );
}

export default DocImage;