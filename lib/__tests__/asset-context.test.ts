/**
 * Tests for asset context resolution functionality
 */

import {
  getAssetContextFromPathname,
  getVersionFromPathname,
  resolveAssetWithFallback,
  generateDirectAssetPath,
  getAllPossibleContexts,
  assetExistsInContext,
  getAssetAvailability,
  type AssetContext
} from '../asset-context';
import type { AssetManifest } from '../asset-processor';

describe('Asset Context Resolution', () => {
  const mockManifest: AssetManifest = {
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

  describe('getVersionFromPathname', () => {
    it('should extract version from pathname with v1', () => {
      expect(getVersionFromPathname('/en/docs/v1/getting-started')).toBe('v1');
    });

    it('should extract version from pathname with v2', () => {
      expect(getVersionFromPathname('/es/v2/docs/guide')).toBe('v2');
    });

    it('should default to v1 when no version found', () => {
      expect(getVersionFromPathname('/en/docs/getting-started')).toBe('v1');
    });

    it('should handle root paths', () => {
      expect(getVersionFromPathname('/en')).toBe('v1');
    });
  });

  describe('getAssetContextFromPathname', () => {
    it('should extract context from English v1 path', () => {
      const context = getAssetContextFromPathname('/en/docs/v1/getting-started');
      expect(context).toEqual({ locale: 'en', version: 'v1' });
    });

    it('should extract context from Spanish v2 path', () => {
      const context = getAssetContextFromPathname('/es/v2/docs/guide');
      expect(context).toEqual({ locale: 'es', version: 'v2' });
    });

    it('should default to en/v1 for invalid paths', () => {
      const context = getAssetContextFromPathname('/invalid/path');
      expect(context).toEqual({ locale: 'en', version: 'v1' });
    });
  });

  describe('resolveAssetWithFallback', () => {
    it('should resolve exact match', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = resolveAssetWithFallback('images/test.png', context, mockManifest);
      
      expect(result).not.toBeNull();
      expect(result!.publicPath).toBe('/public/assets/en/v1/images/test.abc123.png');
      expect(result!.fallbackUsed).toBe(false);
    });

    it('should use version fallback when asset not found in current version', () => {
      const context: AssetContext = { locale: 'en', version: 'v3' }; // Non-existent version
      const result = resolveAssetWithFallback('images/test.png', context, mockManifest);
      
      expect(result).not.toBeNull();
      expect(result!.fallbackUsed).toBe(true);
      expect(result!.fallbackType).toBe('version');
      expect(result!.publicPath).toMatch(/\/public\/assets\/en\/v[12]\/images\/test\./);
    });

    it('should use locale fallback when asset not found in current locale', () => {
      const context: AssetContext = { locale: 'es', version: 'v1' };
      const result = resolveAssetWithFallback('images/test.png', context, mockManifest);
      
      expect(result).not.toBeNull();
      expect(result!.fallbackUsed).toBe(true);
      expect(result!.fallbackType).toBe('locale');
      expect(result!.publicPath).toBe('/public/assets/en/v1/images/test.abc123.png');
    });

    it('should return null when asset not found anywhere', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = resolveAssetWithFallback('images/nonexistent.png', context, mockManifest);
      
      expect(result).toBeNull();
    });

    it('should handle different asset types', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = resolveAssetWithFallback('files/document.pdf', context, mockManifest);
      
      expect(result).not.toBeNull();
      expect(result!.publicPath).toBe('/public/assets/en/v1/files/document.jkl012.pdf');
      expect(result!.fallbackUsed).toBe(false);
    });
  });

  describe('generateDirectAssetPath', () => {
    it('should generate direct path for images', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = generateDirectAssetPath('images/test.png', context);
      
      expect(result).toBe('/public/assets/en/v1/images/test.png');
    });

    it('should generate direct path for binary files', () => {
      const context: AssetContext = { locale: 'es', version: 'v2' };
      const result = generateDirectAssetPath('files/document.pdf', context);
      
      expect(result).toBe('/public/assets/es/v2/files/document.pdf');
    });

    it('should handle nested paths', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = generateDirectAssetPath('subfolder/images/nested.jpg', context);
      
      expect(result).toBe('/public/assets/en/v1/images/nested.jpg');
    });

    it('should default to files for unknown extensions', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = generateDirectAssetPath('data/unknown.xyz', context);
      
      expect(result).toBe('/public/assets/en/v1/files/unknown.xyz');
    });
  });

  describe('getAllPossibleContexts', () => {
    it('should return all combinations of locales and versions', () => {
      const contexts = getAllPossibleContexts(mockManifest);
      
      expect(contexts).toHaveLength(4); // 2 locales × 2 versions
      expect(contexts).toContainEqual({ locale: 'en', version: 'v1' });
      expect(contexts).toContainEqual({ locale: 'en', version: 'v2' });
      expect(contexts).toContainEqual({ locale: 'es', version: 'v1' });
      expect(contexts).toContainEqual({ locale: 'es', version: 'v2' });
    });
  });

  describe('assetExistsInContext', () => {
    it('should return true for existing asset', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const exists = assetExistsInContext('images/test.png', context, mockManifest);
      
      expect(exists).toBe(true);
    });

    it('should return false for non-existing asset', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const exists = assetExistsInContext('images/nonexistent.png', context, mockManifest);
      
      expect(exists).toBe(false);
    });

    it('should return false for wrong context', () => {
      const context: AssetContext = { locale: 'es', version: 'v2' };
      const exists = assetExistsInContext('images/test.png', context, mockManifest);
      
      expect(exists).toBe(false);
    });
  });

  describe('getAssetAvailability', () => {
    it('should return availability across all contexts', () => {
      const availability = getAssetAvailability('images/test.png', mockManifest);
      
      expect(availability).toHaveLength(4);
      
      // Should be available in en/v1 and en/v2
      const enV1 = availability.find(a => a.context.locale === 'en' && a.context.version === 'v1');
      const enV2 = availability.find(a => a.context.locale === 'en' && a.context.version === 'v2');
      const esV1 = availability.find(a => a.context.locale === 'es' && a.context.version === 'v1');
      const esV2 = availability.find(a => a.context.locale === 'es' && a.context.version === 'v2');
      
      expect(enV1?.available).toBe(true);
      expect(enV2?.available).toBe(true);
      expect(esV1?.available).toBe(false);
      expect(esV2?.available).toBe(false);
    });

    it('should handle assets that exist only in specific contexts', () => {
      const availability = getAssetAvailability('images/prueba.png', mockManifest);
      
      const esV1 = availability.find(a => a.context.locale === 'es' && a.context.version === 'v1');
      const enV1 = availability.find(a => a.context.locale === 'en' && a.context.version === 'v1');
      
      expect(esV1?.available).toBe(true);
      expect(enV1?.available).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty manifest', () => {
      const emptyManifest: AssetManifest = {
        version: '1.0.0',
        generatedAt: '2023-01-01T00:00:00.000Z',
        locales: [],
        versions: [],
        assets: {}
      };

      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = resolveAssetWithFallback('images/test.png', context, emptyManifest);
      
      expect(result).toBeNull();
    });

    it('should handle malformed asset paths', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = generateDirectAssetPath('', context);
      
      expect(result).toBe('/public/assets/en/v1/files/unknown');
    });

    it('should normalize paths with leading slashes', () => {
      const context: AssetContext = { locale: 'en', version: 'v1' };
      const result = resolveAssetWithFallback('/images/test.png', context, mockManifest);
      
      expect(result).not.toBeNull();
      expect(result!.publicPath).toBe('/public/assets/en/v1/images/test.abc123.png');
    });
  });
});