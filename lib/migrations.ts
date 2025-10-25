import { getDatabase } from './database';
import fs from 'fs';
import path from 'path';

export interface Migration {
  version: string;
  name: string;
  up: string;
  down?: string;
  timestamp: string;
}

/**
 * Create migrations table if it doesn't exist
 */
function createMigrationsTable(): void {
  const db = getDatabase();
  const connection = db.getConnection();
  
  connection.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Get list of applied migrations
 */
function getAppliedMigrations(): string[] {
  const db = getDatabase();
  const connection = db.getConnection();
  
  try {
    const stmt = connection.prepare('SELECT version FROM migrations ORDER BY version');
    const rows = stmt.all() as { version: string }[];
    return rows.map(row => row.version);
  } catch (error) {
    // Table might not exist yet
    return [];
  }
}

/**
 * Mark migration as applied
 */
function markMigrationApplied(version: string, name: string): void {
  const db = getDatabase();
  const connection = db.getConnection();
  
  const stmt = connection.prepare(`
    INSERT INTO migrations (version, name) VALUES (?, ?)
  `);
  stmt.run(version, name);
}

/**
 * Get all available migrations
 */
function getAvailableMigrations(): Migration[] {
  return [
    {
      version: '001',
      name: 'initial_schema',
      timestamp: '2024-01-01T00:00:00Z',
      up: `
        -- Configuration table for feature flags and settings
        CREATE TABLE config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- URL redirects for moved/renamed pages
        CREATE TABLE redirects (
          from_path TEXT PRIMARY KEY,
          to_path TEXT NOT NULL,
          status_code INTEGER DEFAULT 301,
          locale TEXT,
          version TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Page analytics for popular content tracking
        CREATE TABLE page_analytics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          locale TEXT NOT NULL,
          version TEXT NOT NULL,
          user_agent TEXT,
          referrer TEXT,
          viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Search index metadata
        CREATE TABLE search_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          index_version TEXT NOT NULL,
          locale TEXT NOT NULL,
          version TEXT NOT NULL,
          page_count INTEGER NOT NULL,
          index_size_bytes INTEGER NOT NULL,
          indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Popular search queries for analytics
        CREATE TABLE search_queries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query TEXT NOT NULL,
          locale TEXT NOT NULL,
          version TEXT NOT NULL,
          results_count INTEGER NOT NULL,
          clicked_result_path TEXT,
          searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for better performance
        CREATE INDEX idx_redirects_locale_version ON redirects(locale, version);
        CREATE INDEX idx_page_analytics_path ON page_analytics(path);
        CREATE INDEX idx_page_analytics_locale_version ON page_analytics(locale, version);
        CREATE INDEX idx_page_analytics_viewed_at ON page_analytics(viewed_at);
        CREATE INDEX idx_search_metadata_locale_version ON search_metadata(locale, version);
        CREATE INDEX idx_search_queries_query ON search_queries(query);
        CREATE INDEX idx_search_queries_locale_version ON search_queries(locale, version);
        CREATE INDEX idx_search_queries_searched_at ON search_queries(searched_at);
      `,
      down: `
        DROP TABLE IF EXISTS search_queries;
        DROP TABLE IF EXISTS search_metadata;
        DROP TABLE IF EXISTS page_analytics;
        DROP TABLE IF EXISTS redirects;
        DROP TABLE IF EXISTS config;
      `
    }
  ];
}

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<void> {
  const db = getDatabase();
  
  // Ensure migrations table exists
  createMigrationsTable();
  
  const appliedMigrations = getAppliedMigrations();
  const availableMigrations = getAvailableMigrations();
  
  const pendingMigrations = availableMigrations.filter(
    migration => !appliedMigrations.includes(migration.version)
  );
  
  if (pendingMigrations.length === 0) {
    console.log('No pending migrations');
    return;
  }
  
  console.log(`Running ${pendingMigrations.length} pending migrations...`);
  
  for (const migration of pendingMigrations) {
    console.log(`Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      // Run migration in a transaction
      const connection = db.getConnection();
      const transaction = connection.transaction(() => {
        connection.exec(migration.up);
        markMigrationApplied(migration.version, migration.name);
      });
      transaction();
      
      console.log(`✓ Migration ${migration.version} applied successfully`);
    } catch (error) {
      console.error(`✗ Failed to apply migration ${migration.version}:`, error);
      throw error;
    }
  }
  
  console.log('All migrations completed successfully');
}

/**
 * Rollback the last migration (if down script is available)
 */
export async function rollbackLastMigration(): Promise<void> {
  const db = getDatabase();
  const appliedMigrations = getAppliedMigrations();
  
  if (appliedMigrations.length === 0) {
    console.log('No migrations to rollback');
    return;
  }
  
  const lastMigrationVersion = appliedMigrations[appliedMigrations.length - 1];
  const availableMigrations = getAvailableMigrations();
  const migration = availableMigrations.find(m => m.version === lastMigrationVersion);
  
  if (!migration) {
    throw new Error(`Migration ${lastMigrationVersion} not found`);
  }
  
  if (!migration.down) {
    throw new Error(`Migration ${lastMigrationVersion} has no rollback script`);
  }
  
  console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
  
  try {
    const connection = db.getConnection();
    const transaction = connection.transaction(() => {
      connection.exec(migration.down!);
      const stmt = connection.prepare('DELETE FROM migrations WHERE version = ?');
      stmt.run(migration.version);
    });
    transaction();
    
    console.log(`✓ Migration ${migration.version} rolled back successfully`);
  } catch (error) {
    console.error(`✗ Failed to rollback migration ${migration.version}:`, error);
    throw error;
  }
}

/**
 * Get migration status
 */
export function getMigrationStatus(): {
  applied: string[];
  pending: string[];
  total: number;
} {
  const appliedMigrations = getAppliedMigrations();
  const availableMigrations = getAvailableMigrations();
  
  const pendingMigrations = availableMigrations
    .filter(migration => !appliedMigrations.includes(migration.version))
    .map(migration => migration.version);
  
  return {
    applied: appliedMigrations,
    pending: pendingMigrations,
    total: availableMigrations.length,
  };
}