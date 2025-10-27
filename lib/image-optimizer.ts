/**
 * Image Optimization Engine
 * Handles image processing, resizing, and format conversion using Sharp
 */

import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import { ProcessedAsset, AssetDerivative, ImageDimensions } from './asset-processor';

export interface OptimizationOptions {
  quality?: number;
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  progressive?: boolean;
  withoutEnlargement?: boolean;
}

export interface ResponsiveVariantOptions {
  generateRetina?: boolean; // Generate @2x variants
  sizes?: number[]; // Custom sizes to generate
  quality?: number;
}

export interface ModernFormatOptions {
  webp?: {
    quality?: number;
    effort?: number;
  } | false;
  avif?: {
    quality?: number;
    effort?: number;
  } | false;
}

/**
 * Image Optimization Engine using Sharp
 */
export class ImageOptimizer {
  private defaultQuality: number = 85;
  private retinaMultiplier: number = 2;

  constructor(defaultQuality: number = 85) {
    this.defaultQuality = defaultQuality;
  }

  /**
   * Generate responsive variants (@1x, @2x) for an image
   */
  async generateResponsiveVariants(
    image: ProcessedAsset,
    options: ResponsiveVariantOptions = {}
  ): Promise<AssetDerivative[]> {
    const derivatives: AssetDerivative[] = [];
    
    if (image.type !== 'image') {
      throw new Error('Asset is not an image');
    }

    try {
      const imageBuffer = await fs.readFile(image.sourcePath);
      const sharpImage = sharp(imageBuffer);
      const metadata = await sharpImage.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      const originalWidth = metadata.width;
      const originalHeight = metadata.height;

      // Generate @1x variant (original size, optimized)
      const optimized1x = await this.optimizeImage(image.sourcePath, {
        quality: options.quality || this.defaultQuality,
        withoutEnlargement: true
      });

      const variant1x = await this.createDerivative(
        image,
        optimized1x,
        '@1x',
        { width: originalWidth, height: originalHeight }
      );
      derivatives.push(variant1x);

      // Generate @2x variant if requested and source is large enough
      if (options.generateRetina !== false) {
        const retinaWidth = originalWidth * this.retinaMultiplier;
        const retinaHeight = originalHeight * this.retinaMultiplier;

        // Only generate @2x if the original is large enough
        if (originalWidth >= retinaWidth / 2 && originalHeight >= retinaHeight / 2) {
          const optimized2x = await this.optimizeImage(image.sourcePath, {
            width: retinaWidth,
            height: retinaHeight,
            quality: options.quality || this.defaultQuality,
            withoutEnlargement: true
          });

          const variant2x = await this.createDerivative(
            image,
            optimized2x,
            '@2x',
            { width: retinaWidth, height: retinaHeight }
          );
          derivatives.push(variant2x);
        }
      }

      // Generate custom sizes if specified
      if (options.sizes && options.sizes.length > 0) {
        for (const size of options.sizes) {
          if (size < originalWidth) {
            const aspectRatio = originalHeight / originalWidth;
            const customHeight = Math.round(size * aspectRatio);

            const optimizedCustom = await this.optimizeImage(image.sourcePath, {
              width: size,
              height: customHeight,
              quality: options.quality || this.defaultQuality,
              withoutEnlargement: true
            });

            const variantCustom = await this.createDerivative(
              image,
              optimizedCustom,
              `@${size}w`,
              { width: size, height: customHeight }
            );
            derivatives.push(variantCustom);
          }
        }
      }

    } catch (error) {
      throw new Error(`Failed to generate responsive variants for ${image.sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return derivatives;
  }

  /**
   * Convert image to modern formats (WebP, AVIF)
   */
  async convertToModernFormats(
    image: ProcessedAsset,
    options: ModernFormatOptions = {}
  ): Promise<AssetDerivative[]> {
    const derivatives: AssetDerivative[] = [];
    
    if (image.type !== 'image') {
      throw new Error('Asset is not an image');
    }

    // Skip SVG files as they don't need format conversion
    if (image.mimeType === 'image/svg+xml') {
      return derivatives;
    }

    try {
      const imageBuffer = await fs.readFile(image.sourcePath);
      const sharpImage = sharp(imageBuffer);
      const metadata = await sharpImage.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      const dimensions = { width: metadata.width, height: metadata.height };

      // Generate WebP variant
      if (options.webp !== false) {
        const webpBuffer = await sharpImage
          .webp({
            quality: options.webp?.quality || this.defaultQuality,
            effort: options.webp?.effort || 4
          })
          .toBuffer();

        const webpDerivative = await this.createDerivative(
          image,
          webpBuffer,
          'webp',
          dimensions,
          '.webp'
        );
        derivatives.push(webpDerivative);
      }

      // Generate AVIF variant
      if (options.avif !== false) {
        try {
          const avifBuffer = await sharpImage
            .avif({
              quality: options.avif?.quality || this.defaultQuality,
              effort: options.avif?.effort || 4
            })
            .toBuffer();

          const avifDerivative = await this.createDerivative(
            image,
            avifBuffer,
            'avif',
            dimensions,
            '.avif'
          );
          derivatives.push(avifDerivative);
        } catch (avifError) {
          // AVIF might not be supported in all Sharp builds, so we'll skip it gracefully
          console.warn(`AVIF conversion failed for ${image.sourcePath}, skipping: ${avifError instanceof Error ? avifError.message : 'Unknown error'}`);
        }
      }

    } catch (error) {
      throw new Error(`Failed to convert to modern formats for ${image.sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return derivatives;
  }

  /**
   * Optimize a single image with specified options
   */
  async optimizeImage(imagePath: string, options: OptimizationOptions = {}): Promise<Buffer> {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      let sharpImage = sharp(imageBuffer);

      // Apply resizing if specified
      if (options.width || options.height) {
        sharpImage = sharpImage.resize(options.width, options.height, {
          withoutEnlargement: options.withoutEnlargement !== false,
          fit: 'inside'
        });
      }

      // Apply format-specific optimizations
      const ext = path.extname(imagePath).toLowerCase();
      
      // For SVG and other unsupported formats, return original buffer
      if (ext === '.svg' || !this.isSupportedImageFormat(ext)) {
        return imageBuffer;
      }
      
      const format = options.format || this.getFormatFromExtension(ext);

      switch (format) {
        case 'jpeg':
          sharpImage = sharpImage.jpeg({
            quality: options.quality || this.defaultQuality,
            progressive: options.progressive !== false,
            mozjpeg: true
          });
          break;

        case 'png':
          sharpImage = sharpImage.png({
            quality: options.quality || this.defaultQuality,
            compressionLevel: 9,
            adaptiveFiltering: true
          });
          break;

        case 'webp':
          sharpImage = sharpImage.webp({
            quality: options.quality || this.defaultQuality,
            effort: 4
          });
          break;

        case 'avif':
          sharpImage = sharpImage.avif({
            quality: options.quality || this.defaultQuality,
            effort: 4
          });
          break;

        default:
          // For other formats, return original buffer
          return imageBuffer;
      }

      return await sharpImage.toBuffer();

    } catch (error) {
      throw new Error(`Failed to optimize image ${imagePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get image dimensions from file
   */
  async getImageDimensions(imagePath: string): Promise<ImageDimensions> {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const metadata = await sharp(imageBuffer).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to determine image dimensions');
      }

      return {
        width: metadata.width,
        height: metadata.height
      };
    } catch (error) {
      throw new Error(`Failed to get image dimensions for ${imagePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if Sharp supports a given image format
   */
  async isFormatSupported(format: string): Promise<boolean> {
    try {
      const testBuffer = Buffer.alloc(1);
      const sharpInstance = sharp(testBuffer);
      
      switch (format.toLowerCase()) {
        case 'webp':
          await sharpInstance.webp().toBuffer();
          return true;
        case 'avif':
          await sharpInstance.avif().toBuffer();
          return true;
        case 'jpeg':
        case 'png':
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // Private helper methods

  private async createDerivative(
    originalAsset: ProcessedAsset,
    buffer: Buffer,
    variant: string,
    dimensions: ImageDimensions,
    newExtension?: string
  ): Promise<AssetDerivative> {
    const ext = newExtension || path.extname(originalAsset.sourcePath);
    const baseName = path.basename(originalAsset.sourcePath, path.extname(originalAsset.sourcePath));
    
    // Create hashed filename for derivative
    const contentHash = require('crypto').createHash('sha256').update(buffer).digest('hex');
    const hashedFilename = `${baseName}.${contentHash.substring(0, 8)}${variant}${ext}`;
    
    // Generate public path
    const publicPath = path.join(
      '/',
      'public/assets',
      originalAsset.locale,
      originalAsset.version,
      'images',
      hashedFilename
    ).replace(/\\/g, '/');

    return {
      variant,
      publicPath,
      hashedFilename,
      fileSize: buffer.length,
      dimensions
    };
  }

  private isSupportedImageFormat(ext: string): boolean {
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
    return supportedFormats.includes(ext.toLowerCase());
  }

  private getFormatFromExtension(ext: string): 'jpeg' | 'png' | 'webp' | 'avif' {
    switch (ext.toLowerCase()) {
      case '.jpg':
      case '.jpeg':
        return 'jpeg';
      case '.png':
        return 'png';
      case '.webp':
        return 'webp';
      case '.avif':
        return 'avif';
      default:
        return 'jpeg'; // Default fallback
    }
  }
}