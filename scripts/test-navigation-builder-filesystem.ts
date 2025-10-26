#!/usr/bin/env tsx

/**
 * Test script for NavigationBuilder filesystem-based generation
 * Tests the enhanced NavigationBuilder with filesystem scanning and sidebar configuration
 */

import fs from 'fs';
import path from 'path';
import { NavigationBuilder } from '../lib/navigation-builder';
import { SidebarConfig } from '../lib/content-types';

// Test data setup
const testContentDir = path.join(process.cwd(), '.temp-test-content');

async function setupTestContent() {
  console.log('🔧 Setting up test content structure...');
  
  // Clean up any existing test content
  if (fs.existsSync(testContentDir)) {
    fs.rmSync(testContentDir, { recursive: true, force: true });
  }

  // Create test directory structure
  const structure = {
    'en/v1': {
      'index.mdx': {
        frontmatter: {
          title: 'Home',
          description: 'Home page',
          version: 'v1',
          locale: 'en',
          order: 0,
          sidebar_position: 1
        },
        content: '# Home\n\nWelcome to the documentation.'
      },
      'getting-started.mdx': {
        frontmatter: {
          title: 'Getting Started',
          description: 'Get started guide',
          version: 'v1',
          locale: 'en',
          order: 10,
          sidebar_position: 2,
          sidebar_label: 'Quick Start'
        },
        content: '# Getting Started\n\nLet\'s get started!'
      },
      'api-reference': {
        'overview.mdx': {
          frontmatter: {
            title: 'API Overview',
            description: 'API overview',
            version: 'v1',
            locale: 'en',
            order: 1,
            sidebar_position: 1
          },
          content: '# API Overview\n\nAPI documentation overview.'
        },
        'authentication.mdx': {
          frontmatter: {
            title: 'Authentication',
            description: 'Authentication guide',
            version: 'v1',
            locale: 'en',
            order: 2,
            sidebar_position: 2
          },
          content: '# Authentication\n\nHow to authenticate.'
        },
        'endpoints': {
          'users.mdx': {
            frontmatter: {
              title: 'Users API',
              description: 'Users API endpoints',
              version: 'v1',
              locale: 'en',
              order: 1,
              sidebar_position: 1
            },
            content: '# Users API\n\nUser management endpoints.'
          },
          'orders.mdx': {
            frontmatter: {
              title: 'Orders API',
              description: 'Orders API endpoints',
              version: 'v1',
              locale: 'en',
              order: 2,
              sidebar_position: 2,
              deprecated: true
            },
            content: '# Orders API\n\nOrder management endpoints.'
          }
        }
      },
      'user-guide': {
        '01-introduction.mdx': {
          frontmatter: {
            title: 'Introduction',
            description: 'User guide introduction',
            version: 'v1',
            locale: 'en',
            order: 1,
            sidebar_position: 1
          },
          content: '# Introduction\n\nUser guide introduction.'
        },
        '02-setup.mdx': {
          frontmatter: {
            title: 'Setup',
            description: 'Setup guide',
            version: 'v1',
            locale: 'en',
            order: 2,
            sidebar_position: 2
          },
          content: '# Setup\n\nHow to set up the system.'
        }
      }
    }
  };

  // Create the directory structure and files
  await createTestStructure(testContentDir, structure);
  
  console.log('✅ Test content structure created');
}

