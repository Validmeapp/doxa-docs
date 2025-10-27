/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { DocAssetLink, clearManifestCache } from '../doc-asset-link';
import type { AssetManifest } from '@/lib/asset-processor';

// Mock Next.js hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Download: ({ className }: { className?: string }) => <span className={className} data-testid="download-icon" />,
  File: ({ className }: { className?: string }) => <span className={className} data-testid="file-icon" />,
  FileText: ({ className }: { className?: string }) => <span className={className} data-testid="filetext-icon" />,
  Archive: ({ className }: { className?: string }) => <span className={className} data-testid="archive-icon" />,
  Image: ({ className }: { className?: string }) => <span className={className} data-testid="image-icon" />,
}));

// Mock fetch for asset manifest
const mockManifest: AssetManifest = {
  version: '1.0.0',
  generatedAt: '2024-01-01T00:00:00.000Z',
  locales: ['en', 'es'],
  versions: ['v1'],
  assets: {
    'en/v1/assets/files/guide.pdf': {
      publicPath: '/assets/en/v1/files/guide.abc123.pdf',
      hashedFilename: 'guide.abc123.pdf',
      contentHash: 'abc123',
      originalPath: 'en/v1/assets/files/guide.pdf',
      fileSize: 1048576, // 1MB
      mimeType: 'application/pdf',
      locale: 'en',
      version: 'v1',
      derivatives: {},
      metadata: {
        lastModified: '2024-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: false,
        securityScanned: true,
      },
    },
    'en/v1/assets/files/data.csv': {
      publicPath: '/assets/en/v1/files/data.def456.csv',
      hashedFilename: 'data.def456.csv',
      contentHash: 'def456',
      originalPath: 'en/v1/assets/files/data.csv',
      fileSize: 2048, // 2KB
      mimeType: 'text/csv',
      locale: 'en',
      version: 'v1',
      derivatives: {},
      metadata: {
        lastModified: '2024-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: false,
        securityScanned: true,
      },
    },
    'en/v1/assets/files/archive.zip': {
      publicPath: '/assets/en/v1/files/archive.ghi789.zip',
      hashedFilename: 'archive.ghi789.zip',
      contentHash: 'ghi789',
      originalPath: 'en/v1/assets/files/archive.zip',
      fileSize: 5242880, // 5MB
      mimeType: 'application/zip',
      locale: 'en',
      version: 'v1',
      derivatives: {},
      metadata: {
        lastModified: '2024-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: false,
        securityScanned: true,
      },
    },
  },
};

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

// Mock global fetch
global.fetch = jest.fn();

