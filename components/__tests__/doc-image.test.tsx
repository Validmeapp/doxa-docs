/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { DocImage, clearManifestCache } from '../doc-image';
import type { AssetManifest } from '@/lib/asset-processor';

// Mock Next.js components and hooks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('next/image', () => {
  return function MockImage({ src, alt, width, height, fill, onError, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        data-fill={fill}
        onError={onError}
        {...props}
      />
    );
  };
});

// Mock fetch for asset manifest
const mockManifest: AssetManifest = {
  version: '1.0.0',
  generatedAt: '2024-01-01T00:00:00.000Z',
  locales: ['en', 'es'],
  versions: ['v1'],
  assets: {
    'en/v1/assets/images/test-image.png': {
      publicPath: '/assets/en/v1/images/test-image.abc123.png',
      hashedFilename: 'test-image.abc123.png',
      contentHash: 'abc123',
      originalPath: 'en/v1/assets/images/test-image.png',
      fileSize: 12345,
      mimeType: 'image/png',
      locale: 'en',
      version: 'v1',
      dimensions: { width: 800, height: 600 },
      derivatives: {},
      metadata: {
        lastModified: '2024-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: true,
        securityScanned: true,
      },
    },
    'en/v1/assets/images/no-dimensions.jpg': {
      publicPath: '/assets/en/v1/images/no-dimensions.def456.jpg',
      hashedFilename: 'no-dimensions.def456.jpg',
      contentHash: 'def456',
      originalPath: 'en/v1/assets/images/no-dimensions.jpg',
      fileSize: 67890,
      mimeType: 'image/jpeg',
      locale: 'en',
      version: 'v1',
      derivatives: {},
      metadata: {
        lastModified: '2024-01-01T00:00:00.000Z',
        referencedBy: [],
        optimized: true,
        securityScanned: true,
      },
    },
  },
};

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

// Mock global fetch
global.fetch = jest.fn();

describe('DocImage', () => {
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
    it('should render image with resolved path and dimensions', async () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      // Should show loading skeleton initially
      expect(screen.getByLabelText('Loading image...')).toBeInTheDocument();

      // Wait for asset resolution
      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/assets/en/v1/images/test-image.abc123.png');
        expect(img).toHaveAttribute('alt', 'Test image');
        expect(img).toHaveAttribute('width', '800');
        expect(img).toHaveAttribute('height', '600');
      });
    });

    it('should render image without dimensions using fill mode', async () => {
      render(
        <DocImage
          src="images/no-dimensions.jpg"
          alt="Image without dimensions"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/assets/en/v1/images/no-dimensions.def456.jpg');
        expect(img).toHaveAttribute('alt', 'Image without dimensions');
        expect(img).toHaveAttribute('data-fill', 'true');
      });
    });

    it('should use provided width and height over manifest dimensions', async () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
          width={400}
          height={300}
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('width', '400');
        expect(img).toHaveAttribute('height', '300');
      });
    });
  });

  describe('Asset Resolution', () => {
    it('should resolve asset path from manifest', async () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/assets/assets-manifest.json');
      });

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/assets/en/v1/images/test-image.abc123.png');
      });
    });

    it('should handle different locale contexts', async () => {
      mockUsePathname.mockReturnValue('/es/docs/comenzando');

      const spanishManifest = {
        ...mockManifest,
        assets: {
          'es/v1/assets/images/test-image.png': {
            ...mockManifest.assets['en/v1/assets/images/test-image.png'],
            publicPath: '/assets/es/v1/images/test-image.abc123.png',
            locale: 'es',
          },
        },
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(spanishManifest),
      });

      render(
        <DocImage
          src="images/test-image.png"
          alt="Imagen de prueba"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/assets/es/v1/images/test-image.abc123.png');
      });
    });

    it('should fallback to original src when asset not found in manifest', async () => {
      render(
        <DocImage
          src="images/missing-image.png"
          alt="Missing image"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', 'images/missing-image.png');
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when manifest loading fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Image not available')).toBeInTheDocument();
        expect(screen.getByText('Test image')).toBeInTheDocument();
        expect(screen.getByText('Source: images/test-image.png')).toBeInTheDocument();
      });
    });

    it('should show error state when manifest is not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Image not available')).toBeInTheDocument();
      });
    });

    it('should provide retry functionality', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });

      // Mock successful retry
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      });

      fireEvent.click(screen.getByText('Try again'));

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', '/assets/en/v1/images/test-image.abc123.png');
      });
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loader while loading', () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      expect(screen.getByLabelText('Loading image...')).toBeInTheDocument();
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    it('should apply custom className to skeleton', () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
          className="custom-class"
        />
      );

      const skeleton = screen.getByLabelText('Loading image...');
      expect(skeleton).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image description"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('alt', 'Test image description');
      });
    });

    it('should have proper ARIA label for loading state', () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      const skeleton = screen.getByLabelText('Loading image...');
      expect(skeleton).toHaveAttribute('role', 'img');
    });

    it('should have proper ARIA label for error state', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
        />
      );

      await waitFor(() => {
        const errorElement = screen.getByLabelText('Failed to load image: Test image');
        expect(errorElement).toHaveAttribute('role', 'img');
      });
    });
  });

  describe('Props Handling', () => {
    it('should pass through Next.js Image props', async () => {
      render(
        <DocImage
          src="images/test-image.png"
          alt="Test image"
          priority={true}
          sizes="(max-width: 768px) 100vw, 50vw"
          placeholder="blur"
          className="custom-image-class"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveClass('custom-image-class');
        // Note: priority, sizes, and placeholder are handled by Next.js Image internally
      });
    });

    it('should handle custom sizes for fill mode', async () => {
      render(
        <DocImage
          src="images/no-dimensions.jpg"
          alt="Image without dimensions"
          sizes="100vw"
        />
      );

      await waitFor(() => {
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('data-fill', 'true');
      });
    });
  });

  describe('Manifest Caching', () => {
    it('should cache manifest between component instances', async () => {
      render(
        <div>
          <DocImage src="images/test-image.png" alt="Image 1" />
          <DocImage src="images/no-dimensions.jpg" alt="Image 2" />
        </div>
      );

      await waitFor(() => {
        expect(screen.getAllByRole('img')).toHaveLength(2);
      });

      // Should only fetch manifest once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});