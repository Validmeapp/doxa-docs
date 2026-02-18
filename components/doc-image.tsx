'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  getAssetContextFromPathname,
  type AssetContext 
} from '@/lib/asset-context';
import type { AssetManifest } from '@/lib/asset-processor';
import { ImageFallback } from '@/components/asset-fallbacks';
import {
  buildAssetCandidates,
  pickFirstReachableAssetUrl,
} from '@/lib/asset-client-resolver';

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
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const context = useAssetContext();

  // Load and resolve asset path
  useEffect(() => {
    let isMounted = true;

    const resolveAsset = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setLoadFailed(false);

        let manifest: AssetManifest | undefined;
        try {
          manifest = await loadAssetManifest();
        } catch (manifestError) {
          console.warn('DocImage: assets manifest not available, using direct resolution.', manifestError);
        }

        if (!isMounted) return;

        const { candidates, manifestEntry } = buildAssetCandidates(src, context, 'media', manifest);
        const resolved = await pickFirstReachableAssetUrl(candidates);

        if (!isMounted) return;

        if (manifestEntry?.dimensions) {
          setDimensions(manifestEntry.dimensions);
        } else {
          setDimensions(null);
        }

        if (resolved) {
          setResolvedSrc(resolved);
        } else {
          setResolvedSrc(null);
          setError(`404 Not Found: ${src}`);
        }
      } catch (err) {
        if (!isMounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to resolve asset';
        console.error('DocImage: Failed to resolve asset:', errorMessage);
        setError(errorMessage);
        setResolvedSrc(null);
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

  if (!resolvedSrc || loadFailed) {
    return (
      <ImageFallback 
        alt={alt} 
        src={src} 
        className={className} 
        onRetry={handleRetry}
        error={error || (loadFailed ? '404 Not Found' : undefined)}
      />
    );
  }

  const isVideoAsset = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(resolvedSrc);

  if (isVideoAsset) {
    return (
      <video
        src={resolvedSrc}
        controls
        className={className}
        onError={() => {
          setLoadFailed(true);
          setError(`404 Not Found: ${resolvedSrc}`);
        }}
        style={{
          maxWidth: '100%',
          height: 'auto',
        }}
      >
        Your browser does not support the video tag.
      </video>
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
          setLoadFailed(true);
          setError(`404 Not Found: ${resolvedSrc}`);
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
          setLoadFailed(true);
          setError(`404 Not Found: ${resolvedSrc}`);
        }}
      />
    </div>
  );
}

export default DocImage;
