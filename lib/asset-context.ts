/**
 * Asset Context Resolution Utilities
 * Provides context-aware asset resolution with fallback mechanisms
 */

import { getLocaleFromPathname } from '@/lib/locale-utils';
import { locales, defaultLocale, type Locale } from '@/lib/locale-config';
import type { AssetManifest, ManifestEntry } from '@/lib/asset-processor';

export interface AssetContext {
  locale: Locale;
  version: string;
}

export interface AssetResolutionResult {
  publicPath: string;
  entry: ManifestEntry;
  fallbackUsed?: boolean;
  fallbackType?: 'locale' | 'version' | 'direct';
}

/**
 * Extract version from pathname
 * This can be enhanced based on the actual routing structure
 */
export function getVersionFromPathname(pathname: string): string {
  // Look for version patterns in the pathname
  // For now, we'll default to 'v1' but this can be enhanced
  // to parse actual version from URL structure
  
  // Example patterns to look for:
  // /en/docs/v2/... -> v2
  // /en/v1/docs/... -> v1
  
  const versionMatch = pathname.match(/\/v(\d+)/);
  if (versionMatch) {
    return `v${versionMatch[1]}`;
  }
  
  // Default to v1 if no version found
  return 'v1';
}

/**
 * Get asset context from pathname
 */
export function getAssetContextFromPathname(pathname: string): AssetContext {
  const locale = getLocaleFromPathname(pathname);
  const version = getVersionFromPathname(pathname);
  
  return { locale, version };
}

/**
 * Resolve asset path with comprehensive fallback logic
 */
export function resolveAssetWithFallback(
  src: string,
  context: AssetContext,
  manifest: AssetManifest
): AssetResolutionResult | null {
  // Normalize the source path
  const normalizedSrc = src.startsWith('/') ? src.slice(1) : src;
  
  // Strategy 1: Try exact match with current context
  const exactResult = tryExactMatch(normalizedSrc, context, manifest);
  if (exactResult) {
    return { ...exactResult, fallbackUsed: false };
  }
  
  // Strategy 2: Try fallback to other versions in same locale
  const versionFallbackResult = tryVersionFallback(normalizedSrc, context, manifest);
  if (versionFallbackResult) {
    return { ...versionFallbackResult, fallbackUsed: true, fallbackType: 'version' };
  }
  
  // Strategy 3: Try fallback to default locale with same version
  const localeFallbackResult = tryLocaleFallback(normalizedSrc, context, manifest);
  if (localeFallbackResult) {
    return { ...localeFallbackResult, fallbackUsed: true, fallbackType: 'locale' };
  }
  
  // Strategy 4: Try fallback to default locale and any version
  const defaultFallbackResult = tryDefaultFallback(normalizedSrc, manifest);
  if (defaultFallbackResult) {
    return { ...defaultFallbackResult, fallbackUsed: true, fallbackType: 'locale' };
  }
  
  return null;
}

/**
 * Try exact match with current context
 */
function tryExactMatch(
  normalizedSrc: string,
  context: AssetContext,
  manifest: AssetManifest
): { publicPath: string; entry: ManifestEntry } | null {
  // Try various path formats for exact match
  const possibleKeys = [
    `${context.locale}/${context.version}/assets/${normalizedSrc}`,
    `${context.locale}/${context.version}/assets/images/${normalizedSrc}`,
    `${context.locale}/${context.version}/assets/files/${normalizedSrc}`,
    normalizedSrc,
  ];
  
  for (const key of possibleKeys) {
    const entry = manifest.assets[key];
    if (entry && entry.locale === context.locale && entry.version === context.version) {
      return { publicPath: entry.publicPath, entry };
    }
  }
  
  return null;
}

/**
 * Try fallback to other versions in the same locale
 */
function tryVersionFallback(
  normalizedSrc: string,
  context: AssetContext,
  manifest: AssetManifest
): { publicPath: string; entry: ManifestEntry } | null {
  // Get all available versions for this locale
  const availableVersions = manifest.versions.filter(v => v !== context.version);
  
  for (const version of availableVersions) {
    const fallbackContext = { ...context, version };
    const result = tryExactMatch(normalizedSrc, fallbackContext, manifest);
    if (result) {
      return result;
    }
  }
  
  return null;
}

/**
 * Try fallback to default locale with same version
 */
function tryLocaleFallback(
  normalizedSrc: string,
  context: AssetContext,
  manifest: AssetManifest
): { publicPath: string; entry: ManifestEntry } | null {
  if (context.locale === defaultLocale) {
    return null; // Already using default locale
  }
  
  const fallbackContext = { ...context, locale: defaultLocale };
  return tryExactMatch(normalizedSrc, fallbackContext, manifest);
}

/**
 * Try fallback to default locale with any version
 */
function tryDefaultFallback(
  normalizedSrc: string,
  manifest: AssetManifest
): { publicPath: string; entry: ManifestEntry } | null {
  // Try default locale with all available versions
  for (const version of manifest.versions) {
    const fallbackContext = { locale: defaultLocale, version };
    const result = tryExactMatch(normalizedSrc, fallbackContext, manifest);
    if (result) {
      return result;
    }
  }
  
  return null;
}

/**
 * Get all possible asset contexts for fallback resolution
 */
export function getAllPossibleContexts(manifest: AssetManifest): AssetContext[] {
  const contexts: AssetContext[] = [];
  
  for (const locale of manifest.locales) {
    for (const version of manifest.versions) {
      contexts.push({ locale: locale as Locale, version });
    }
  }
  
  return contexts;
}

/**
 * Check if an asset exists in a specific context
 */
export function assetExistsInContext(
  src: string,
  context: AssetContext,
  manifest: AssetManifest
): boolean {
  const result = tryExactMatch(src, context, manifest);
  return result !== null;
}

/**
 * Get asset availability across all contexts
 */
export function getAssetAvailability(
  src: string,
  manifest: AssetManifest
): { context: AssetContext; available: boolean }[] {
  const allContexts = getAllPossibleContexts(manifest);
  
  return allContexts.map(context => ({
    context,
    available: assetExistsInContext(src, context, manifest)
  }));
}

/**
 * Generate direct asset path as fallback when manifest is not available
 */
export function generateDirectAssetPath(
  src: string,
  context: AssetContext
): string {
  const normalizedSrc = src.startsWith('/') ? src.slice(1) : src;
  const filename = normalizedSrc.split('/').pop() || 'unknown';
  
  // Determine if it's likely an image or binary file based on extension
  const isImage = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(filename);
  const assetType = isImage ? 'images' : 'files';
  
  return `/public/assets/${context.locale}/${context.version}/${assetType}/${filename}`;
}