/**
 * Keyboard navigation utilities for accessibility
 */

import { useState, useEffect } from 'react';

export class KeyboardNavigationManager {
  private static instance: KeyboardNavigationManager;
  private isKeyboardUser = false;
  private listeners: Set<(isKeyboardUser: boolean) => void> = new Set();

  private constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  static getInstance(): KeyboardNavigationManager {
    if (!KeyboardNavigationManager.instance) {
      KeyboardNavigationManager.instance = new KeyboardNavigationManager();
    }
    return KeyboardNavigationManager.instance;
  }

  private init() {
    // Detect keyboard usage
    document.addEventListener('keydown', this.handleKeyDown, true);
    document.addEventListener('mousedown', this.handleMouseDown, true);
    document.addEventListener('touchstart', this.handleTouchStart, true);

    // Set initial state
    this.updateKeyboardState(false);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Only consider navigation keys as keyboard usage
    const navigationKeys = [
      'Tab',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Enter',
      ' ', // Space
      'Home',
      'End',
      'PageUp',
      'PageDown',
      'Escape',
    ];

    if (navigationKeys.includes(event.key)) {
      this.updateKeyboardState(true);
    }
  };

  private handleMouseDown = () => {
    this.updateKeyboardState(false);
  };

  private handleTouchStart = () => {
    this.updateKeyboardState(false);
  };

  private updateKeyboardState(isKeyboardUser: boolean) {
    if (this.isKeyboardUser !== isKeyboardUser) {
      this.isKeyboardUser = isKeyboardUser;
      
      // Update document class for CSS targeting
      if (isKeyboardUser) {
        document.documentElement.classList.add('keyboard-navigation');
        document.documentElement.classList.remove('mouse-navigation');
      } else {
        document.documentElement.classList.remove('keyboard-navigation');
        document.documentElement.classList.add('mouse-navigation');
      }

      // Notify listeners
      this.listeners.forEach(listener => listener(isKeyboardUser));
    }
  }

  public getIsKeyboardUser(): boolean {
    return this.isKeyboardUser;
  }

  public subscribe(listener: (isKeyboardUser: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      document.removeEventListener('keydown', this.handleKeyDown, true);
      document.removeEventListener('mousedown', this.handleMouseDown, true);
      document.removeEventListener('touchstart', this.handleTouchStart, true);
    }
    this.listeners.clear();
  }
}

/**
 * React hook for keyboard navigation detection
 */
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const manager = KeyboardNavigationManager.getInstance();
    setIsKeyboardUser(manager.getIsKeyboardUser());

    const unsubscribe = manager.subscribe(setIsKeyboardUser);
    return unsubscribe;
  }, []);

  return isKeyboardUser;
}

/**
 * Focus management utilities
 */
export class FocusManager {
  /**
   * Trap focus within a container element
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }

  /**
   * Restore focus to a previously focused element
   */
  static restoreFocus(element: HTMLElement | null) {
    if (element && typeof element.focus === 'function') {
      // Use setTimeout to ensure the element is ready to receive focus
      setTimeout(() => {
        element.focus();
      }, 0);
    }
  }

  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(selector));
  }

  /**
   * Check if an element is currently visible and focusable
   */
  static isFocusable(element: HTMLElement): boolean {
    if (element.hasAttribute('disabled') || element.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    return true;
  }
}