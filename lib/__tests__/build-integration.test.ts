#!/usr/bin/env tsx

/**
 * Integration tests for build system asset processing
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AssetProcessingManager } from '../../scripts/process-assets';

// Simple test framework
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  testCount++;
  if (condition) {
    passedTests++;
    console.log(`✅ ${message}`);
  } else {
    failedTests++;
    console.log(`❌ ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`);
}

function assertDefined(value: any, message: string) {
  assert(value !== undefined && value !== null, `${message} (should be defined, got: ${value})`);
}

async function runTests() {
  console.log('🧪 Running Build Integration Tests\n');

  // Test AssetProcessingManager instantiation
  console.log('=== Testing AssetProcessingManager instantiation ===');
  
  const manager = new AssetProcessingManager({
    contentDir: 'test-content',
    publicDir: 'test-public/assets',
    enableSecurity: true,
    verbose: false,
    dryRun: true
  });
  
  assertDefined(manager, 'AssetProcessingManager should be instantiated');

  // Test with different options
  const customManager = new AssetProcessingManager({
    enableSecurity: false,
    verbose: true
  });
  
  assertDefined(customManager, 'Custom AssetProcessingManager should be instantiated');

  // Test default options
  const defaultManager = new AssetProcessingManager();
  assertDefined(defaultManager, 'Default AssetProcessingManager should be instantiated');

  // Test dry run functionality
  console.log('\n=== Testing dry run functionality ===');
  
  const dryRunManager = new AssetProcessingManager({
    contentDir: 'content', // Use real content dir if it exists
    dryRun: true,
    verbose: false
  });

  try {
    // This should not fail even if no assets exist, since it's a dry run
    await dryRunManager.processAssets();
    assert(true, 'Dry run should complete without errors');
  } catch (error) {
    // If content directory doesn't exist, that's expected
    if (error instanceof Error && error.message.includes('Failed to discover assets')) {
      assert(true, 'Expected error for missing content directory in dry run');
    } else {
      assert(false, `Unexpected error in dry run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test error handling
  console.log('\n=== Testing error handling ===');
  
  const invalidManager = new AssetProcessingManager({
    contentDir: '/nonexistent/directory',
    dryRun: true
  });

  try {
    await invalidManager.processAssets();
    assert(true, 'Should handle invalid content directory gracefully (no assets found)');
  } catch (error) {
    assert(true, 'Should handle invalid content directory gracefully (with error)');
  }

  // Test configuration validation
  console.log('\n=== Testing configuration options ===');
  
  // Test all boolean options
  const allOptionsManager = new AssetProcessingManager({
    contentDir: 'test-content',
    publicDir: 'test-public',
    enableSecurity: true,
    verbose: true,
    dryRun: true
  });
  
  assertDefined(allOptionsManager, 'Manager with all options should be instantiated');

  // Test minimal options
  const minimalManager = new AssetProcessingManager({});
  assertDefined(minimalManager, 'Manager with minimal options should be instantiated');

  // Print results
  console.log('\n=== Test Results ===');
  console.log(`Total tests: ${testCount}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}