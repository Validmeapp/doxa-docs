/**
 * Unit tests for ImageOptimizer class
 */

import { ImageOptimizer } from '../image-optimizer';
import { ProcessedAsset, AssetType } from '../asset-processor';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  }
}));

// Mock sharp
jest.mock('sharp');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockSharp = sharp as jest.MockedFunction<typeof sharp>;

describe('ImageOptimizer', () => {
  let optimizer: ImageOptimizer;
  let mockSharpInstance: any;
  let testImageBuffer: Buffer;
  let testAsset: ProcessedAsset;

  beforeEach(() => {
    optimizer = new ImageOptimizer(85);
    
    // Create a mock image buffer
    testImageBuffer = Buffer.from('fake-image-data');
    
    // Create mock Sharp instance
    mockSharpInstance = {
      metadata: jest.fn(),
      resize: jest.fn(),
      jpeg: jest.fn(),
      png: jest.fn(),
      webp: jest.fn(),
      avif: jest.fn(),
      toBuffer: jest.fn(),
    };

    // Chain methods return the instance for fluent API
    mockSharpInstance.resize.mockReturnValue(mockSharpInstance);
    mockSharpInstance.jpeg.mockReturnValue(mockSharpInstance);
    mockSharpInstance.png.mockReturnValue(mockSharpInstance);
    mockSharpInstance.webp.mockReturnValue(mockSharpInstance);
    mockSharpInstance.avif.mockReturnValue(mockSharpInstance);

    mockSharp.mockReturnValue(mockSharpInstance);
    mockFs.readFile.mockResolvedValue(testImageBuffer);

    // Create test asset
    testAsset = {
      sourcePath: '/test/image.jpg',
      relativePath: 'en/v1/assets/images/image.jpg',
      locale: 'en',
      version: 'v1',
      type: AssetType.IMAGE,
      referencedBy: [],
      publicPath: '/public/assets/en/v1/images/image.abc123.jpg',
      hashedFilename: 'image.abc123.jpg',
      contentHash: 'abc123',
      fileSize: 1024,
      mimeType: 'image/jpeg'
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default quality', () => {
      const defaultOptimizer = new ImageOptimizer();
      expect(defaultOptimizer).toBeInstanceOf(ImageOptimizer);
    });

    it('should create instance with custom quality', () => {
      const customOptimizer = new ImageOptimizer(90);
      expect(customOptimizer).toBeInstanceOf(ImageOptimizer);
    });
  });

  describe('optimizeImage', () => {
    beforeEach(() => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('optimized-image'));
    });

    it('should optimize JPEG image with default settings', async () => {
      const result = await optimizer.optimizeImage('/test/image.jpg');

      expect(mockFs.readFile).toHaveBeenCalledWith('/test/image.jpg');
      expect(mockSharp).toHaveBeenCalledWith(testImageBuffer);
      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 85,
        progressive: true,
        mozjpeg: true
      });
      expect(result).toEqual(Buffer.from('optimized-image'));
    });

    it('should optimize PNG image with custom quality', async () => {
      const result = await optimizer.optimizeImage('/test/image.png', { quality: 90 });

      expect(mockSharpInstance.png).toHaveBeenCalledWith({
        quality: 90,
        compressionLevel: 9,
        adaptiveFiltering: true
      });
      expect(result).toEqual(Buffer.from('optimized-image'));
    });

    it('should resize image when dimensions are specified', async () => {
      await optimizer.optimizeImage('/test/image.jpg', { width: 800, height: 600 });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(800, 600, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    });

    it('should handle WebP format', async () => {
      await optimizer.optimizeImage('/test/image.webp', { format: 'webp', quality: 80 });

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 80,
        effort: 4
      });
    });

    it('should handle AVIF format', async () => {
      await optimizer.optimizeImage('/test/image.avif', { format: 'avif', quality: 75 });

      expect(mockSharpInstance.avif).toHaveBeenCalledWith({
        quality: 75,
        effort: 4
      });
    });

    it('should return original buffer for unsupported formats', async () => {
      const result = await optimizer.optimizeImage('/test/image.svg');

      expect(result).toEqual(testImageBuffer);
      expect(mockSharpInstance.toBuffer).not.toHaveBeenCalled();
    });

    it('should throw error when optimization fails', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Sharp error'));

      await expect(optimizer.optimizeImage('/test/image.jpg')).rejects.toThrow(
        'Failed to optimize image /test/image.jpg: Sharp error'
      );
    });

    it('should throw error when file reading fails', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(optimizer.optimizeImage('/test/nonexistent.jpg')).rejects.toThrow(
        'Failed to optimize image /test/nonexistent.jpg: File not found'
      );
    });
  });

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg'
      });

      const dimensions = await optimizer.getImageDimensions('/test/image.jpg');

      expect(dimensions).toEqual({ width: 1920, height: 1080 });
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/image.jpg');
      expect(mockSharp).toHaveBeenCalledWith(testImageBuffer);
      expect(mockSharpInstance.metadata).toHaveBeenCalled();
    });

    it('should throw error when dimensions cannot be determined', async () => {
      mockSharpInstance.metadata.mockResolvedValue({
        format: 'jpeg'
        // width and height are undefined
      });

      await expect(optimizer.getImageDimensions('/test/image.jpg')).rejects.toThrow(
        'Failed to get image dimensions for /test/image.jpg: Unable to determine image dimensions'
      );
    });

    it('should throw error when metadata reading fails', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Metadata error'));

      await expect(optimizer.getImageDimensions('/test/image.jpg')).rejects.toThrow(
        'Failed to get image dimensions for /test/image.jpg: Metadata error'
      );
    });
  });

  describe('generateResponsiveVariants', () => {
    beforeEach(() => {
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg'
      });
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('optimized-variant'));
    });

    it('should generate @1x variant by default', async () => {
      const variants = await optimizer.generateResponsiveVariants(testAsset);

      expect(variants).toHaveLength(2); // @1x and @2x
      expect(variants[0].variant).toBe('@1x');
      expect(variants[0].dimensions).toEqual({ width: 1920, height: 1080 });
    });

    it('should generate @2x variant when source is large enough', async () => {
      const variants = await optimizer.generateResponsiveVariants(testAsset);

      expect(variants).toHaveLength(2);
      expect(variants[1].variant).toBe('@2x');
      expect(variants[1].dimensions).toEqual({ width: 3840, height: 2160 });
    });

    it('should not generate @2x variant when generateRetina is false', async () => {
      const variants = await optimizer.generateResponsiveVariants(testAsset, {
        generateRetina: false
      });

      expect(variants).toHaveLength(1);
      expect(variants[0].variant).toBe('@1x');
    });

    it('should generate custom size variants', async () => {
      const variants = await optimizer.generateResponsiveVariants(testAsset, {
        sizes: [800, 400]
      });

      expect(variants).toHaveLength(4); // @1x, @2x, @800w, @400w
      expect(variants[2].variant).toBe('@800w');
      expect(variants[2].dimensions).toEqual({ width: 800, height: 450 }); // Maintains aspect ratio
      expect(variants[3].variant).toBe('@400w');
      expect(variants[3].dimensions).toEqual({ width: 400, height: 225 });
    });

    it('should skip custom sizes larger than original', async () => {
      const variants = await optimizer.generateResponsiveVariants(testAsset, {
        sizes: [2000, 800] // 2000 is larger than original 1920
      });

      expect(variants).toHaveLength(3); // @1x, @2x, @800w (2000 is skipped)
      expect(variants.find(v => v.variant === '@2000w')).toBeUndefined();
    });

    it('should throw error for non-image assets', async () => {
      const binaryAsset = { ...testAsset, type: AssetType.BINARY };

      await expect(optimizer.generateResponsiveVariants(binaryAsset)).rejects.toThrow(
        'Asset is not an image'
      );
    });

    it('should throw error when metadata cannot be read', async () => {
      mockSharpInstance.metadata.mockRejectedValue(new Error('Metadata error'));

      await expect(optimizer.generateResponsiveVariants(testAsset)).rejects.toThrow(
        'Failed to generate responsive variants for /test/image.jpg: Metadata error'
      );
    });
  });

  describe('convertToModernFormats', () => {
    beforeEach(() => {
      mockSharpInstance.metadata.mockResolvedValue({
        width: 1920,
        height: 1080,
        format: 'jpeg'
      });
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('converted-image'));
    });

    it('should generate WebP and AVIF variants by default', async () => {
      const variants = await optimizer.convertToModernFormats(testAsset);

      expect(variants).toHaveLength(2);
      expect(variants[0].variant).toBe('webp');
      expect(variants[1].variant).toBe('avif');
      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 85,
        effort: 4
      });
      expect(mockSharpInstance.avif).toHaveBeenCalledWith({
        quality: 85,
        effort: 4
      });
    });

    it('should skip WebP when disabled', async () => {
      const variants = await optimizer.convertToModernFormats(testAsset, {
        webp: false
      });

      expect(variants).toHaveLength(1);
      expect(variants[0].variant).toBe('avif');
      expect(mockSharpInstance.webp).not.toHaveBeenCalled();
    });

    it('should skip AVIF when disabled', async () => {
      const variants = await optimizer.convertToModernFormats(testAsset, {
        avif: false
      });

      expect(variants).toHaveLength(1);
      expect(variants[0].variant).toBe('webp');
      expect(mockSharpInstance.avif).not.toHaveBeenCalled();
    });

    it('should use custom quality settings', async () => {
      await optimizer.convertToModernFormats(testAsset, {
        webp: { quality: 90, effort: 6 },
        avif: { quality: 80, effort: 8 }
      });

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 90,
        effort: 6
      });
      expect(mockSharpInstance.avif).toHaveBeenCalledWith({
        quality: 80,
        effort: 8
      });
    });

    it('should skip SVG files', async () => {
      const svgAsset = { ...testAsset, mimeType: 'image/svg+xml' };
      const variants = await optimizer.convertToModernFormats(svgAsset);

      expect(variants).toHaveLength(0);
      expect(mockSharpInstance.webp).not.toHaveBeenCalled();
      expect(mockSharpInstance.avif).not.toHaveBeenCalled();
    });

    it('should handle AVIF conversion failure gracefully', async () => {
      mockSharpInstance.avif.mockImplementation(() => {
        throw new Error('AVIF not supported');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const variants = await optimizer.convertToModernFormats(testAsset);

      expect(variants).toHaveLength(1); // Only WebP
      expect(variants[0].variant).toBe('webp');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('AVIF conversion failed')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error for non-image assets', async () => {
      const binaryAsset = { ...testAsset, type: AssetType.BINARY };

      await expect(optimizer.convertToModernFormats(binaryAsset)).rejects.toThrow(
        'Asset is not an image'
      );
    });
  });

  describe('isFormatSupported', () => {
    it('should return true for supported formats', async () => {
      mockSharpInstance.toBuffer.mockResolvedValue(Buffer.alloc(0));

      expect(await optimizer.isFormatSupported('webp')).toBe(true);
      expect(await optimizer.isFormatSupported('jpeg')).toBe(true);
      expect(await optimizer.isFormatSupported('png')).toBe(true);
    });

    it('should return false for unsupported formats', async () => {
      expect(await optimizer.isFormatSupported('unknown')).toBe(false);
    });

    it('should handle Sharp errors gracefully', async () => {
      mockSharpInstance.toBuffer.mockRejectedValue(new Error('Format not supported'));

      expect(await optimizer.isFormatSupported('avif')).toBe(false);
    });
  });
});