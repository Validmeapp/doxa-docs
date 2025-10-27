/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetErrorBoundary } from '../asset-error-boundary';
import { useAssetRetry } from '../use-asset-retry';
import { ImageFallback, AssetLinkFallback, AssetErrorFallback, PlaceholderImage } from '../asset-fallbacks';
import { ImageSkeleton, AssetLinkSkeleton, ProgressiveImageSkeleton } from '../asset-skeleton-loaders';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className?: string }) => <span className={className} data-testid="alert-triangle-icon" />,
  Image: ({ className }: { className?: string }) => <span className={className} data-testid="image-icon" />,
  File: ({ className }: { className?: string }) => <span className={className} data-testid="file-icon" />,
  RefreshCw: ({ className }: { className?: string }) => <span className={className} data-testid="refresh-icon" />,
}));

// Test component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Test component for useAssetRetry hook
function RetryTestComponent({ onRetry }: { onRetry?: (attempt: number) => void }) {
  const { retryCount, isRetrying, canRetry, retry, reset } = useAssetRetry({
    maxRetries: 2,
    retryDelay: 100,
    onRetry,
  });

  return (
    <div>
      <div data-testid="retry-count">{retryCount}</div>
      <div data-testid="is-retrying">{isRetrying.toString()}</div>
      <div data-testid="can-retry">{canRetry.toString()}</div>
      <button onClick={retry} data-testid="retry-button">Retry</button>
      <button onClick={reset} data-testid="reset-button">Reset</button>
    </div>
  );
}

