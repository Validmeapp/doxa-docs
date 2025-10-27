/**
 * Asset Processing Engine
 * Handles discovery, validation, and processing of static assets for MDX content
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ImageOptimizer, ResponsiveVariantOptions, ModernFormatOptions } from './image-optimizer';

// Asset type definitions
export enum AssetType {
  IMAGE = 'image',
  BINARY = 'binary',
  UNKNOWN = 'unknown'
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface AssetReference {
  sourcePath: string;
  relativePath: string;
  locale: string;
  version: string;
  type: AssetType;
  referencedBy: string[];
}

export interface ProcessedAsset extends AssetReference {
  publicPath: string;
  hashedFilename: string;
  contentHash: string;
  fileSize: number;
  mimeType: string;
  dimensions?: ImageDimensions;
  derivatives?: AssetDerivative[];
}

export interface AssetDerivative {
  variant: string; // '@1x', '@2x', 'webp', 'avif'
  publicPath: string;
  hashedFilename: string;
  fileSize: number;
  dimensions?: ImageDimensions;
}

export interface AssetManifest {
  version: string;
  generatedAt: string;
  assets: Record<string, ManifestEntry>;
  locales: string[];
  versions: string[];
}

export interface ManifestEntry {
  publicPath: string;
  hashedFilename: string;
  contentHash: string;
  originalPath: string;
  fileSize: number;
  mimeType: string;
  locale: string;
  version: string;
  dimensions?: ImageDimensions;
  derivatives?: Record<string, AssetDerivative>;
  metadata: AssetMetadata;
}

export interface AssetMetadata {
  lastModified: string;
  referencedBy: string[];
  optimized: boolean;
  securityScanned: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedPath?: string;
}

// Configuration constants
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif',
  'image/gif', 'image/svg+xml'
];

export const ALLOWED_BINARY_TYPES = [
  'application/pdf', 'application/zip', 'application/json',
  'text/plain', 'text/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_DIMENSIONS = { width: 4000, height: 4000 };

/**
 * Core Asset Processing Engine
 */
export class AssetProcessor {
  private contentDir: string;
  private publicDir: string;
  private manifestPath: string;
  private imageOptimizer: ImageOptimizer;

  constructor(contentDir: string = 'content', publicDir: string = 'public/assets') {
    this.contentDir = contentDir;
    this.publicDir = publicDir;
    this.manifestPath = path.join(publicDir, 'assets-manifest.json');
    this.imageOptimizer = new ImageOptimizer();
  }

