'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for images with unknown dimensions
 */
export function ImageSkeleton({ className = '' }: SkeletonProps) {
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
 * Skeleton loader for asset links
 */
export function AssetLinkSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`inline-flex items-center gap-2 animate-pulse ${className}`}>
      <div className="w-4 h-4 bg-muted rounded" />
      <div className="w-24 h-4 bg-muted rounded" />
      <div className="w-16 h-3 bg-muted rounded" />
    </div>
  );
}

/**
 * Skeleton loader for image with known aspect ratio
 */
export function ImageSkeletonWithRatio({ 
  aspectRatio = '16/9', 
  className = '' 
}: SkeletonProps & { aspectRatio?: string }) {
  return (
    <div 
      className={`animate-pulse bg-muted rounded ${className}`}
      style={{ aspectRatio, minHeight: '100px' }}
      role="img"
      aria-label="Loading image..."
    >
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        <div className="flex flex-col items-center gap-1">
          <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for asset metadata
 */
export function AssetMetadataSkeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`inline-flex items-center gap-1 animate-pulse ${className}`}>
      <div className="w-12 h-3 bg-muted rounded" />
      <div className="w-8 h-3 bg-muted rounded" />
    </div>
  );
}

/**
 * Progressive loading skeleton that shows different states
 */
export function ProgressiveImageSkeleton({ 
  stage = 'loading',
  className = '' 
}: SkeletonProps & { stage?: 'loading' | 'processing' | 'optimizing' }) {
  const messages = {
    loading: 'Loading image...',
    processing: 'Processing image...',
    optimizing: 'Optimizing image...',
  };

  return (
    <div 
      className={`animate-pulse bg-muted rounded ${className}`}
      style={{ aspectRatio: '16/9', minHeight: '200px' }}
      role="img"
      aria-label={messages[stage]}
    >
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          {messages[stage]}
        </div>
        <div className="w-32 h-1 bg-muted-foreground/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary/50 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>
    </div>
  );
}

export default {
  ImageSkeleton,
  AssetLinkSkeleton,
  ImageSkeletonWithRatio,
  AssetMetadataSkeleton,
  ProgressiveImageSkeleton,
};