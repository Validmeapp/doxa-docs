'use client';

import { useEffect } from 'react';
import { runAccessibilityCheck } from '@/lib/accessibility-utils';

export function AccessibilityChecker() {
  useEffect(() => {
    // Run accessibility check after component mount and theme changes
    const timer = setTimeout(() => {
      runAccessibilityCheck();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Only render in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return null;
}