describe('DocAssetLink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/en/docs/getting-started');
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });
  });

  afterEach(() => {
    // Clear manifest cache between tests
    clearManifestCache();
    jest.resetModules();
  });

  describe('Basic Rendering', () => {
    it('should render asset link with resolved path and metadata', async () => {
      render(
        <DocAssetLink src="files/guide.pdf">
          User Guide
        </DocAssetLink>
      );

      // Should show loading skeleton initially
      expect(screen.getByText('User Guide')).toBeInTheDocument();

      // Wait for asset resolution
      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/assets/en/v1/files/guide.abc123.pdf');
        expect(link).toHaveAttribute('download', 'guide.abc123.pdf');
        expect(link).toHaveTextContent('User Guide');
        expect(link).toHaveTextContent('PDF Document, 1.0 MB');
      });

      expect(screen.getByTestId('filetext-icon')).toBeInTheDocument();
      expect(screen.getByTestId('download-icon')).toBeInTheDocument();
    });

    it('should render with default link text when no children provided', async () => {
      render(
        <DocAssetLink src="files/guide.pdf" />
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveTextContent('guide.pdf');
      });
    });

    it('should handle different file types with appropriate icons', async () => {
      const { rerender } = render(
        <DocAssetLink src="files/data.csv">CSV Data</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByTestId('filetext-icon')).toBeInTheDocument();
        expect(screen.getByText('CSV Spreadsheet')).toBeInTheDocument();
        expect(screen.getByText('2 KB')).toBeInTheDocument();
      });

      rerender(
        <DocAssetLink src="files/archive.zip">Archive</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByTestId('archive-icon')).toBeInTheDocument();
        expect(screen.getByText('ZIP Archive')).toBeInTheDocument();
        expect(screen.getByText('5 MB')).toBeInTheDocument();
      });
    });
  });

  describe('Asset Resolution', () => {
    it('should resolve asset path from manifest', async () => {
      render(
        <DocAssetLink src="files/guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/assets/assets-manifest.json');
      });

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/assets/en/v1/files/guide.abc123.pdf');
      });
    });

    it('should handle different locale contexts', async () => {
      mockUsePathname.mockReturnValue('/es/docs/comenzando');

      const spanishManifest = {
        ...mockManifest,
        assets: {
          'es/v1/assets/files/guide.pdf': {
            ...mockManifest.assets['en/v1/assets/files/guide.pdf'],
            publicPath: '/assets/es/v1/files/guide.abc123.pdf',
            locale: 'es',
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(spanishManifest),
      });

      render(
        <DocAssetLink src="files/guide.pdf">Guía</DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/assets/es/v1/files/guide.abc123.pdf');
      });
    });

    it('should fallback to original src when asset not found in manifest', async () => {
      render(
        <DocAssetLink src="files/missing-file.pdf">Missing File</DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'files/missing-file.pdf');
        expect(link).toHaveAttribute('download', 'missing-file.pdf');
      });
    });
  });

  describe('Download Behavior', () => {
    it('should set download attribute by default', async () => {
      render(
        <DocAssetLink src="files/guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('download', 'guide.abc123.pdf');
        expect(link).not.toHaveAttribute('target');
        expect(link).not.toHaveAttribute('rel');
      });
    });

    it('should use custom download filename', async () => {
      render(
        <DocAssetLink src="files/guide.pdf" download="custom-guide.pdf">
          Guide
        </DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('download', 'custom-guide.pdf');
      });
    });

    it('should disable download when download=false', async () => {
      render(
        <DocAssetLink src="files/guide.pdf" download={false}>
          Guide
        </DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).not.toHaveAttribute('download');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });

      expect(screen.queryByTestId('download-icon')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('should show metadata by default', async () => {
      render(
        <DocAssetLink src="files/guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByText('PDF Document')).toBeInTheDocument();
        expect(screen.getByText('1 MB')).toBeInTheDocument();
      });
    });

    it('should hide metadata when showMetadata=false', async () => {
      render(
        <DocAssetLink src="files/guide.pdf" showMetadata={false}>
          Guide
        </DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.queryByText('(PDF Document, 1.0 MB)')).not.toBeInTheDocument();
      });
    });

    it('should format file sizes correctly', async () => {
      const { rerender } = render(
        <DocAssetLink src="files/data.csv">Data</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByText('CSV Spreadsheet')).toBeInTheDocument();
        expect(screen.getByText('2 KB')).toBeInTheDocument();
      });

      rerender(
        <DocAssetLink src="files/archive.zip">Archive</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByText('ZIP Archive')).toBeInTheDocument();
        expect(screen.getByText('5 MB')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when manifest loading fails', async () => {
      // Clear cache first to ensure fresh fetch
      clearManifestCache();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <DocAssetLink src="files/missing-guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByText('Guide')).toBeInTheDocument();
        expect(screen.getByText('(unavailable)')).toBeInTheDocument();
        expect(screen.getByTestId('file-icon')).toBeInTheDocument();
      });
    });

    it('should show error state when manifest is not found', async () => {
      // Clear cache first to ensure fresh fetch
      clearManifestCache();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      render(
        <DocAssetLink src="files/missing-guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByText('(unavailable)')).toBeInTheDocument();
      });
    });

    it('should provide retry functionality', async () => {
      // Clear cache first to ensure fresh fetch
      clearManifestCache();
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <DocAssetLink src="files/missing-guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByText('retry')).toBeInTheDocument();
      });

      // Mock successful retry
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      fireEvent.click(screen.getByText('retry'));

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'files/missing-guide.pdf');
      });
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loader while loading', () => {
      render(
        <DocAssetLink src="files/guide.pdf">Guide</DocAssetLink>
      );

      // Should show loading skeleton
      expect(screen.getByText('Guide')).toBeInTheDocument();
    });

    it('should apply custom className to skeleton', () => {
      const { container } = render(
        <DocAssetLink src="files/guide.pdf" className="custom-class">
          Guide
        </DocAssetLink>
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(
        <DocAssetLink src="files/guide.pdf">User Guide</DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('aria-label', 'Download PDF Document (1 MB)');
      });
    });

    it('should have proper ARIA label for non-download links', async () => {
      render(
        <DocAssetLink src="files/guide.pdf" download={false}>
          User Guide
        </DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('aria-label', 'Open PDF Document (1 MB)');
      });
    });

    it('should have proper ARIA label for error state', async () => {
      // Clear cache first to ensure fresh fetch
      clearManifestCache();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <DocAssetLink src="files/missing-guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        const errorElement = screen.getByLabelText('Failed to load asset: files/missing-guide.pdf');
        expect(errorElement).toHaveAttribute('role', 'link');
      });
    });

    it('should be keyboard accessible', async () => {
      render(
        <DocAssetLink src="files/guide.pdf">Guide</DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-primary');
      });
    });
  });

  describe('Props Handling', () => {
    it('should apply custom className', async () => {
      render(
        <DocAssetLink src="files/guide.pdf" className="custom-link-class">
          Guide
        </DocAssetLink>
      );

      await waitFor(() => {
        const link = screen.getByRole('link');
        expect(link).toHaveClass('custom-link-class');
      });
    });

    it('should handle complex children elements', async () => {
      render(
        <DocAssetLink src="files/guide.pdf">
          <span>Download</span> <strong>User Guide</strong>
        </DocAssetLink>
      );

      await waitFor(() => {
        expect(screen.getByText('Download')).toBeInTheDocument();
        expect(screen.getByText('User Guide')).toBeInTheDocument();
      });
    });
  });

  describe('File Type Recognition', () => {
    it('should recognize different MIME types correctly', async () => {
      const testCases = [
        { mimeType: 'application/pdf', expectedType: 'PDF Document', expectedIcon: 'filetext-icon' },
        { mimeType: 'text/csv', expectedType: 'CSV Spreadsheet', expectedIcon: 'filetext-icon' },
        { mimeType: 'application/zip', expectedType: 'ZIP Archive', expectedIcon: 'archive-icon' },
        { mimeType: 'text/plain', expectedType: 'Text File', expectedIcon: 'filetext-icon' },
        { mimeType: 'application/json', expectedType: 'JSON Data', expectedIcon: 'file-icon' },
      ];

      for (const testCase of testCases) {
        // Clear cache for each test case
        clearManifestCache();
        
        const customManifest = {
          ...mockManifest,
          assets: {
            'en/v1/assets/files/test-file': {
              ...mockManifest.assets['en/v1/assets/files/guide.pdf'],
              mimeType: testCase.mimeType,
              publicPath: '/assets/en/v1/files/test-file.hash',
            },
          },
        };

        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(customManifest),
        });

        const { unmount } = render(
          <DocAssetLink src="files/test-file">Test File</DocAssetLink>
        );

        await waitFor(() => {
          expect(screen.getByText(testCase.expectedType)).toBeInTheDocument();
          expect(screen.getByTestId(testCase.expectedIcon)).toBeInTheDocument();
        });

        unmount();
        jest.clearAllMocks();
      }
    });
  });

  describe('Manifest Caching', () => {
    it('should cache manifest between component instances', async () => {
      // Clear cache first to ensure fresh start
      clearManifestCache();
      
      render(
        <div>
          <DocAssetLink src="files/guide.pdf">Guide</DocAssetLink>
          <DocAssetLink src="files/data.csv">Data</DocAssetLink>
        </div>
      );

      await waitFor(() => {
        expect(screen.getAllByRole('link')).toHaveLength(2);
      });

      // Should only fetch manifest once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});