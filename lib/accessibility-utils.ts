/**
 * Accessibility utilities for color contrast and WCAG compliance
 */

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to relative luminance
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Please use hex colors.');
  }
  
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color combination meets WCAG AAA standards
 */
export function meetsWCAGAAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Get computed color from CSS custom property
 */
export function getComputedColor(cssVariable: string): string {
  if (typeof window === 'undefined') return '#000000';
  
  const computedStyle = getComputedStyle(document.documentElement);
  const hslValue = computedStyle.getPropertyValue(cssVariable).trim();
  
  if (!hslValue) return '#000000';
  
  // Convert HSL to hex (simplified for common cases)
  // This is a basic implementation - in production you might want a more robust converter
  const hslMatch = hslValue.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!hslMatch) return '#000000';
  
  const [, h, s, l] = hslMatch.map(Number);
  return hslToHex(h, s, l);
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTester {
  /**
   * Test color contrast for all theme combinations
   */
  static testColorContrast(): { [key: string]: { ratio: number; meetsAA: boolean; meetsAAA: boolean } } {
    const results: { [key: string]: { ratio: number; meetsAA: boolean; meetsAAA: boolean } } = {};
    
    const colorPairs = [
      { name: 'foreground-background', fg: '--foreground', bg: '--background' },
      { name: 'muted-foreground-background', fg: '--muted-foreground', bg: '--background' },
      { name: 'accent-foreground-accent', fg: '--accent-foreground', bg: '--accent' },
      { name: 'primary-foreground-primary', fg: '--primary-foreground', bg: '--primary' },
      { name: 'secondary-foreground-secondary', fg: '--secondary-foreground', bg: '--secondary' },
    ];
    
    colorPairs.forEach(({ name, fg, bg }) => {
      try {
        const fgColor = getComputedColor(fg);
        const bgColor = getComputedColor(bg);
        const ratio = getContrastRatio(fgColor, bgColor);
        
        results[name] = {
          ratio,
          meetsAA: meetsWCAGAA(fgColor, bgColor),
          meetsAAA: meetsWCAGAAA(fgColor, bgColor),
        };
      } catch (error) {
        console.warn(`Failed to test contrast for ${name}:`, error);
        results[name] = { ratio: 0, meetsAA: false, meetsAAA: false };
      }
    });
    
    return results;
  }
  
  /**
   * Test keyboard navigation
   */
  static testKeyboardNavigation(): Promise<{ focusableElements: number; tabOrder: boolean }> {
    return new Promise((resolve) => {
      const focusableElements = document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      // Test tab order (simplified)
      let tabOrderCorrect = true;
      const elements = Array.from(focusableElements) as HTMLElement[];
      
      for (let i = 0; i < elements.length - 1; i++) {
        const current = elements[i];
        const next = elements[i + 1];
        
        const currentTabIndex = parseInt(current.getAttribute('tabindex') || '0');
        const nextTabIndex = parseInt(next.getAttribute('tabindex') || '0');
        
        if (currentTabIndex > nextTabIndex && nextTabIndex >= 0) {
          tabOrderCorrect = false;
          break;
        }
      }
      
      resolve({
        focusableElements: focusableElements.length,
        tabOrder: tabOrderCorrect,
      });
    });
  }
  
  /**
   * Test ARIA labels and semantic structure
   */
  static testSemanticStructure(): { 
    landmarks: number; 
    headingStructure: boolean; 
    ariaLabels: number;
    altTexts: number;
  } {
    const landmarks = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], header, nav, main, aside, footer');
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const ariaLabels = document.querySelectorAll('[aria-label], [aria-labelledby]');
    const images = document.querySelectorAll('img');
    const imagesWithAlt = document.querySelectorAll('img[alt]');
    
    // Check heading structure (simplified)
    let headingStructureCorrect = true;
    let previousLevel = 0;
    
    headings.forEach((heading) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (previousLevel > 0 && level > previousLevel + 1) {
        headingStructureCorrect = false;
      }
      previousLevel = level;
    });
    
    return {
      landmarks: landmarks.length,
      headingStructure: headingStructureCorrect,
      ariaLabels: ariaLabels.length,
      altTexts: imagesWithAlt.length / Math.max(images.length, 1),
    };
  }
}

/**
 * Development-only accessibility checker
 */
export function runAccessibilityCheck(): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.group('🔍 Accessibility Check');
  
  // Color contrast
  const contrastResults = AccessibilityTester.testColorContrast();
  console.group('🎨 Color Contrast');
  Object.entries(contrastResults).forEach(([name, result]) => {
    const status = result.meetsAA ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.ratio.toFixed(2)} (AA: ${result.meetsAA}, AAA: ${result.meetsAAA})`);
  });
  console.groupEnd();
  
  // Keyboard navigation
  AccessibilityTester.testKeyboardNavigation().then((navResults) => {
    console.group('⌨️ Keyboard Navigation');
    console.log(`Focusable elements: ${navResults.focusableElements}`);
    console.log(`Tab order: ${navResults.tabOrder ? '✅' : '❌'}`);
    console.groupEnd();
  });
  
  // Semantic structure
  const semanticResults = AccessibilityTester.testSemanticStructure();
  console.group('🏗️ Semantic Structure');
  console.log(`Landmarks: ${semanticResults.landmarks}`);
  console.log(`Heading structure: ${semanticResults.headingStructure ? '✅' : '❌'}`);
  console.log(`ARIA labels: ${semanticResults.ariaLabels}`);
  console.log(`Alt texts: ${(semanticResults.altTexts * 100).toFixed(1)}%`);
  console.groupEnd();
  
  console.groupEnd();
}