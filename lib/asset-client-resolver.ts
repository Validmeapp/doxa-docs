import { defaultLocale, type Locale } from '@/lib/locale-config';
import type { AssetContext } from '@/lib/asset-context';
import type { AssetManifest, ManifestEntry } from '@/lib/asset-processor';

type AssetKind = 'media' | 'file';

const MEDIA_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.avif', '.bmp', '.ico',
  '.mp4', '.webm', '.ogg', '.mov', '.m4v'
]);

function stripQueryAndHash(input: string): string {
  return input.split('#')[0].split('?')[0];
}

function getExtension(input: string): string {
  const clean = stripQueryAndHash(input).toLowerCase();
  const lastDot = clean.lastIndexOf('.');
  return lastDot >= 0 ? clean.slice(lastDot) : '';
}

function isExternalUrl(src: string): boolean {
  return /^(https?:)?\/\//i.test(src) || src.startsWith('data:');
}

function normalizeSrcPath(src: string): string {
  let normalized = stripQueryAndHash(src).trim();
  normalized = normalized.replace(/\\/g, '/');
  normalized = normalized.replace(/^\.?\//, '');
  normalized = normalized.replace(/^assets\//i, '');
  normalized = normalized.replace(/^(images|media|files)\//i, '');
  return normalized;
}

function getFilename(src: string): string {
  const normalized = normalizeSrcPath(src);
  return normalized.split('/').pop() || normalized;
}

function normalizePublicPath(path: string): string {
  let normalized = path.replace(/\\/g, '/');
  normalized = normalized.replace(/^\/?public\//, '/');
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }
  return normalized;
}

function candidateFromManifestPath(path: string): string[] {
  const normalized = normalizePublicPath(path);
  const candidates = new Set<string>([normalized]);

  if (normalized.includes('/images/')) {
    candidates.add(normalized.replace('/images/', '/media/'));
  }
  if (normalized.includes('/media/')) {
    candidates.add(normalized.replace('/media/', '/images/'));
  }

  return Array.from(candidates);
}

function determineKind(src: string, preferred?: AssetKind): AssetKind {
  if (preferred) return preferred;
  const ext = getExtension(src);
  return MEDIA_EXTENSIONS.has(ext) ? 'media' : 'file';
}

function scoreEntry(entry: ManifestEntry, filename: string, context: AssetContext): number {
  let score = 0;
  const originalFilename = entry.originalPath.split('/').pop() || '';
  const hashedFilename = entry.hashedFilename || '';

  if (originalFilename === filename) score += 6;
  if (hashedFilename === filename) score += 8;
  if (entry.locale === context.locale) score += 4;
  if (entry.version === context.version) score += 4;
  if (entry.locale === defaultLocale) score += 1;
  if (entry.originalPath.toLowerCase().includes(filename.toLowerCase())) score += 1;
  return score;
}

export function findBestManifestEntry(
  src: string,
  context: AssetContext,
  manifest: AssetManifest
): ManifestEntry | null {
  const filename = getFilename(src);
  if (!filename) return null;

  const entries = Object.values(manifest.assets).filter((entry) => {
    const originalFilename = entry.originalPath.split('/').pop() || '';
    return originalFilename === filename || entry.hashedFilename === filename;
  });

  if (entries.length === 0) return null;

  entries.sort((a, b) => scoreEntry(b, filename, context) - scoreEntry(a, filename, context));
  return entries[0];
}

export function buildAssetCandidates(
  src: string,
  context: AssetContext,
  kindHint?: AssetKind,
  manifest?: AssetManifest
): { candidates: string[]; manifestEntry: ManifestEntry | null } {
  const candidates = new Set<string>();
  const kind = determineKind(src, kindHint);
  const dirCandidates = kind === 'media' ? ['media', 'images'] : ['files'];

  if (!src) {
    return { candidates: [], manifestEntry: null };
  }

  if (isExternalUrl(src)) {
    return { candidates: [src], manifestEntry: null };
  }

  const filename = getFilename(src);
  const normalizedPath = normalizeSrcPath(src);
  const localeCandidates: Locale[] = [context.locale];
  if (context.locale !== defaultLocale) {
    localeCandidates.push(defaultLocale);
  }

  // Preserve already-absolute assets path.
  if (src.startsWith('/assets/')) {
    candidates.add(stripQueryAndHash(src));
  }

  // Resolve from manifest first when available.
  let manifestEntry: ManifestEntry | null = null;
  if (manifest) {
    manifestEntry = findBestManifestEntry(src, context, manifest);
    if (manifestEntry) {
      for (const candidate of candidateFromManifestPath(manifestEntry.publicPath)) {
        candidates.add(candidate);
      }
    }
  }

  for (const locale of localeCandidates) {
    for (const dir of dirCandidates) {
      if (normalizedPath) {
        candidates.add(`/assets/${locale}/${context.version}/${dir}/${normalizedPath}`);
      }
      if (filename && filename !== normalizedPath) {
        candidates.add(`/assets/${locale}/${context.version}/${dir}/${filename}`);
      }
    }
  }

  return { candidates: Array.from(candidates), manifestEntry };
}

export async function pickFirstReachableAssetUrl(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    if (!candidate || isExternalUrl(candidate)) {
      return candidate || null;
    }

    try {
      const head = await fetch(candidate, { method: 'HEAD', cache: 'no-store' });
      if (head.ok) return candidate;
      if (head.status === 405) {
        const get = await fetch(candidate, { method: 'GET', cache: 'no-store' });
        if (get.ok) return candidate;
      }
    } catch {
      // Try next candidate
    }
  }

  return null;
}
