/**
 * Tests for asset path scoping functionality
 */

import { AssetProcessor, AssetType, AssetReference, AssetManifest } from '../asset-processor';
import { promises as fs } from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    stat: jest.fn(),
    mkdir: jest.fn(),
    copyFile: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('AssetProcessor - Path Scoping', () => {
  let processor: AssetProcessor;

  beforeEach(() => {
    processor = new AssetProcessor('content', 'public/assets');
    jest.clearAllMocks();
  });

  describe('generateScopedAssetPath', () => {
    it('should generate correct scoped path for images', () => {
      const result = processor.generateScopedAssetPath('en', 'v1', AssetType.IMAGE, 'test.abc123.png');
      expect(result).toBe('/public/assets/en/v1/images/test.abc123.png');
    });

    it('should generate correct scoped path for binary files', () => {
      const result = processor.generateScopedAssetPath('es', 'v2', AssetType.BINARY, 'document.def456.pdf');
      expect(result).toBe('/public/assets/es/v2/files/document.def456.pdf');
    });

    it('should normalize path separators', () => {
      const result = processor.generateScopedAssetPath('pt', 'v1', AssetType.IMAGE, 'image.ghi789.jpg');
      expect(result).not.toContain('\\');
      expect(result).toBe('/public/assets/pt/v1/images/image.ghi789.jpg');
    });
  });

  describe('resolveAssetUrl', () => {
    const mockManifest: AssetManifest = {
      version: '1.0.0',
      generatedAt: '2023-01-01T00:00:00.000Z',
      locales: ['en', 'es'],
      versions: ['v1'],
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
          derivatives: {},
          metadata: {
            lastModified: '2023-01-01T00:00:00.000Z',
            referencedBy: [],
            optimized: true,
            securityScanned: true
          }
        },
        'es/v1/assets/images/prueba.png': {
          publicPath: '/public/assets/es/v1/images/prueba.def456.png',
          hashedFilename: 'prueba.def456.png',
          contentHash: 'def456',
          originalPath: 'es/v1/assets/images/prueba.png',
          fileSize: 2048,
          mimeType: 'image/png',
          locale: 'es',
          version: 'v1',
          derivatives: {},
          metadata: {
            lastModified: '2023-01-01T00:00:00.000Z',
            referencedBy: [],
            optimized: true,
            securityScanned: true
          }
        }
      }
    };

    it('should resolve asset URL from manifest with exact locale/version match', () => {
      const result = processor.resolveAssetUrl('en/v1/assets/images/test.png', 'en', 'v1', mockManifest);
      expect(result).toBe('/public/assets/en/v1/images/test.abc123.png');
    });

    it('should return null for non-existent asset', () => {
      const result = processor.resolveAssetUrl('en/v1/assets/images/nonexistent.png', 'en', 'v1', mockManifest);
      expect(result).toBeNull();
    });

    it('should find fallback asset with matching locale', () => {
      const result = processor.resolveAssetUrl('es/v1/assets/images/prueba.png', 'es', 'v2', mockManifest);
      expect(result).toBe('/public/assets/es/v1/images/prueba.def456.png');
    });

    it('should generate fallback path when no manifest provided', () => {
      const result = processor.resolveAssetUrl('en/v1/assets/images/test.png', 'en', 'v1');
      expect(result).toBe('/public/assets/en/v1/images/test.png');
    });
  });

  describe('getAvailableLocalesAndVersions', () => {
    beforeEach(() => {
      mockFs.readdir.mockImplementation((dirPath: any, options: any) => {
        const pathStr = dirPath.toString();
        
        if (pathStr.endsWith('content')) {
          return Promise.resolve([
            { name: 'en', isDirectory: () => true },
            { name: 'es', isDirectory: () => true },
            { name: 'pt', isDirectory: () => true },
            { name: 'file.txt', isDirectory: () => false }
          ] as any);
        }
        
        if (pathStr.includes('content/en') || pathStr.includes('content/es')) {
          return Promise.resolve([
            { name: 'v1', isDirectory: () => true },
            { name: 'v2', isDirectory: () => true }
          ] as any);
        }
        
        if (pathStr.includes('content/pt')) {
          return Promise.resolve([
            { name: 'v1', isDirectory: () => true }
          ] as any);
        }
        
        return Promise.resolve([]);
      });
    });

    it('should discover all available locales and versions', async () => {
      const result = await processor.getAvailableLocalesAndVersions();
      
      expect(result.locales).toEqual(['en', 'es', 'pt']);
      expect(result.versions).toEqual(['v1', 'v2']);
    });

    it('should handle errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));
      
      const result = await processor.getAvailableLocalesAndVersions();
      
      expect(result.locales).toEqual([]);
      expect(result.versions).toEqual([]);
    });
  });

  describe('copyAssetsToPublicDirectory', () => {
    const mockAssets = [
      {
        sourcePath: '/content/en/v1/assets/images/test.png',
        relativePath: 'en/v1/assets/images/test.png',
        locale: 'en',
        version: 'v1',
        type: AssetType.IMAGE,
        referencedBy: [],
        publicPath: '/public/assets/en/v1/images/test.abc123.png',
        hashedFilename: 'test.abc123.png',
        contentHash: 'abc123',
        fileSize: 1024,
        mimeType: 'image/png'
      }
    ];

    it('should create directories and copy assets', async () => {
      await processor.copyAssetsToPublicDirectory(mockAssets);
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('public/assets/en/v1/images'),
        { recursive: true }
      );
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        '/content/en/v1/assets/images/test.png',
        expect.stringContaining('public/assets/en/v1/images/test.abc123.png')
      );
    });

    it('should handle copy errors gracefully', async () => {
      mockFs.copyFile.mockRejectedValue(new Error('Copy failed'));
      
      await expect(processor.copyAssetsToPublicDirectory(mockAssets))
        .rejects.toThrow('Failed to copy asset');
    });
  });

  describe('writeManifest', () => {
    const mockManifest: AssetManifest = {
      version: '1.0.0',
      generatedAt: '2023-01-01T00:00:00.000Z',
      locales: ['en'],
      versions: ['v1'],
      assets: {}
    };

    it('should create directory and write manifest file', async () => {
      await processor.writeManifest(mockManifest);
      
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('public/assets'),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('assets-manifest.json'),
        JSON.stringify(mockManifest, null, 2),
        'utf-8'
      );
    });

    it('should handle write errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write failed'));
      
      await expect(processor.writeManifest(mockManifest))
        .rejects.toThrow('Failed to write asset manifest');
    });
  });

  describe('Asset isolation between locales and versions', () => {
    it('should maintain separate paths for different locales', () => {
      const enPath = processor.generateScopedAssetPath('en', 'v1', AssetType.IMAGE, 'test.png');
      const esPath = processor.generateScopedAssetPath('es', 'v1', AssetType.IMAGE, 'test.png');
      
      expect(enPath).toBe('/public/assets/en/v1/images/test.png');
      expect(esPath).toBe('/public/assets/es/v1/images/test.png');
      expect(enPath).not.toBe(esPath);
    });

    it('should maintain separate paths for different versions', () => {
      const v1Path = processor.generateScopedAssetPath('en', 'v1', AssetType.IMAGE, 'test.png');
      const v2Path = processor.generateScopedAssetPath('en', 'v2', AssetType.IMAGE, 'test.png');
      
      expect(v1Path).toBe('/public/assets/en/v1/images/test.png');
      expect(v2Path).toBe('/public/assets/en/v2/images/test.png');
      expect(v1Path).not.toBe(v2Path);
    });

    it('should maintain separate paths for different asset types', () => {
      const imagePath = processor.generateScopedAssetPath('en', 'v1', AssetType.IMAGE, 'test.png');
      const binaryPath = processor.generateScopedAssetPath('en', 'v1', AssetType.BINARY, 'test.pdf');
      
      expect(imagePath).toContain('/images/');
      expect(binaryPath).toContain('/files/');
      expect(imagePath).not.toBe(binaryPath);
    });
  });
});