  /**
   * Discover all assets in content directories
   */
  async discoverAssets(contentDir?: string): Promise<AssetReference[]> {
    const searchDir = contentDir || this.contentDir;
    const assets: AssetReference[] = [];

    try {
      const locales = await this.getDirectories(searchDir);
      
      for (const locale of locales) {
        const localePath = path.join(searchDir, locale);
        const versions = await this.getDirectories(localePath);
        
        for (const version of versions) {
          const versionPath = path.join(localePath, version);
          const assetPath = path.join(versionPath, 'assets');
          
          // Check if assets directory exists
          if (await this.directoryExists(assetPath)) {
            const discoveredAssets = await this.scanAssetsDirectory(assetPath, locale, version);
            assets.push(...discoveredAssets);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to discover assets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return assets;
  }

  /**
   * Process a single asset
   */
  async processAsset(asset: AssetReference, options?: {
    generateResponsiveVariants?: boolean;
    generateModernFormats?: boolean;
    responsiveOptions?: ResponsiveVariantOptions;
    modernFormatOptions?: ModernFormatOptions;
  }): Promise<ProcessedAsset> {
    try {
      // Read file stats and content
      const stats = await fs.stat(asset.sourcePath);
      const content = await fs.readFile(asset.sourcePath);
      
      // Generate content hash
      const contentHash = this.generateContentHash(content);
      
      // Get file extension
      const ext = path.extname(asset.sourcePath);
      const baseName = path.basename(asset.sourcePath, ext);
      
      // Create hashed filename
      const hashedFilename = `${baseName}.${contentHash.substring(0, 8)}${ext}`;
      
      // Generate public path
      const publicPath = path.join('/', this.publicDir, asset.locale, asset.version, 
        asset.type === AssetType.IMAGE ? 'images' : 'files', hashedFilename);
      
      // Determine MIME type
      const mimeType = this.getMimeType(asset.sourcePath);
      
      const processedAsset: ProcessedAsset = {
        ...asset,
        publicPath: publicPath.replace(/\\/g, '/'), // Normalize path separators
        hashedFilename,
        contentHash,
        fileSize: stats.size,
        mimeType,
        derivatives: []
      };

      // Add image dimensions for image assets
      if (asset.type === AssetType.IMAGE) {
        try {
          processedAsset.dimensions = await this.imageOptimizer.getImageDimensions(asset.sourcePath);
        } catch (error) {
          console.warn(`Failed to get dimensions for ${asset.sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Generate responsive variants if requested
        if (options?.generateResponsiveVariants !== false) {
          try {
            const responsiveVariants = await this.imageOptimizer.generateResponsiveVariants(
              processedAsset, 
              options?.responsiveOptions
            );
            processedAsset.derivatives = [...(processedAsset.derivatives || []), ...responsiveVariants];
          } catch (error) {
            console.warn(`Failed to generate responsive variants for ${asset.sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Generate modern format variants if requested
        if (options?.generateModernFormats !== false) {
          try {
            const modernFormatVariants = await this.imageOptimizer.convertToModernFormats(
              processedAsset,
              options?.modernFormatOptions
            );
            processedAsset.derivatives = [...(processedAsset.derivatives || []), ...modernFormatVariants];
          } catch (error) {
            console.warn(`Failed to generate modern format variants for ${asset.sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      return processedAsset;
    } catch (error) {
      throw new Error(`Failed to process asset ${asset.sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate asset manifest
   */
  generateManifest(assets: ProcessedAsset[]): AssetManifest {
    const manifest: AssetManifest = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      assets: {},
      locales: [],
      versions: []
    };

    // Collect unique locales and versions
    const locales = new Set<string>();
    const versions = new Set<string>();

    for (const asset of assets) {
      locales.add(asset.locale);
      versions.add(asset.version);

      // Create manifest entry
      const entry: ManifestEntry = {
        publicPath: asset.publicPath,
        hashedFilename: asset.hashedFilename,
        contentHash: asset.contentHash,
        originalPath: asset.relativePath,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        locale: asset.locale,
        version: asset.version,
        dimensions: asset.dimensions,
        derivatives: asset.derivatives ? 
          Object.fromEntries(asset.derivatives.map(d => [d.variant, d])) : {},
        metadata: {
          lastModified: new Date().toISOString(),
          referencedBy: asset.referencedBy,
          optimized: false,
          securityScanned: true
        }
      };

      // Use relative path as key for easy lookup
      manifest.assets[asset.relativePath] = entry;
    }

    manifest.locales = Array.from(locales).sort();
    manifest.versions = Array.from(versions).sort();

    return manifest;
  }

  /**
   * Process multiple assets with image optimization
   */
  async processAssetsWithOptimization(
    assets: AssetReference[],
    options?: {
      generateResponsiveVariants?: boolean;
      generateModernFormats?: boolean;
      responsiveOptions?: ResponsiveVariantOptions;
      modernFormatOptions?: ModernFormatOptions;
    }
  ): Promise<ProcessedAsset[]> {
    const processedAssets: ProcessedAsset[] = [];

    for (const asset of assets) {
      const processedAsset = await this.processAsset(asset, options);
      processedAssets.push(processedAsset);
    }

    return processedAssets;
  }

  /**
   * Validate asset file
   */
  validateAsset(filePath: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if file exists
      if (!this.fileExists(filePath)) {
        result.isValid = false;
        result.errors.push(`File does not exist: ${filePath}`);
        return result;
      }

      // Get file stats
      const stats = require('fs').statSync(filePath);
      
      // Check file size
      if (stats.size > MAX_FILE_SIZE) {
        result.isValid = false;
        result.errors.push(`File size exceeds maximum allowed size (${MAX_FILE_SIZE} bytes): ${stats.size} bytes`);
      }

      // Check file type
      const mimeType = this.getMimeType(filePath);
      const isAllowedImage = ALLOWED_IMAGE_TYPES.includes(mimeType);
      const isAllowedBinary = ALLOWED_BINARY_TYPES.includes(mimeType);

      if (!isAllowedImage && !isAllowedBinary) {
        result.isValid = false;
        result.errors.push(`File type not allowed: ${mimeType}`);
      }

      // Sanitize path
      const sanitizedPath = this.sanitizePath(filePath);
      if (sanitizedPath !== filePath) {
        result.warnings.push(`Path was sanitized from ${filePath} to ${sanitizedPath}`);
        result.sanitizedPath = sanitizedPath;
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Private helper methods

  private async getDirectories(dirPath: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      return [];
    }
  }

  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private fileExists(filePath: string): boolean {
    try {
      require('fs').statSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async scanAssetsDirectory(assetPath: string, locale: string, version: string): Promise<AssetReference[]> {
    const assets: AssetReference[] = [];
    
    try {
      const entries = await fs.readdir(assetPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subDirPath = path.join(assetPath, entry.name);
          const subAssets = await this.scanAssetsDirectory(subDirPath, locale, version);
          assets.push(...subAssets);
        } else if (entry.isFile()) {
          const filePath = path.join(assetPath, entry.name);
          const relativePath = path.relative(this.contentDir, filePath);
          
          // Determine asset type
          const mimeType = this.getMimeType(filePath);
          const assetType = this.determineAssetType(mimeType);
          
          if (assetType !== AssetType.UNKNOWN) {
            const asset: AssetReference = {
              sourcePath: filePath,
              relativePath: relativePath.replace(/\\/g, '/'), // Normalize path separators
              locale,
              version,
              type: assetType,
              referencedBy: [] // Will be populated when scanning MDX files
            };
            
            assets.push(asset);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to scan assets directory ${assetPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return assets;
  }

  private generateContentHash(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private determineAssetType(mimeType: string): AssetType {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return AssetType.IMAGE;
    } else if (ALLOWED_BINARY_TYPES.includes(mimeType)) {
      return AssetType.BINARY;
    }
    return AssetType.UNKNOWN;
  }

  private sanitizePath(filePath: string): string {
    // Remove any path traversal attempts
    const normalized = path.normalize(filePath);
    
    // Check for dangerous patterns before sanitization
    if (normalized.includes('..') || normalized.includes('~')) {
      throw new Error(`Potentially dangerous path detected: ${filePath}`);
    }
    
    // Remove any leading path separators or dots
    const sanitized = normalized.replace(/^[\.\/\\]+/, '');
    
    return sanitized;
  }
}