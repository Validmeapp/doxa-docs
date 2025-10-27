/**
 * Integration tests for asset context resolution in components
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { DocImage, clearManifestCache as clearImageManifestCache } from '../doc-image';
import { DocAssetLink, clearManifestCache as clearLinkManifestCache } from '../doc-asset-link';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

// Mock fetch for asset manifest
const mockManifest = {
  version: '1.0.0',
  generatedAt: '2023-01-01T00:00:00.000Z',
  locales: ['en', 'es'],
  versions: ['v1', 'v2'],
  assets: {
    'en/v1/assets/images/test.png': {
      publicPath: '/public/assets/en/v1/images/test.abc123.png',
      hashedFilename: 'test.abc123.png',
      contentHash: 'abc123',
      originalPath: 'en/v1/assets/images/test.png',
      fileSize: 1024,
      mimeType: 'image/png',
      locale: 'en',
      version: 'v1',
      dimensions: { width: 800, height: 600 },
      derivatives: {},
      metadata: {
        lastModified: '2023-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: true,
        securityScanned: true
      }
    },
    'en/v2/assets/images/test.png': {
      publicPath: '/public/assets/en/v2/images/test.def456.png',
      hashedFilename: 'test.def456.png',
      contentHash: 'def456',
      originalPath: 'en/v2/assets/images/test.png',
      fileSize: 2048,
      mimeType: 'image/png',
      locale: 'en',
      version: 'v2',
      dimensions: { width: 1200, height: 900 },
      derivatives: {},
      metadata: {
        lastModified: '2023-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: true,
        securityScanned: true
      }
    },
    'es/v1/assets/images/prueba.png': {
      publicPath: '/public/assets/es/v1/images/prueba.ghi789.png',
      hashedFilename: 'prueba.ghi789.png',
      contentHash: 'ghi789',
      originalPath: 'es/v1/assets/images/prueba.png',
      fileSize: 1536,
      mimeType: 'image/png',
      locale: 'es',
      version: 'v1',
      dimensions: { width: 600, height: 400 },
      derivatives: {},
      metadata: {
        lastModified: '2023-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: true,
        securityScanned: true
      }
    },
    'en/v1/assets/files/document.pdf': {
      publicPath: '/public/assets/en/v1/files/document.jkl012.pdf',
      hashedFilename: 'document.jkl012.pdf',
      contentHash: 'jkl012',
      originalPath: 'en/v1/assets/files/document.pdf',
      fileSize: 5120,
      mimeType: 'application/pdf',
      locale: 'en',
      version: 'v1',
      derivatives: {},
      metadata: {
        lastModified: '2023-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: false,
        securityScanned: true
      }
    }
  }
};

describe('Asset Context Integration', () => {
  beforeEach(() => {
    // Clear manifest caches
    clearImageManifestCache();
    clearLinkManifestCache();
    
    // Mock fetch to return our test manifest
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DocImage Context Resolution', () => {
    it('should resolve image with exact context match', async () => {
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        expect(img).toHaveAttribute('src', '/public/assets/en/v1/images/test.abc123.png');
      });
    });

    it('should use version fallback when asset not in current version', async () => {
      mockUsePathname.mockReturnValue('/en/docs/v3/getting-started'); // v3 doesn't exist
      
      render(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        // Should fallback to v1 or v2
        expect(img.getAttribute('src')).toMatch(/\/public\/assets\/en\/v[12]\/images\/test\./);
      });
    });

    it('should use locale fallback when asset not in current locale', async () => {
      mockUsePathname.mockReturnValue('/es/docs/v1/getting-started');
      
      render(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        // Should fallback to English version
        expect(img).toHaveAttribute('src', '/public/assets/en/v1/images/test.abc123.png');
      });
    });

    it('should use direct path when asset not found in manifest', async () => {
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocImage src="images/nonexistent.png" alt="Missing image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Missing image');
        expect(img).toHaveAttribute('src', '/public/assets/en/v1/images/nonexistent.png');
      });
    });

    it('should handle different versions correctly', async () => {
      mockUsePathname.mockReturnValue('/en/docs/v2/advanced');
      
      render(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        expect(img).toHaveAttribute('src', '/public/assets/en/v2/images/test.def456.png');
      });
    });

    it('should show loading skeleton initially', () => {
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocImage src="images/test.png" alt="Test image" />);
      
      expect(screen.getByLabelText('Loading image...')).toBeInTheDocument();
    });
  });

  describe('DocAssetLink Context Resolution', () => {
    it('should resolve asset link with exact context match', async () => {
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocAssetLink src="files/document.pdf">Download PDF</DocAssetLink>);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/public/assets/en/v1/files/document.jkl012.pdf');
        expect(link).toHaveAttribute('download', 'document.jkl012.pdf');
      });
    });

    it('should display file metadata when available', async () => {
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocAssetLink src="files/document.pdf" showMetadata={true}>Download PDF</DocAssetLink>);
      
      await waitFor(() => {
        expect(screen.getByText(/PDF Document/)).toBeInTheDocument();
        expect(screen.getByText(/5 KB/)).toBeInTheDocument(); // Changed from 5.0 KB to 5 KB
      });
    });

    it('should use fallback when asset not found in current context', async () => {
      mockUsePathname.mockReturnValue('/es/docs/v1/getting-started');
      
      render(<DocAssetLink src="files/document.pdf">Download PDF</DocAssetLink>);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        // Should fallback to English version
        expect(link).toHaveAttribute('href', '/public/assets/en/v1/files/document.jkl012.pdf');
      });
    });

    it('should use direct path when asset not found in manifest', async () => {
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocAssetLink src="files/missing.pdf">Download Missing</DocAssetLink>);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/public/assets/en/v1/files/missing.pdf');
      });
    });

    it('should show loading skeleton initially', () => {
      // Mock fetch to be slow to ensure we can catch the loading state
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockManifest),
        }), 100))
      );
      
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocAssetLink src="files/document.pdf">Download PDF</DocAssetLink>);
      
      // Check for loading skeleton elements
      const skeletonElements = screen.getAllByRole('generic');
      expect(skeletonElements.some(el => el.classList.contains('animate-pulse'))).toBe(true);
    });

    it('should handle different locales correctly', async () => {
      mockUsePathname.mockReturnValue('/es/docs/v1/getting-started');
      
      render(<DocAssetLink src="images/prueba.png">Ver imagen</DocAssetLink>);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/public/assets/es/v1/images/prueba.ghi789.png');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle manifest fetch failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        // Should fallback to original src
        expect(img).toHaveAttribute('src', 'images/test.png');
      });
    });

    it('should handle invalid manifest response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      
      render(<DocAssetLink src="files/document.pdf">Download</DocAssetLink>);
      
      await waitFor(() => {
        const link = screen.getByRole('link');
        // Should fallback to original src
        expect(link).toHaveAttribute('href', 'files/document.pdf');
      });
    });
  });

  describe('Context Isolation', () => {
    it('should maintain separate contexts for different pages', async () => {
      // First render with English context
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      const { rerender } = render(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        expect(img).toHaveAttribute('src', '/public/assets/en/v1/images/test.abc123.png');
      });
      
      // Re-render with Spanish context
      mockUsePathname.mockReturnValue('/es/docs/v1/guia');
      rerender(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        // Should fallback to English since test.png doesn't exist in Spanish
        expect(img).toHaveAttribute('src', '/public/assets/en/v1/images/test.abc123.png');
      });
    });

    it('should handle version changes correctly', async () => {
      // First render with v1
      mockUsePathname.mockReturnValue('/en/docs/v1/getting-started');
      const { rerender } = render(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        expect(img).toHaveAttribute('src', '/public/assets/en/v1/images/test.abc123.png');
      });
      
      // Re-render with v2
      mockUsePathname.mockReturnValue('/en/docs/v2/advanced');
      rerender(<DocImage src="images/test.png" alt="Test image" />);
      
      await waitFor(() => {
        const img = screen.getByAltText('Test image');
        expect(img).toHaveAttribute('src', '/public/assets/en/v2/images/test.def456.png');
      });
    });
  });
});