describe('Asset Error Handling', () => {
  describe('AssetErrorBoundary', () => {
    // Suppress console.error for these tests
    const originalError = console.error;
    beforeAll(() => {
      console.error = jest.fn();
    });
    afterAll(() => {
      console.error = originalError;
    });

    it('should render children when no error occurs', () => {
      render(
        <AssetErrorBoundary>
          <ThrowError shouldThrow={false} />
        </AssetErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should render default fallback when error occurs', () => {
      render(
        <AssetErrorBoundary>
          <ThrowError shouldThrow={true} />
        </AssetErrorBoundary>
      );

      expect(screen.getByText('Asset Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong loading this asset')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <AssetErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </AssetErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Asset Error')).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = jest.fn();

      render(
        <AssetErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </AssetErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('useAssetRetry Hook', () => {
    it('should initialize with correct default values', () => {
      render(<RetryTestComponent />);

      expect(screen.getByTestId('retry-count')).toHaveTextContent('0');
      expect(screen.getByTestId('is-retrying')).toHaveTextContent('false');
      expect(screen.getByTestId('can-retry')).toHaveTextContent('true');
    });

    it('should increment retry count when retry is called', async () => {
      render(<RetryTestComponent />);

      fireEvent.click(screen.getByTestId('retry-button'));

      expect(screen.getByTestId('is-retrying')).toHaveTextContent('true');

      await waitFor(() => {
        expect(screen.getByTestId('retry-count')).toHaveTextContent('1');
        expect(screen.getByTestId('is-retrying')).toHaveTextContent('false');
      });
    });

    it('should prevent retry when max retries reached', async () => {
      render(<RetryTestComponent />);

      // First retry
      fireEvent.click(screen.getByTestId('retry-button'));
      await waitFor(() => {
        expect(screen.getByTestId('retry-count')).toHaveTextContent('1');
      });

      // Second retry
      fireEvent.click(screen.getByTestId('retry-button'));
      await waitFor(() => {
        expect(screen.getByTestId('retry-count')).toHaveTextContent('2');
        expect(screen.getByTestId('can-retry')).toHaveTextContent('false');
      });

      // Third retry should not work
      fireEvent.click(screen.getByTestId('retry-button'));
      await waitFor(() => {
        expect(screen.getByTestId('retry-count')).toHaveTextContent('2');
      });
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      render(<RetryTestComponent onRetry={onRetry} />);

      fireEvent.click(screen.getByTestId('retry-button'));

      expect(onRetry).toHaveBeenCalledWith(1);
    });

    it('should reset retry count when reset is called', async () => {
      render(<RetryTestComponent />);

      // Perform a retry
      fireEvent.click(screen.getByTestId('retry-button'));
      await waitFor(() => {
        expect(screen.getByTestId('retry-count')).toHaveTextContent('1');
      });

      // Reset
      fireEvent.click(screen.getByTestId('reset-button'));

      expect(screen.getByTestId('retry-count')).toHaveTextContent('0');
      expect(screen.getByTestId('can-retry')).toHaveTextContent('true');
    });
  });

  describe('Fallback Components', () => {
    describe('ImageFallback', () => {
      it('should render image fallback with alt text', () => {
        render(
          <ImageFallback
            alt="Test image"
            src="test-image.jpg"
          />
        );

        expect(screen.getByText('Image not available')).toBeInTheDocument();
        expect(screen.getByText('Test image')).toBeInTheDocument();
        expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
        expect(screen.getByTestId('image-icon')).toBeInTheDocument();
      });

      it('should show retry button when onRetry is provided', () => {
        const onRetry = jest.fn();

        render(
          <ImageFallback
            alt="Test image"
            src="test-image.jpg"
            onRetry={onRetry}
          />
        );

        const retryButton = screen.getByText('Try again');
        expect(retryButton).toBeInTheDocument();

        fireEvent.click(retryButton);
        expect(onRetry).toHaveBeenCalled();
      });

      it('should show retrying state', () => {
        render(
          <ImageFallback
            alt="Test image"
            src="test-image.jpg"
            onRetry={jest.fn()}
            isRetrying={true}
          />
        );

        expect(screen.getByText('Retrying...')).toBeInTheDocument();
        expect(screen.getByTestId('refresh-icon')).toHaveClass('animate-spin');
      });

      it('should show max retries reached message', () => {
        render(
          <ImageFallback
            alt="Test image"
            src="test-image.jpg"
            onRetry={jest.fn()}
            canRetry={false}
          />
        );

        expect(screen.getByText('Maximum retry attempts reached')).toBeInTheDocument();
        expect(screen.queryByText('Try again')).not.toBeInTheDocument();
      });

      it('should display error message when provided', () => {
        render(
          <ImageFallback
            alt="Test image"
            src="test-image.jpg"
            error="Network error occurred"
          />
        );

        expect(screen.getByText('Network error occurred')).toBeInTheDocument();
      });
    });

    describe('AssetLinkFallback', () => {
      it('should render asset link fallback', () => {
        render(
          <AssetLinkFallback src="test-file.pdf">
            Test File
          </AssetLinkFallback>
        );

        expect(screen.getByText('Test File')).toBeInTheDocument();
        expect(screen.getByText('(unavailable)')).toBeInTheDocument();
        expect(screen.getByTestId('file-icon')).toBeInTheDocument();
      });

      it('should use filename when no children provided', () => {
        render(
          <AssetLinkFallback src="path/to/test-file.pdf" />
        );

        expect(screen.getByText('test-file.pdf')).toBeInTheDocument();
      });

      it('should show retry functionality', () => {
        const onRetry = jest.fn();

        render(
          <AssetLinkFallback
            src="test-file.pdf"
            onRetry={onRetry}
          >
            Test File
          </AssetLinkFallback>
        );

        const retryButton = screen.getByText('retry');
        fireEvent.click(retryButton);
        expect(onRetry).toHaveBeenCalled();
      });
    });

    describe('AssetErrorFallback', () => {
      it('should render generic error fallback', () => {
        render(
          <AssetErrorFallback
            message="Custom error message"
            onRetry={jest.fn()}
          />
        );

        expect(screen.getByText('Custom error message')).toBeInTheDocument();
        expect(screen.getByText('Try again')).toBeInTheDocument();
        expect(screen.getByTestId('file-icon')).toBeInTheDocument();
      });

      it('should render different icons for different types', () => {
        const { rerender } = render(
          <AssetErrorFallback type="image" />
        );

        expect(screen.getByTestId('image-icon')).toBeInTheDocument();

        rerender(<AssetErrorFallback type="file" />);
        expect(screen.getByTestId('file-icon')).toBeInTheDocument();
      });
    });

    describe('PlaceholderImage', () => {
      it('should render placeholder image', () => {
        render(
          <PlaceholderImage
            alt="Placeholder for missing image"
            width={300}
            height={200}
          />
        );

        expect(screen.getByText('Image placeholder')).toBeInTheDocument();
        expect(screen.getByText('Placeholder for missing image')).toBeInTheDocument();
        expect(screen.getByTestId('image-icon')).toBeInTheDocument();
      });

      it('should use aspect ratio when dimensions not provided', () => {
        render(
          <PlaceholderImage
            alt="Placeholder"
            aspectRatio="4/3"
          />
        );

        const placeholder = screen.getByRole('img');
        expect(placeholder).toHaveStyle({ aspectRatio: '4/3' });
      });
    });
  });

  describe('Skeleton Loaders', () => {
    describe('ImageSkeleton', () => {
      it('should render image skeleton with loading message', () => {
        render(<ImageSkeleton />);

        expect(screen.getByText('Loading image...')).toBeInTheDocument();
        expect(screen.getByLabelText('Loading image...')).toBeInTheDocument();
      });

      it('should apply custom className', () => {
        render(<ImageSkeleton className="custom-class" />);

        const skeleton = screen.getByLabelText('Loading image...');
        expect(skeleton).toHaveClass('custom-class');
      });
    });

    describe('AssetLinkSkeleton', () => {
      it('should render asset link skeleton', () => {
        const { container } = render(<AssetLinkSkeleton />);

        const skeleton = container.firstChild;
        expect(skeleton).toHaveClass('animate-pulse');
      });
    });

    describe('ProgressiveImageSkeleton', () => {
      it('should render different messages for different stages', () => {
        const { rerender } = render(
          <ProgressiveImageSkeleton stage="loading" />
        );

        expect(screen.getByText('Loading image...')).toBeInTheDocument();

        rerender(<ProgressiveImageSkeleton stage="processing" />);
        expect(screen.getByText('Processing image...')).toBeInTheDocument();

        rerender(<ProgressiveImageSkeleton stage="optimizing" />);
        expect(screen.getByText('Optimizing image...')).toBeInTheDocument();
      });

      it('should show progress bar', () => {
        render(<ProgressiveImageSkeleton />);

        const progressBar = screen.getByRole('img').querySelector('[style*="width: 60%"]');
        expect(progressBar).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for fallback components', () => {
      render(
        <ImageFallback
          alt="Test image"
          src="test.jpg"
        />
      );

      const fallback = screen.getByLabelText('Failed to load image: Test image');
      expect(fallback).toHaveAttribute('role', 'img');
    });

    it('should have proper ARIA labels for skeleton loaders', () => {
      render(<ImageSkeleton />);

      const skeleton = screen.getByLabelText('Loading image...');
      expect(skeleton).toHaveAttribute('role', 'img');
    });

    it('should have proper ARIA labels for placeholder images', () => {
      render(<PlaceholderImage alt="Test placeholder" />);

      const placeholder = screen.getByLabelText('Test placeholder');
      expect(placeholder).toHaveAttribute('role', 'img');
    });

    it('should have keyboard accessible retry buttons', () => {
      render(
        <ImageFallback
          alt="Test image"
          src="test.jpg"
          onRetry={jest.fn()}
        />
      );

      const retryButton = screen.getByText('Try again');
      expect(retryButton).toHaveClass('focus:outline-none', 'focus:ring-2');
    });
  });
});