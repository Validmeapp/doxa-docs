import { getDatabase } from './database';

/**
 * Seed data for development environment
 */
export interface SeedData {
  config: Array<{
    key: string;
    value: string;
    description: string;
  }>;
  redirects: Array<{
    from_path: string;
    to_path: string;
    status_code: number;
    locale: string;
    version: string;
  }>;
}

/**
 * Default seed data for development
 */
const defaultSeedData: SeedData = {
  config: [
    {
      key: 'default_locale',
      value: 'en',
      description: 'Default locale for the documentation site'
    },
    {
      key: 'default_version',
      value: 'v1',
      description: 'Default API version to display'
    },
    {
      key: 'available_locales',
      value: JSON.stringify(['en', 'es']),
      description: 'List of available locales'
    },
    {
      key: 'available_versions',
      value: JSON.stringify(['v1', 'v2']),
      description: 'List of available API versions'
    },
    {
      key: 'search_enabled',
      value: 'true',
      description: 'Enable/disable search functionality'
    },
    {
      key: 'analytics_enabled',
      value: 'true',
      description: 'Enable/disable page analytics tracking'
    },
    {
      key: 'theme_default',
      value: 'system',
      description: 'Default theme setting (light, dark, system)'
    }
  ],
  redirects: [
    {
      from_path: '/docs',
      to_path: '/en/docs/v1/overview',
      status_code: 301,
      locale: 'en',
      version: 'v1'
    },
    {
      from_path: '/api',
      to_path: '/en/docs/v1/api-reference',
      status_code: 301,
      locale: 'en',
      version: 'v1'
    },
    {
      from_path: '/old-auth',
      to_path: '/en/docs/v1/authentication',
      status_code: 301,
      locale: 'en',
      version: 'v1'
    }
  ]
};

/**
 * Clear all data from tables (for development reset)
 */
export function clearAllData(): void {
  const db = getDatabase();
  const connection = db.getConnection();
  
  console.log('Clearing all data from tables...');
  
  const transaction = connection.transaction(() => {
    connection.exec('DELETE FROM search_queries');
    connection.exec('DELETE FROM search_metadata');
    connection.exec('DELETE FROM page_analytics');
    connection.exec('DELETE FROM redirects');
    connection.exec('DELETE FROM config');
  });
  transaction();
  
  console.log('✓ All data cleared');
}

/**
 * Seed configuration data
 */
function seedConfig(configData: SeedData['config']): void {
  const db = getDatabase();
  const connection = db.getConnection();
  
  const stmt = connection.prepare(`
    INSERT OR REPLACE INTO config (key, value, description, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  for (const item of configData) {
    stmt.run(item.key, item.value, item.description);
  }
  
  console.log(`✓ Seeded ${configData.length} config items`);
}

/**
 * Seed redirect data
 */
function seedRedirects(redirectData: SeedData['redirects']): void {
  const db = getDatabase();
  const connection = db.getConnection();
  
  const stmt = connection.prepare(`
    INSERT OR REPLACE INTO redirects (from_path, to_path, status_code, locale, version, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  for (const redirect of redirectData) {
    stmt.run(
      redirect.from_path,
      redirect.to_path,
      redirect.status_code,
      redirect.locale,
      redirect.version
    );
  }
  
  console.log(`✓ Seeded ${redirectData.length} redirects`);
}

/**
 * Seed sample analytics data for development
 */
function seedSampleAnalytics(): void {
  const db = getDatabase();
  const connection = db.getConnection();
  
  const stmt = connection.prepare(`
    INSERT INTO page_analytics (path, locale, version, user_agent, referrer, viewed_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const sampleData = [
    {
      path: '/en/docs/v1/overview',
      locale: 'en',
      version: 'v1',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      referrer: 'https://google.com',
      viewed_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      path: '/en/docs/v1/authentication',
      locale: 'en',
      version: 'v1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      referrer: 'https://github.com',
      viewed_at: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
    },
    {
      path: '/es/docs/v1/overview',
      locale: 'es',
      version: 'v1',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
      referrer: null,
      viewed_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    }
  ];
  
  for (const item of sampleData) {
    stmt.run(
      item.path,
      item.locale,
      item.version,
      item.user_agent,
      item.referrer,
      item.viewed_at
    );
  }
  
  console.log(`✓ Seeded ${sampleData.length} analytics entries`);
}

/**
 * Seed sample search queries for development
 */
function seedSampleSearchQueries(): void {
  const db = getDatabase();
  const connection = db.getConnection();
  
  const stmt = connection.prepare(`
    INSERT INTO search_queries (query, locale, version, results_count, clicked_result_path, searched_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const sampleQueries = [
    {
      query: 'authentication',
      locale: 'en',
      version: 'v1',
      results_count: 5,
      clicked_result_path: '/en/docs/v1/authentication',
      searched_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
    },
    {
      query: 'api key',
      locale: 'en',
      version: 'v1',
      results_count: 3,
      clicked_result_path: '/en/docs/v1/api-reference/authentication',
      searched_at: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
    },
    {
      query: 'webhook',
      locale: 'es',
      version: 'v1',
      results_count: 2,
      clicked_result_path: null,
      searched_at: new Date(Date.now() - 900000).toISOString() // 15 minutes ago
    }
  ];
  
  for (const query of sampleQueries) {
    stmt.run(
      query.query,
      query.locale,
      query.version,
      query.results_count,
      query.clicked_result_path,
      query.searched_at
    );
  }
  
  console.log(`✓ Seeded ${sampleQueries.length} search queries`);
}

/**
 * Run database seeding with default or custom data
 */
export function seedDatabase(customSeedData?: Partial<SeedData>): void {
  const seedData = {
    ...defaultSeedData,
    ...customSeedData
  };
  
  console.log('Starting database seeding...');
  
  const db = getDatabase();
  
  const connection = db.getConnection();
  const transaction = connection.transaction(() => {
    seedConfig(seedData.config);
    seedRedirects(seedData.redirects);
    seedSampleAnalytics();
    seedSampleSearchQueries();
  });
  transaction();
  
  console.log('✓ Database seeding completed successfully');
}

/**
 * Reset and seed database (clear all data and reseed)
 */
export function resetAndSeedDatabase(customSeedData?: Partial<SeedData>): void {
  console.log('Resetting and seeding database...');
  clearAllData();
  seedDatabase(customSeedData);
  console.log('✓ Database reset and seeding completed');
}

/**
 * Get seeding status and data counts
 */
export function getSeedingStatus(): {
  config_count: number;
  redirects_count: number;
  analytics_count: number;
  search_queries_count: number;
} {
  const db = getDatabase();
  const connection = db.getConnection();
  
  const getCount = (table: string): number => {
    const stmt = connection.prepare(`SELECT COUNT(*) as count FROM ${table}`);
    const result = stmt.get() as { count: number };
    return result.count;
  };
  
  return {
    config_count: getCount('config'),
    redirects_count: getCount('redirects'),
    analytics_count: getCount('page_analytics'),
    search_queries_count: getCount('search_queries'),
  };
}