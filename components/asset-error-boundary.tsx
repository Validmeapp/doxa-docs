'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for asset-related components
 * Provides graceful fallbacks when asset loading fails
 */
export class AssetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('AssetErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="border border-dashed border-muted-foreground/30 rounded bg-muted/20 p-4 text-center">
          <div className="text-muted-foreground">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-sm font-medium mb-1">Asset Error</div>
            <div className="text-xs text-muted-foreground/70">
              Something went wrong loading this asset
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AssetErrorBoundary;