/**
 * Tests for LinkAuditor class
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { LinkAuditor, AuditResult, FixResult } from '../link-auditor';

// Mock file system for testing
const mockFs = {
  files: new Map<string, string>(),
  
  async writeFile(filePath: string, content: string) {
    this.files.set(filePath, content);
  },
  
  async readFile(filePath: string): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  },
  
  async access(filePath: string) {
    if (!this.files.has(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
  },
  
  async cp(source: string, dest: string) {
    // Mock copy operation
  },
  
  clear() {
    this.files.clear();
  }
};

// Mock glob
const mockGlob = {
  results: [] as string[],
  
  async glob(pattern: string): Promise<string[]> {
    return this.results;
  },
  
  setResults(results: string[]) {
    this.results = results;
  }
};

// Mock the fs and glob modules
jest.mock('fs', () => ({
  promises: mockFs
}));

jest.mock('glob', () => ({
  glob: mockGlob.glob
}));

describe('LinkAuditor', () => {
  let auditor: LinkAuditor;
  const testContentRoot = 'test-content';
  
  beforeEach(() => {
    auditor = new LinkAuditor(testContentRoot);
    mockFs.clear();
    mockGlob.setResults([]);
  });
  
  afterEach(() => {
    mockFs.clear();
    mockGlob.setResults([]);
  });

  describe('normalizeLink', () => {
    it('should normalize relative links to be locale/version-aware', () => {
      const result = auditor.normalizeLink('getting-started.mdx', 'en', 'v1');
      expect(result).toBe('en/v1/getting-started.mdx');
    });

    it('should handle links that already include locale/version', () => {
      const result = auditor.normalizeLink('en/v1/getting-started.mdx', 'en', 'v1');
      expect(result).toBe('en/v1/getting-started.mdx');
    });

    it('should remove leading slash from absolute links', () => {
      const result = auditor.normalizeLink('/getting-started.mdx', 'en', 'v1');
      expect(result).toBe('en/v1/getting-started.mdx');
    });

    it('should skip external HTTP links', () => {
      const result = auditor.normalizeLink('https://example.com', 'en', 'v1');
      expect(result).toBe('https://example.com');
    });

    it('should skip external HTTPS links', () => {
      const result = auditor.normalizeLink('http://example.com', 'en', 'v1');
      expect(result).toBe('http://example.com');
    });

    it('should skip protocol-relative links', () => {
      const result = auditor.normalizeLink('//example.com', 'en', 'v1');
      expect(result).toBe('//example.com');
    });

    it('should skip anchor links', () => {
      const result = auditor.normalizeLink('#section', 'en', 'v1');
      expect(result).toBe('#section');
    });
  });

  describe('findPlausibleTarget', () => {
    beforeEach(async () => {
      // Set up mock available files
      const testFiles = [
        'test-content/en/docs/v1/getting-started.mdx',
        'test-content/en/docs/v1/api-reference.mdx',
        'test-content/en/docs/v1/user-guide/billing.mdx'
      ];
      
      mockGlob.setResults(testFiles);
      
      // Mock file contents
      for (const file of testFiles) {
        mockFs.files.set(file, 'mock content');
      }
      
      // Build the available files map
      await auditor.auditAllLinks('en', 'v1');
    });

    it('should find exact matches', () => {
      const result = auditor.findPlausibleTarget('getting-started.md', 'en', 'v1');
      expect(result).toBe('en/v1/getting-started.mdx');
    });

    it('should find matches with different extensions', () => {
      const result = auditor.findPlausibleTarget('api-reference.md', 'en', 'v1');
      expect(result).toBe('en/v1/api-reference.mdx');
    });

    it('should return null for non-existent files', () => {
      const result = auditor.findPlausibleTarget('non-existent.mdx', 'en', 'v1');
      expect(result).toBeNull();
    });

    it('should handle nested paths', () => {
      const result = auditor.findPlausibleTarget('user-guide/billing.md', 'en', 'v1');
      expect(result).toBe('en/v1/user-guide/billing.mdx');
    });
  });

  describe('auditAllLinks', () => {
    beforeEach(() => {
      // Set up test files
      const testFiles = [
        'test-content/en/docs/v1/index.mdx',
        'test-content/en/docs/v1/getting-started.mdx',
        'test-content/en/docs/v1/api-reference.mdx'
      ];
      
      mockGlob.setResults(testFiles);
      
      // Mock file contents with various link types
      mockFs.files.set('test-content/en/docs/v1/index.mdx', `
# Home Page

[Getting Started](getting-started.mdx)
[API Reference](api-reference.mdx)
[Broken Link](non-existent.mdx)
[External Link](https://example.com)
      `);
      
      mockFs.files.set('test-content/en/docs/v1/getting-started.mdx', `
# Getting Started

[Back to Home](index.mdx)
[Another Broken Link](missing-file.mdx)
      `);
      
      mockFs.files.set('test-content/en/docs/v1/api-reference.mdx', `
# API Reference

[Home](index.mdx)
      `);
    });

    it('should audit all links and categorize them correctly', async () => {
      const result = await auditor.auditAllLinks('en', 'v1');
      
      expect(result.processedFiles).toBe(3);
      expect(result.totalLinks).toBe(5); // Only internal links are counted
      expect(result.validLinks).toBe(3); // index.mdx, getting-started.mdx, api-reference.mdx references
      expect(result.brokenLinks).toHaveLength(2); // non-existent.mdx, missing-file.mdx
      expect(result.fixableLinks).toHaveLength(0); // No similar files to suggest
      expect(result.unfixableLinks).toHaveLength(2);
    });

    it('should provide line numbers for broken links', async () => {
      const result = await auditor.auditAllLinks('en', 'v1');
      
      const brokenLinks = result.brokenLinks;
      expect(brokenLinks.length).toBeGreaterThan(0);
      
      for (const link of brokenLinks) {
        expect(link.lineNumber).toBeGreaterThan(0);
      }
    });

    it('should handle files with no links', async () => {
      mockFs.files.set('test-content/en/docs/v1/no-links.mdx', '# No Links\n\nJust plain text.');
      mockGlob.setResults(['test-content/en/docs/v1/no-links.mdx']);
      
      const result = await auditor.auditAllLinks('en', 'v1');
      
      expect(result.processedFiles).toBe(1);
      expect(result.totalLinks).toBe(0);
      expect(result.validLinks).toBe(0);
      expect(result.brokenLinks).toHaveLength(0);
    });
  });

  describe('fixBrokenLinks', () => {
    beforeEach(() => {
      // Set up test files with fixable and unfixable links
      const testFiles = [
        'test-content/en/docs/v1/test-file.mdx',
        'test-content/en/docs/v1/getting-started.mdx'
      ];
      
      mockGlob.setResults(testFiles);
      
      mockFs.files.set('test-content/en/docs/v1/test-file.mdx', `
# Test File

[Getting Started](getting-started.md)
[Broken Link](non-existent.mdx)
      `);
      
      mockFs.files.set('test-content/en/docs/v1/getting-started.mdx', '# Getting Started\n\nContent here.');
    });

    it('should fix broken links in dry run mode', async () => {
      const result = await auditor.fixBrokenLinks('en', 'v1', true);
      
      expect(result.backupCreated).toBe(false);
      expect(result.totalFixed).toBe(1); // getting-started.md -> getting-started.mdx
      expect(result.fixedLinks).toHaveLength(1);
      expect(result.strippedLinks).toHaveLength(1); // non-existent.mdx
      expect(result.errors).toHaveLength(0);
    });

    it('should actually fix links when not in dry run mode', async () => {
      const result = await auditor.fixBrokenLinks('en', 'v1', false);
      
      expect(result.backupCreated).toBe(true);
      expect(result.totalFixed).toBe(1);
      
      // Check that the file was actually modified
      const modifiedContent = mockFs.files.get('test-content/en/docs/v1/test-file.mdx');
      expect(modifiedContent).toContain('[Getting Started](en/v1/getting-started.mdx)');
      expect(modifiedContent).toContain('Broken Link'); // Text preserved
      expect(modifiedContent).not.toContain('[Broken Link](non-existent.mdx)'); // Link stripped
    });

    it('should handle files with no broken links', async () => {
      mockFs.files.set('test-content/en/docs/v1/clean-file.mdx', `
# Clean File

[Getting Started](getting-started.mdx)
      `);
      
      mockGlob.setResults(['test-content/en/docs/v1/clean-file.mdx', 'test-content/en/docs/v1/getting-started.mdx']);
      
      const result = await auditor.fixBrokenLinks('en', 'v1', false);
      
      expect(result.totalFixed).toBe(0);
      expect(result.fixedLinks).toHaveLength(0);
      expect(result.strippedLinks).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed markdown links gracefully', async () => {
      mockFs.files.set('test-content/en/docs/v1/malformed.mdx', `
# Malformed Links

[Incomplete link](
[Missing closing bracket(test.mdx)
[Normal link](test.mdx)
      `);
      
      mockGlob.setResults(['test-content/en/docs/v1/malformed.mdx']);
      
      const result = await auditor.auditAllLinks('en', 'v1');
      
      // Should only find the properly formatted link
      expect(result.totalLinks).toBe(1);
    });

    it('should handle empty files', async () => {
      mockFs.files.set('test-content/en/docs/v1/empty.mdx', '');
      mockGlob.setResults(['test-content/en/docs/v1/empty.mdx']);
      
      const result = await auditor.auditAllLinks('en', 'v1');
      
      expect(result.processedFiles).toBe(1);
      expect(result.totalLinks).toBe(0);
    });

    it('should handle files with only external links', async () => {
      mockFs.files.set('test-content/en/docs/v1/external-only.mdx', `
# External Links Only

[Google](https://google.com)
[GitHub](https://github.com)
      `);
      
      mockGlob.setResults(['test-content/en/docs/v1/external-only.mdx']);
      
      const result = await auditor.auditAllLinks('en', 'v1');
      
      expect(result.totalLinks).toBe(0); // External links are not counted
    });

    it('should calculate similarity correctly', async () => {
      // Test the private calculateSimilarity method indirectly through findPlausibleTarget
      const testFiles = [
        'test-content/en/docs/v1/getting-started.mdx',
        'test-content/en/docs/v1/getting-started-guide.mdx'
      ];
      
      mockGlob.setResults(testFiles);
      
      for (const file of testFiles) {
        mockFs.files.set(file, 'content');
      }
      
      await auditor.auditAllLinks('en', 'v1');
      
      // Should find a similar match
      const result = auditor.findPlausibleTarget('getting-started-old.mdx', 'en', 'v1');
      expect(result).toBeTruthy();
    });
  });

  describe('performance considerations', () => {
    it('should handle large numbers of files efficiently', async () => {
      // Create a large number of mock files
      const testFiles: string[] = [];
      for (let i = 0; i < 100; i++) {
        const filePath = `test-content/en/docs/v1/file-${i}.mdx`;
        testFiles.push(filePath);
        mockFs.files.set(filePath, `# File ${i}\n\n[Link](file-${i + 1}.mdx)`);
      }
      
      mockGlob.setResults(testFiles);
      
      const startTime = Date.now();
      const result = await auditor.auditAllLinks('en', 'v1');
      const endTime = Date.now();
      
      expect(result.processedFiles).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});