import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export interface ConfigResponse {
  defaultLocale: string;
  defaultVersion: string;
  availableLocales: string[];
  availableVersions: string[];
  features: Record<string, boolean>;
}

interface ConfigRow {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

/**
 * Get available locales by scanning content directory
 */
function getAvailableLocales(): string[] {
  const contentDir = path.join(process.cwd(), 'content');
  
  if (!fs.existsSync(contentDir)) {
    return ['en']; // Default fallback
  }
  
  try {
    const entries = fs.readdirSync(contentDir, { withFileTypes: true });
    const locales = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();
    
    return locales.length > 0 ? locales : ['en'];
  } catch (error) {
    console.error('Error reading content directory:', error);
    return ['en'];
  }
}

/**
 * Get available versions by scanning a locale's content directory
 */
function getAvailableVersions(locale: string = 'en'): string[] {
  const localeDir = path.join(process.cwd(), 'content', locale);
  
  if (!fs.existsSync(localeDir)) {
    return ['v1']; // Default fallback
  }
  
  try {
    const entries = fs.readdirSync(localeDir, { withFileTypes: true });
    const versions = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .filter(name => name.startsWith('v'))
      .sort((a, b) => {
        // Sort versions numerically (v1, v2, v10, etc.)
        const aNum = parseInt(a.substring(1));
        const bNum = parseInt(b.substring(1));
        return bNum - aNum; // Descending order (latest first)
      });
    
    return versions.length > 0 ? versions : ['v1'];
  } catch (error) {
    console.error(`Error reading locale directory ${locale}:`, error);
    return ['v1'];
  }
}

/**
 * Get configuration from database with caching
 */
function getConfigFromDatabase(): Record<string, any> {
  try {
    const db = getDatabase();
    const connection = db.getConnection();
    
    const stmt = connection.prepare('SELECT key, value, description, updated_at FROM config');
    const rows = stmt.all() as ConfigRow[];
    
    const config: Record<string, any> = {};
    
    for (const row of rows) {
      try {
        // Try to parse as JSON first, fallback to string
        config[row.key] = JSON.parse(row.value);
      } catch {
        config[row.key] = row.value;
      }
    }
    
    return config;
  } catch (error) {
    console.error('Error reading config from database:', error);
    return {};
  }
}

/**
 * Get feature flags from configuration
 */
function getFeatureFlags(config: Record<string, any>): Record<string, boolean> {
  const features: Record<string, boolean> = {};
  
  // Extract feature flags (keys starting with 'feature_')
  for (const [key, value] of Object.entries(config)) {
    if (key.startsWith('feature_')) {
      const featureName = key.replace('feature_', '');
      features[featureName] = Boolean(value);
    }
  }
  
  // Default features if none configured
  if (Object.keys(features).length === 0) {
    features.search = true;
    features.analytics = true;
    features.darkMode = true;
    features.languageSwitcher = true;
    features.versionSwitcher = true;
  }
  
  return features;
}

/**
 * Cache for configuration data
 */
let configCache: {
  data: ConfigResponse;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached configuration or fetch fresh data
 */
function getCachedConfig(): ConfigResponse {
  const now = Date.now();
  
  if (configCache && (now - configCache.timestamp) < CACHE_TTL) {
    return configCache.data;
  }
  
  // Fetch fresh configuration
  const availableLocales = getAvailableLocales();
  const availableVersions = getAvailableVersions(availableLocales[0]);
  const dbConfig = getConfigFromDatabase();
  const features = getFeatureFlags(dbConfig);
  
  const config: ConfigResponse = {
    defaultLocale: dbConfig.defaultLocale || availableLocales[0] || 'en',
    defaultVersion: dbConfig.defaultVersion || availableVersions[0] || 'v1',
    availableLocales,
    availableVersions,
    features,
  };
  
  // Update cache
  configCache = {
    data: config,
    timestamp: now,
  };
  
  return config;
}

/**
 * GET /api/config
 * Returns application configuration including available locales, versions, and feature flags
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const config = getCachedConfig();
    
    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5 min cache, 10 min stale
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in /api/config:', error);
    
    // Return minimal fallback configuration
    const fallbackConfig: ConfigResponse = {
      defaultLocale: 'en',
      defaultVersion: 'v1',
      availableLocales: ['en'],
      availableVersions: ['v1'],
      features: {
        search: true,
        analytics: false,
        darkMode: true,
        languageSwitcher: false,
        versionSwitcher: false,
      },
    };
    
    return NextResponse.json(fallbackConfig, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * POST /api/config
 * Update configuration values (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const connection = db.getConnection();
    
    // Prepare statements for upsert
    const upsertStmt = connection.prepare(`
      INSERT INTO config (key, value, description, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        description = excluded.description,
        updated_at = CURRENT_TIMESTAMP
    `);
    
    // Update configuration values
    const transaction = connection.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        if (typeof key === 'string') {
          const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
          upsertStmt.run(key, serializedValue, null);
        }
      }
    });
    
    transaction();
    
    // Clear cache to force refresh
    configCache = null;
    
    return NextResponse.json(
      { message: 'Configuration updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating configuration:', error);
    
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}