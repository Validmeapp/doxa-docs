#!/usr/bin/env tsx

import { Command } from 'commander';
import { initializeDatabaseWithSchema, checkDatabaseHealth } from '../lib/db-init';
import { runMigrations, rollbackLastMigration, getMigrationStatus } from '../lib/migrations';
import { seedDatabase, resetAndSeedDatabase, getSeedingStatus, clearAllData } from '../lib/db-seed';
import { getDatabase } from '../lib/database';

const program = new Command();

program
  .name('db-cli')
  .description('Database management CLI for the multilingual docs portal')
  .version('1.0.0');

// Initialize command
program
  .command('init')
  .description('Initialize database with schema')
  .action(async () => {
    try {
      await initializeDatabaseWithSchema();
      console.log('✓ Database initialized successfully');
    } catch (error) {
      console.error('✗ Failed to initialize database:', error);
      process.exit(1);
    }
  });

// Migration commands
const migrateCmd = program
  .command('migrate')
  .description('Database migration commands');

migrateCmd
  .command('up')
  .description('Run pending migrations')
  .action(async () => {
    try {
      await runMigrations();
    } catch (error) {
      console.error('✗ Migration failed:', error);
      process.exit(1);
    }
  });

migrateCmd
  .command('down')
  .description('Rollback last migration')
  .action(async () => {
    try {
      await rollbackLastMigration();
    } catch (error) {
      console.error('✗ Rollback failed:', error);
      process.exit(1);
    }
  });

migrateCmd
  .command('status')
  .description('Show migration status')
  .action(() => {
    try {
      const status = getMigrationStatus();
      console.log('Migration Status:');
      console.log(`  Applied: ${status.applied.length}/${status.total}`);
      console.log(`  Pending: ${status.pending.length}`);
      
      if (status.applied.length > 0) {
        console.log('\nApplied migrations:');
        status.applied.forEach(version => console.log(`  ✓ ${version}`));
      }
      
      if (status.pending.length > 0) {
        console.log('\nPending migrations:');
        status.pending.forEach(version => console.log(`  ○ ${version}`));
      }
    } catch (error) {
      console.error('✗ Failed to get migration status:', error);
      process.exit(1);
    }
  });

// Seed commands
const seedCmd = program
  .command('seed')
  .description('Database seeding commands');

seedCmd
  .command('run')
  .description('Seed database with sample data')
  .action(() => {
    try {
      seedDatabase();
    } catch (error) {
      console.error('✗ Seeding failed:', error);
      process.exit(1);
    }
  });

seedCmd
  .command('reset')
  .description('Clear all data and reseed')
  .action(() => {
    try {
      resetAndSeedDatabase();
    } catch (error) {
      console.error('✗ Reset and seed failed:', error);
      process.exit(1);
    }
  });

seedCmd
  .command('clear')
  .description('Clear all data from tables')
  .action(() => {
    try {
      clearAllData();
    } catch (error) {
      console.error('✗ Clear data failed:', error);
      process.exit(1);
    }
  });

seedCmd
  .command('status')
  .description('Show seeding status')
  .action(() => {
    try {
      const status = getSeedingStatus();
      console.log('Database Status:');
      console.log(`  Config entries: ${status.config_count}`);
      console.log(`  Redirects: ${status.redirects_count}`);
      console.log(`  Analytics entries: ${status.analytics_count}`);
      console.log(`  Search queries: ${status.search_queries_count}`);
    } catch (error) {
      console.error('✗ Failed to get seeding status:', error);
      process.exit(1);
    }
  });

// Health check command
program
  .command('health')
  .description('Check database health')
  .action(() => {
    try {
      const health = checkDatabaseHealth();
      console.log('Database Health Check:');
      console.log(`  Status: ${health.status}`);
      console.log(`  Path: ${health.info.path}`);
      console.log(`  Size: ${health.info.size} bytes`);
      console.log(`  Connected: ${health.info.connected}`);
      console.log(`  Readonly: ${health.info.readonly}`);
      
      if (health.error) {
        console.log(`  Error: ${health.error}`);
      }
      
      if (health.status === 'unhealthy') {
        process.exit(1);
      }
    } catch (error) {
      console.error('✗ Health check failed:', error);
      process.exit(1);
    }
  });

// Info command
program
  .command('info')
  .description('Show database information')
  .action(() => {
    try {
      const db = getDatabase();
      const info = db.getInfo();
      const migrationStatus = getMigrationStatus();
      const seedingStatus = getSeedingStatus();
      
      console.log('Database Information:');
      console.log(`  Path: ${info.path}`);
      console.log(`  Size: ${info.size} bytes`);
      console.log(`  Connected: ${info.connected}`);
      console.log(`  Readonly: ${info.readonly}`);
      console.log('\nMigrations:');
      console.log(`  Applied: ${migrationStatus.applied.length}/${migrationStatus.total}`);
      console.log(`  Pending: ${migrationStatus.pending.length}`);
      console.log('\nData:');
      console.log(`  Config entries: ${seedingStatus.config_count}`);
      console.log(`  Redirects: ${seedingStatus.redirects_count}`);
      console.log(`  Analytics entries: ${seedingStatus.analytics_count}`);
      console.log(`  Search queries: ${seedingStatus.search_queries_count}`);
    } catch (error) {
      console.error('✗ Failed to get database info:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();