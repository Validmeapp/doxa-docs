'use client';

import { useEffect } from 'react';
import { KeyboardNavigationManager } from '@/lib/keyboard-navigation';

export function KeyboardNavigationProvider() {
  useEffect(() => {
    // Initialize keyboard navigation detection
    const manager = KeyboardNavigationManager.getInstance();
    
    // Cleanup on unmount
    return () => {
      // Note: We don't destroy the manager as it's a singleton
      // and might be used by other components
    };
  }, []);

  return null;
}