async function createTestStructure(basePath: string, structure: any) {
  for (const [key, value] of Object.entries(structure)) {
    const fullPath = path.join(basePath, key);
    
    if (typeof value === 'object' && value !== null && 'frontmatter' in value && 'content' in value) {
      // This is a file
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      const frontmatterStr = Object.entries(value.frontmatter as Record<string, any>)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : v}`)
        .join('\n');
      const fileContent = `---\n${frontmatterStr}\n---\n\n${value.content}`;
      fs.writeFileSync(fullPath, fileContent);
    } else if (typeof value === 'object' && value !== null) {
      // This is a directory
      fs.mkdirSync(fullPath, { recursive: true });
      await createTestStructure(fullPath, value);
    }
  }
}

async function createSidebarConfig() {
  console.log('🔧 Creating sidebar configuration...');
  
  const sidebarConfig: SidebarConfig = {
    order: [
      'index.mdx',
      'getting-started.mdx',
      'user-guide',
      'api-reference'
    ],
    hidden: [
      'api-reference/endpoints/orders.mdx'
    ],
    labels: {
      'api-reference': 'API Documentation',
      'user-guide': 'User Manual',
      'api-reference/endpoints': 'API Endpoints'
    },
    groups: {
      'api-reference': {
        title: 'API Documentation',
        order: 3,
        collapsed: false
      },
      'user-guide': {
        title: 'User Manual',
        order: 2,
        collapsed: true
      }
    }
  };

  const configPath = path.join(testContentDir, 'en', 'v1', '_sidebar.json');
  fs.writeFileSync(configPath, JSON.stringify(sidebarConfig, null, 2));
  
  console.log('✅ Sidebar configuration created');
}

async function testFormatDirectoryName() {
  console.log('\n📝 Testing formatDirectoryName method...');
  
  const builder = new NavigationBuilder(testContentDir);
  
  const testCases = [
    { input: 'api-reference', expected: 'API Reference' },
    { input: 'user-guide', expected: 'User Guide' },
    { input: 'getting_started', expected: 'Getting Started' },
    { input: 'oauth-setup', expected: 'OAuth Setup' },
    { input: 'v1-docs', expected: 'V1 Docs' },
    { input: '01-introduction', expected: 'Introduction' },
    { input: 'faq-section', expected: 'FAQ Section' },
    { input: 'rest-api', expected: 'REST API' },
    { input: 'websocket-guide', expected: 'WebSocket Guide' }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = builder.formatDirectoryName(testCase.input);
    if (result === testCase.expected) {
      console.log(`  ✅ "${testCase.input}" → "${result}"`);
      passed++;
    } else {
      console.log(`  ❌ "${testCase.input}" → "${result}" (expected "${testCase.expected}")`);
      failed++;
    }
  }

  console.log(`\n📊 formatDirectoryName tests: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function testFilesystemNavigation() {
  console.log('\n📝 Testing buildFilesystemNavigation method...');
  
  const builder = new NavigationBuilder(testContentDir);
  
  try {
    // First test without sidebar config by temporarily removing it
    const sidebarConfigPath = path.join(testContentDir, 'en', 'v1', '_sidebar.json');
    const sidebarConfigBackup = fs.readFileSync(sidebarConfigPath, 'utf-8');
    fs.unlinkSync(sidebarConfigPath);
    
    const navigationWithoutConfig = await builder.buildFilesystemNavigation('en', 'v1');
    
    // Restore sidebar config
    fs.writeFileSync(sidebarConfigPath, sidebarConfigBackup);
    
    // Test with sidebar config
    const navigation = await builder.buildFilesystemNavigation('en', 'v1');
    
    console.log('📋 Generated navigation structure:');
    console.log(JSON.stringify(navigation, null, 2));
    
    // Test basic structure
    const tests = [
      {
        name: 'Should have root-level items',
        test: () => navigation.length > 0
      },
      {
        name: 'Should have Home page first (sidebar_position: 1)',
        test: () => navigation.find(item => item.title === 'Home' && item.order === 1) !== undefined
      },
      {
        name: 'Should use sidebar_label for Getting Started',
        test: () => navigation.find(item => item.title === 'Quick Start') !== undefined
      },
      {
        name: 'Should have API Reference directory (with custom label)',
        test: () => navigation.find(item => item.title === 'API Documentation' && item.isDirectory) !== undefined
      },
      {
        name: 'Should have User Guide directory (with custom label)',
        test: () => navigation.find(item => item.title === 'User Manual' && item.isDirectory) !== undefined
      },
      {
        name: 'Should handle numbered files correctly',
        test: () => {
          const userGuide = navigation.find(item => item.title === 'User Manual');
          return userGuide?.children?.find(child => child.title === 'Introduction') !== undefined;
        }
      },
      {
        name: 'Should mark deprecated items (when not hidden)',
        test: () => {
          // Test with navigation without config to see deprecated items
          const apiRef = navigationWithoutConfig.find(item => item.title === 'API Reference');
          const endpoints = apiRef?.children?.find(child => child.title === 'Endpoints');
          return endpoints?.children?.find(child => child.badge === 'deprecated') !== undefined;
        }
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        if (test.test()) {
          console.log(`  ✅ ${test.name}`);
          passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} (error: ${error})`);
        failed++;
      }
    }

    console.log(`\n📊 Filesystem navigation tests: ${passed} passed, ${failed} failed`);
    return failed === 0;
    
  } catch (error) {
    console.error('❌ Failed to build filesystem navigation:', error);
    return false;
  }
}

async function testSidebarConfiguration() {
  console.log('\n📝 Testing sidebar configuration...');
  
  const builder = new NavigationBuilder(testContentDir);
  
  try {
    // Ensure sidebar config exists
    const sidebarConfigPath = path.join(testContentDir, 'en', 'v1', '_sidebar.json');
    if (!fs.existsSync(sidebarConfigPath)) {
      await createSidebarConfig(); // Recreate if missing
    }
    
    // Test loading sidebar config
    const config = await builder.loadSidebarConfig('en', 'v1');
    
    if (!config) {
      console.log('❌ Failed to load sidebar configuration');
      return false;
    }

    console.log('✅ Sidebar configuration loaded successfully');
    console.log('📋 Configuration:', JSON.stringify(config, null, 2));

    // Test applying configuration
    const baseNavigation = await builder.buildFilesystemNavigation('en', 'v1');
    
    console.log('\n📋 Navigation with sidebar config applied:');
    console.log(JSON.stringify(baseNavigation, null, 2));

    // Test configuration effects
    const tests = [
      {
        name: 'Should apply custom labels',
        test: () => baseNavigation.find(item => item.title === 'API Documentation') !== undefined
      },
      {
        name: 'Should hide specified items',
        test: () => {
          const apiRef = baseNavigation.find(item => item.title === 'API Documentation');
          const endpoints = apiRef?.children?.find(child => child.title === 'API Endpoints');
          return !endpoints?.children?.find(child => child.title === 'Orders API');
        }
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        if (test.test()) {
          console.log(`  ✅ ${test.name}`);
          passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} (error: ${error})`);
        failed++;
      }
    }

    console.log(`\n📊 Sidebar configuration tests: ${passed} passed, ${failed} failed`);
    return failed === 0;
    
  } catch (error) {
    console.error('❌ Failed to test sidebar configuration:', error);
    return false;
  }
}

async function testNavigationStats() {
  console.log('\n📝 Testing navigation statistics...');
  
  const builder = new NavigationBuilder(testContentDir);
  
  try {
    const navigation = await builder.buildFilesystemNavigation('en', 'v1');
    const stats = builder.getNavigationStats(navigation);
    
    console.log('📊 Navigation statistics:', stats);
    
    const tests = [
      {
        name: 'Should count total items correctly',
        test: () => stats.totalItems > 0
      },
      {
        name: 'Should calculate max depth',
        test: () => stats.maxDepth >= 2 // We have nested directories
      },
      {
        name: 'Should count directories and pages',
        test: () => stats.directoriesCount > 0 && stats.pagesCount > 0
      }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        if (test.test()) {
          console.log(`  ✅ ${test.name}`);
          passed++;
        } else {
          console.log(`  ❌ ${test.name}`);
          failed++;
        }
      } catch (error) {
        console.log(`  ❌ ${test.name} (error: ${error})`);
        failed++;
      }
    }

    console.log(`\n📊 Navigation statistics tests: ${passed} passed, ${failed} failed`);
    return failed === 0;
    
  } catch (error) {
    console.error('❌ Failed to test navigation statistics:', error);
    return false;
  }
}

