'use client';

import { useState, useCallback } from 'react';

interface UseAssetRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

interface UseAssetRetryReturn {
  retryCount: number;
  isRetrying: boolean;
  canRetry: boolean;
  retry: () => void;
  reset: () => void;
}

/**
 * Hook for managing asset loading retry logic
 */
export function useAssetRetry(options: UseAssetRetryOptions = {}): UseAssetRetryReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const canRetry = retryCount < maxRetries;

  const retry = useCallback(() => {
    if (!canRetry || isRetrying) {
      return;
    }

    setIsRetrying(true);
    
    // Call retry callback
    if (onRetry) {
      onRetry(retryCount + 1);
    }

    // Add delay before retry
    setTimeout(() => {
      setRetryCount(prev => {
        const newCount = prev + 1;
        
        // Check if max retries reached
        if (newCount >= maxRetries && onMaxRetriesReached) {
          onMaxRetriesReached();
        }
        
        return newCount;
      });
      setIsRetrying(false);
    }, retryDelay);
  }, [canRetry, isRetrying, retryCount, maxRetries, retryDelay, onRetry, onMaxRetriesReached]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retryCount,
    isRetrying,
    canRetry,
    retry,
    reset,
  };
}

export default useAssetRetry;