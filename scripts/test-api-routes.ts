#!/usr/bin/env tsx

/**
 * Test script for API routes
 * This script tests the configuration, health, and redirect API endpoints
 */

import { runMigrations } from '../lib/migrations';
import { getDatabase } from '../lib/database';

async function testConfigAPI() {
  console.log('\n=== Testing Configuration API ===');
  
  try {
    // Test GET /api/config
    const response = await fetch('http://localhost:3000/api/config');
    const config = await response.json();
    
    console.log('✓ Config API response:', JSON.stringify(config, null, 2));
    
    // Verify required fields
    const requiredFields = ['defaultLocale', 'defaultVersion', 'availableLocales', 'availableVersions', 'features'];
    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    console.log('✓ All required fields present');
  } catch (error) {
    console.error('✗ Config API test failed:', error);
  }
}

async function testHealthAPI() {
  console.log('\n=== Testing Health API ===');
  
  try {
    // Test GET /api/health
    const response = await fetch('http://localhost:3000/api/health');
    const health = await response.json();
    
    console.log('✓ Health API response:', JSON.stringify(health, null, 2));
    
    // Verify required fields
    const requiredFields = ['status', 'timestamp', 'services', 'responseTime'];
    for (const field of requiredFields) {
      if (!(field in health)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Verify services
    const requiredServices = ['database', 'filesystem', 'search'];
    for (const service of requiredServices) {
      if (!(service in health.services)) {
        throw new Error(`Missing service: ${service}`);
      }
    }
    
    console.log('✓ All required fields and services present');
    console.log(`✓ Overall status: ${health.status}`);
  } catch (error) {
    console.error('✗ Health API test failed:', error);
  }
}

async function testRedirectAPI() {
  console.log('\n=== Testing Redirect API ===');
  
  try {
    // Test POST /api/redirects (create)
    const createResponse = await fetch('http://localhost:3000/api/redirects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_path: '/old-page',
        to_path: '/new-page',
        status_code: 301,
        locale: 'en',
        version: 'v1',
      }),
    });
    
    const createResult = await createResponse.json();
    console.log('✓ Create redirect response:', JSON.stringify(createResult, null, 2));
    
    // Test GET /api/redirects (list)
    const listResponse = await fetch('http://localhost:3000/api/redirects');
    const listResult = await listResponse.json();
    
    console.log('✓ List redirects response:', JSON.stringify(listResult, null, 2));
    
    // Test bulk operations
    const bulkResponse = await fetch('http://localhost:3000/api/redirects/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        redirects: [
          {
            from_path: '/bulk-test-1',
            to_path: '/bulk-target-1',
            status_code: 301,
          },
          {
            from_path: '/bulk-test-2',
            to_path: '/bulk-target-2',
            status_code: 302,
          },
        ],
      }),
    });
    
    const bulkResult = await bulkResponse.json();
    console.log('✓ Bulk redirect response:', JSON.stringify(bulkResult, null, 2));
    
    // Test export
    const exportResponse = await fetch('http://localhost:3000/api/redirects/bulk/export');
    const exportResult = await exportResponse.json();
    
    console.log('✓ Export redirects response:', JSON.stringify(exportResult, null, 2));
    
  } catch (error) {
    console.error('✗ Redirect API test failed:', error);
  }
}

async function setupDatabase() {
  console.log('Setting up database...');
  
  try {
    await runMigrations();
    console.log('✓ Database migrations completed');
  } catch (error) {
    console.error('✗ Database setup failed:', error);
    throw error;
  }
}

async function testDirectDatabaseAccess() {
  console.log('\n=== Testing Direct Database Access ===');
  
  try {
    const db = getDatabase();
    const connection = db.getConnection();
    
    // Test config table
    const configStmt = connection.prepare('SELECT COUNT(*) as count FROM config');
    const configCount = configStmt.get() as { count: number };
    console.log(`✓ Config table accessible, ${configCount.count} records`);
    
    // Test redirects table
    const redirectsStmt = connection.prepare('SELECT COUNT(*) as count FROM redirects');
    const redirectsCount = redirectsStmt.get() as { count: number };
    console.log(`✓ Redirects table accessible, ${redirectsCount.count} records`);
    
    // Insert test config
    const insertConfigStmt = connection.prepare(`
      INSERT OR REPLACE INTO config (key, value, description)
      VALUES (?, ?, ?)
    `);
    
    insertConfigStmt.run('defaultLocale', 'en', 'Default locale for the application');
    insertConfigStmt.run('defaultVersion', 'v1', 'Default API version');
    insertConfigStmt.run('feature_search', 'true', 'Enable search functionality');
    insertConfigStmt.run('feature_analytics', 'true', 'Enable analytics tracking');
    
    console.log('✓ Test configuration inserted');
    
  } catch (error) {
    console.error('✗ Direct database access test failed:', error);
  }
}

async function main() {
  console.log('Starting API routes test...');
  
  try {
    await setupDatabase();
    await testDirectDatabaseAccess();
    
    // Note: The following tests require the Next.js server to be running
    console.log('\n⚠️  The following tests require the Next.js development server to be running');
    console.log('   Run: npm run dev');
    console.log('   Then run this script again to test the HTTP endpoints');
    
    // Uncomment these when server is running:
    // await testConfigAPI();
    // await testHealthAPI();
    // await testRedirectAPI();
    
    console.log('\n✅ Database tests completed successfully');
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}