async function testNavigationValidation() {
  console.log('\n📝 Testing navigation validation...');
  
  const builder = new NavigationBuilder(testContentDir);
  
  try {
    const navigation = await builder.buildFilesystemNavigation('en', 'v1');
    const errors = builder.validateNavigationTree(navigation);
    
    console.log(`📋 Validation errors found: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach(error => console.log(`  ⚠️ ${error}`));
    }

    const isValid = errors.length === 0;
    console.log(`${isValid ? '✅' : '❌'} Navigation validation: ${isValid ? 'passed' : 'failed'}`);
    
    return isValid;
    
  } catch (error) {
    console.error('❌ Failed to validate navigation:', error);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test content...');
  
  if (fs.existsSync(testContentDir)) {
    fs.rmSync(testContentDir, { recursive: true, force: true });
  }
  
  console.log('✅ Cleanup completed');
}

async function runAllTests() {
  console.log('🚀 Starting NavigationBuilder filesystem tests...\n');
  
  try {
    // Setup
    await setupTestContent();
    await createSidebarConfig();
    
    // Run tests
    const results = await Promise.all([
      testFormatDirectoryName(),
      testFilesystemNavigation(),
      testSidebarConfiguration(),
      testNavigationStats(),
      testNavigationValidation()
    ]);
    
    const passed = results.filter(Boolean).length;
    const total = results.length;
    
    console.log(`\n🎯 Overall Results: ${passed}/${total} test suites passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('❌ Some tests failed');
    }
    
    return passed === total;
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    return false;
  } finally {
    await cleanup();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

export { runAllTests };