import { getDatabase } from './database';

export interface RedirectMatch {
  to_path: string;
  status_code: number;
}

interface RedirectRow {
  from_path: string;
  to_path: string;
  status_code: number;
  locale: string | null;
  version: string | null;
}

/**
 * Cache for redirect rules to avoid database queries on every request
 */
let redirectCache: {
  rules: RedirectRow[];
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached redirect rules or fetch from database
 */
function getCachedRedirects(): RedirectRow[] {
  const now = Date.now();
  
  if (redirectCache && (now - redirectCache.timestamp) < CACHE_TTL) {
    return redirectCache.rules;
  }
  
  try {
    const db = getDatabase();
    const connection = db.getConnection();
    
    const stmt = connection.prepare(`
      SELECT from_path, to_path, status_code, locale, version
      FROM redirects
      ORDER BY 
        CASE WHEN locale IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN version IS NOT NULL THEN 0 ELSE 1 END,
        from_path
    `);
    
    const rules = stmt.all() as RedirectRow[];
    
    // Update cache
    redirectCache = {
      rules,
      timestamp: now,
    };
    
    return rules;
  } catch (error) {
    console.error('Error fetching redirects:', error);
    return redirectCache?.rules || [];
  }
}

/**
 * Find matching redirect rule for a given path
 */
export function findRedirect(
  path: string,
  locale?: string,
  version?: string
): RedirectMatch | null {
  const rules = getCachedRedirects();
  
  // Normalize path (remove trailing slash except for root)
  const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');
  
  // Find exact matches first, prioritizing more specific rules
  for (const rule of rules) {
    const rulePath = rule.from_path === '/' ? '/' : rule.from_path.replace(/\/$/, '');
    
    if (rulePath === normalizedPath) {
      // Check locale and version constraints
      if (rule.locale && rule.locale !== locale) {
        continue;
      }
      
      if (rule.version && rule.version !== version) {
        continue;
      }
      
      return {
        to_path: rule.to_path,
        status_code: rule.status_code,
      };
    }
  }
  
  // Check for wildcard matches (paths ending with /*)
  for (const rule of rules) {
    if (rule.from_path.endsWith('/*')) {
      const basePath = rule.from_path.slice(0, -2);
      
      if (normalizedPath.startsWith(basePath)) {
        // Check locale and version constraints
        if (rule.locale && rule.locale !== locale) {
          continue;
        }
        
        if (rule.version && rule.version !== version) {
          continue;
        }
        
        // Replace the base path in the redirect
        let toPath = rule.to_path;
        if (rule.to_path.endsWith('/*')) {
          const toBasePath = rule.to_path.slice(0, -2);
          const remainingPath = normalizedPath.slice(basePath.length);
          toPath = toBasePath + remainingPath;
        }
        
        return {
          to_path: toPath,
          status_code: rule.status_code,
        };
      }
    }
  }
  
  return null;
}

/**
 * Clear redirect cache (useful after updating redirects)
 */
export function clearRedirectCache(): void {
  redirectCache = null;
}

/**
 * Preload redirect cache
 */
export function preloadRedirectCache(): void {
  getCachedRedirects();
}

/**
 * Get redirect statistics
 */
export function getRedirectStats(): {
  totalRules: number;
  rulesByStatusCode: Record<number, number>;
  rulesByLocale: Record<string, number>;
  rulesByVersion: Record<string, number>;
  cacheAge: number;
} {
  const rules = getCachedRedirects();
  const now = Date.now();
  
  const stats = {
    totalRules: rules.length,
    rulesByStatusCode: {} as Record<number, number>,
    rulesByLocale: {} as Record<string, number>,
    rulesByVersion: {} as Record<string, number>,
    cacheAge: redirectCache ? now - redirectCache.timestamp : 0,
  };
  
  for (const rule of rules) {
    // Count by status code
    stats.rulesByStatusCode[rule.status_code] = 
      (stats.rulesByStatusCode[rule.status_code] || 0) + 1;
    
    // Count by locale
    const locale = rule.locale || 'global';
    stats.rulesByLocale[locale] = (stats.rulesByLocale[locale] || 0) + 1;
    
    // Count by version
    const version = rule.version || 'global';
    stats.rulesByVersion[version] = (stats.rulesByVersion[version] || 0) + 1;
  }
  
  return stats;
}