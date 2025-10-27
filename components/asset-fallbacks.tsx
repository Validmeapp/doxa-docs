'use client';

import React from 'react';
import { AlertTriangle, Image as ImageIcon, File, RefreshCw } from 'lucide-react';

interface FallbackProps {
  className?: string;
  onRetry?: () => void;
  canRetry?: boolean;
  isRetrying?: boolean;
}

interface ImageFallbackProps extends FallbackProps {
  alt: string;
  src: string;
  error?: string;
}

interface AssetLinkFallbackProps extends FallbackProps {
  src: string;
  children?: React.ReactNode;
  error?: string;
}

/**
 * Fallback component for failed image loads
 */
export function ImageFallback({ 
  alt, 
  src, 
  className = '', 
  onRetry, 
  canRetry = true,
  isRetrying = false,
  error
}: ImageFallbackProps) {
  return (
    <div 
      className={`border border-dashed border-muted-foreground/30 rounded bg-muted/20 p-8 text-center ${className}`}
      role="img"
      aria-label={`Failed to load image: ${alt}`}
    >
      <div className="text-muted-foreground">
        <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <div className="text-sm font-medium mb-1">Image not available</div>
        <div className="text-xs text-muted-foreground/70 mb-2">
          {alt || 'No description provided'}
        </div>
        <div className="text-xs text-muted-foreground/50 mb-3 font-mono">
          {src}
        </div>
        {error && (
          <div className="text-xs text-destructive mb-3 p-2 bg-destructive/10 rounded">
            {error}
          </div>
        )}
        {onRetry && canRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try again'}
          </button>
        )}
        {!canRetry && onRetry && (
          <div className="text-xs text-muted-foreground/50">
            Maximum retry attempts reached
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Fallback component for failed asset link loads
 */
export function AssetLinkFallback({ 
  src, 
  children, 
  className = '', 
  onRetry, 
  canRetry = true,
  isRetrying = false,
  error
}: AssetLinkFallbackProps) {
  return (
    <span 
      className={`inline-flex items-center gap-2 text-muted-foreground ${className}`}
      role="link"
      aria-label={`Failed to load asset: ${src}`}
    >
      <File className="w-4 h-4" />
      <span className="text-sm">
        {children || src.split('/').pop() || 'Unknown file'}
      </span>
      <span className="text-xs text-destructive">(unavailable)</span>
      {error && (
        <span className="text-xs text-destructive/70" title={error}>
          <AlertTriangle className="w-3 h-3" />
        </span>
      )}
      {onRetry && canRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="text-xs text-primary hover:text-primary/80 underline ml-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 inline ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'retrying...' : 'retry'}
        </button>
      )}
    </span>
  );
}

/**
 * Generic asset error fallback
 */
export function AssetErrorFallback({
  type = 'asset',
  message = 'Failed to load asset',
  className = '',
  onRetry,
  canRetry = true,
  isRetrying = false,
}: {
  type?: 'asset' | 'image' | 'file';
  message?: string;
  className?: string;
  onRetry?: () => void;
  canRetry?: boolean;
  isRetrying?: boolean;
}) {
  const icons = {
    asset: File,
    image: ImageIcon,
    file: File,
  };

  const IconComponent = icons[type];

  return (
    <div className={`flex items-center gap-2 p-3 border border-dashed border-destructive/30 rounded bg-destructive/5 text-destructive ${className}`}>
      <IconComponent className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1">
        <div className="text-sm font-medium">{message}</div>
        {onRetry && canRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="text-xs text-primary hover:text-primary/80 underline mt-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 inline mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Try again'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Placeholder image component for missing assets
 */
export function PlaceholderImage({
  alt,
  width,
  height,
  className = '',
  aspectRatio = '16/9',
}: {
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  aspectRatio?: string;
}) {
  const style = width && height 
    ? { width, height }
    : { aspectRatio, minHeight: '200px' };

  return (
    <div 
      className={`flex items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/30 rounded ${className}`}
      style={style}
      role="img"
      aria-label={alt}
    >
      <div className="text-center text-muted-foreground">
        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <div className="text-xs font-medium">Image placeholder</div>
        <div className="text-xs opacity-70 mt-1">{alt}</div>
      </div>
    </div>
  );
}

export default {
  ImageFallback,
  AssetLinkFallback,
  AssetErrorFallback,
  PlaceholderImage,
};