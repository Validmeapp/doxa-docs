#!/usr/bin/env tsx

/**
 * Test script for sidebar configuration functionality
 */

import fs from 'fs';
import path from 'path';
import { NavigationBuilder } from '../lib/navigation-builder';
import { SidebarConfig, NavigationTree } from '../lib/content-types';

// Test data setup
const testContentDir = path.join(process.cwd(), '.temp-test-sidebar');
const testLocale = 'en';
const testVersion = 'v1';

async function setupTestContent() {
  console.log('Setting up test content...');
  
  // Create test directory structure
  const contentPath = path.join(testContentDir, testLocale, testVersion);
  fs.mkdirSync(contentPath, { recursive: true });
  
  // Create test directories
  fs.mkdirSync(path.join(contentPath, 'getting-started'), { recursive: true });
  fs.mkdirSync(path.join(contentPath, 'api-reference'), { recursive: true });
  fs.mkdirSync(path.join(contentPath, 'guides'), { recursive: true });
  
  // Create test MDX files
  const testFiles = [
    {
      path: 'index.mdx',
      content: `---
title: "Home"
description: "Welcome to the docs"
version: "v1"
locale: "en"
order: 0
---

# Welcome to the Documentation
`
    },
    {
      path: 'getting-started/installation.mdx',
      content: `---
title: "Installation"
description: "How to install"
version: "v1"
locale: "en"
order: 1
sidebar_position: 1
---

# Installation Guide
`
    },
    {
      path: 'getting-started/quick-start.mdx',
      content: `---
title: "Quick Start"
description: "Get started quickly"
version: "v1"
locale: "en"
order: 2
sidebar_position: 2
sidebar_label: "Quick Start Guide"
---

# Quick Start
`
    },
    {
      path: 'api-reference/authentication.mdx',
      content: `---
title: "Authentication"
description: "API authentication"
version: "v1"
locale: "en"
order: 10
---

# Authentication
`
    },
    {
      path: 'api-reference/endpoints.mdx',
      content: `---
title: "API Endpoints"
description: "Available endpoints"
version: "v1"
locale: "en"
order: 11
---

# API Endpoints
`
    },
    {
      path: 'guides/best-practices.mdx',
      content: `---
title: "Best Practices"
description: "Development best practices"
version: "v1"
locale: "en"
order: 20
deprecated: true
---

# Best Practices
`
    }
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(contentPath, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content);
  }
  
  console.log('Test content created successfully');
}

async function cleanupTestContent() {
  if (fs.existsSync(testContentDir)) {
    fs.rmSync(testContentDir, { recursive: true, force: true });
  }
}

async function testLoadSidebarConfig() {
  console.log('\n=== Testing loadSidebarConfig ===');
  
  const navigationBuilder = new NavigationBuilder(testContentDir);
  const contentPath = path.join(testContentDir, testLocale, testVersion);
  
  // Test 1: No config file
  console.log('Test 1: No config file');
  let config = await navigationBuilder.loadSidebarConfig(testLocale, testVersion);
  console.log('Result:', config === null ? 'null (expected)' : 'unexpected result');
  
  // Test 2: Valid JSON config
  console.log('\nTest 2: Valid JSON config');
  const validConfig: SidebarConfig = {
    order: ['getting-started/installation.mdx', 'getting-started/quick-start.mdx'],
    hidden: ['guides/best-practices.mdx'],
    labels: {
      'getting-started': 'Getting Started',
      'api-reference': 'API Reference'
    },
    groups: {
      'getting-started': {
        title: 'Getting Started',
        order: 1,
        collapsed: false
      }
    }
  };
  
  const configPath = path.join(contentPath, '_sidebar.json');
  fs.writeFileSync(configPath, JSON.stringify(validConfig, null, 2));
  
  config = await navigationBuilder.loadSidebarConfig(testLocale, testVersion);
  console.log('Config loaded:', config !== null);
  console.log('Order array:', config?.order?.length || 0, 'items');
  console.log('Hidden array:', config?.hidden?.length || 0, 'items');
  console.log('Labels object:', Object.keys(config?.labels || {}).length, 'entries');
  console.log('Groups object:', Object.keys(config?.groups || {}).length, 'entries');
  
  // Test 3: Invalid JSON config
  console.log('\nTest 3: Invalid JSON config');
  const invalidConfig = {
    order: 'not-an-array', // Should be array
    hidden: ['valid'],
    labels: 123, // Should be object
    groups: {
      'test': {
        title: 123, // Should be string
        order: 'not-a-number' // Should be number
      }
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));
  config = await navigationBuilder.loadSidebarConfig(testLocale, testVersion);
  console.log('Invalid config result:', config === null ? 'null (expected)' : 'unexpected result');
  
  // Test 4: Malformed JSON
  console.log('\nTest 4: Malformed JSON');
  fs.writeFileSync(configPath, '{ invalid json }');
  config = await navigationBuilder.loadSidebarConfig(testLocale, testVersion);
  console.log('Malformed JSON result:', config === null ? 'null (expected)' : 'unexpected result');
  
  // Clean up
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

async function testApplySidebarConfig() {
  console.log('\n=== Testing applySidebarConfig ===');
  
  const navigationBuilder = new NavigationBuilder(testContentDir);
  
  // First build the filesystem navigation
  const originalTree = await navigationBuilder.buildFilesystemNavigation(testLocale, testVersion);
  console.log('Original tree items:', originalTree.length);
  
  // Test configuration
  const config: SidebarConfig = {
    order: ['getting-started', 'api-reference', 'guides'],
    hidden: ['guides/best-practices.mdx'],
    labels: {
      'getting-started': 'Getting Started Guide',
      'api-reference': 'API Documentation',
      'guides': 'User Guides'
    },
    groups: {
      'getting-started': {
        title: 'Getting Started Section',
        order: 1,
        collapsed: false
      }
    }
  };
  
  // Apply configuration
  const configuredTree = navigationBuilder.applySidebarConfig(originalTree, config);
  console.log('Configured tree items:', configuredTree.length);
  
  // Test hidden items
  const hasHiddenItem = findItemInTree(configuredTree, 'Best Practices');
  console.log('Hidden item filtered out:', !hasHiddenItem);
  
  // Test custom labels
  const gettingStartedItem = findItemInTree(configuredTree, 'Getting Started Guide');
  const apiDocItem = findItemInTree(configuredTree, 'API Documentation');
  const userGuidesItem = findItemInTree(configuredTree, 'User Guides');
  console.log('Custom labels applied:', !!gettingStartedItem && !!apiDocItem && !!userGuidesItem);
  
  // Test custom ordering
  const firstItem = configuredTree[0];
  console.log('First item after ordering:', firstItem?.title);
  
  console.log('\nTree structure:');
  printTree(configuredTree, 0);
}

function findItemInTree(tree: NavigationTree, title: string): boolean {
  for (const item of tree) {
    if (item.title === title) {
      return true;
    }
    if (item.children && findItemInTree(item.children, title)) {
      return true;
    }
  }
  return false;
}

function printTree(tree: NavigationTree, depth: number = 0) {
  const indent = '  '.repeat(depth);
  for (const item of tree) {
    console.log(`${indent}- ${item.title} (order: ${item.order})`);
    if (item.children) {
      printTree(item.children, depth + 1);
    }
  }
}

async function testValidation() {
  console.log('\n=== Testing Configuration Validation ===');
  
  const navigationBuilder = new NavigationBuilder(testContentDir);
  
  // Access private method through type assertion for testing
  const validateConfig = (navigationBuilder as any).validateSidebarConfig.bind(navigationBuilder);
  
  // Test valid config
  const validConfig = {
    order: ['item1', 'item2'],
    hidden: ['item3'],
    labels: { 'key': 'value' },
    groups: {
      'group1': {
        title: 'Group 1',
        order: 1,
        collapsed: false
      }
    }
  };
  
  let errors = validateConfig(validConfig);
  console.log('Valid config errors:', errors.length, '(expected: 0)');
  
  // Test invalid configs
  const invalidConfigs = [
    { name: 'null config', config: null },
    { name: 'non-object config', config: 'string' },
    { name: 'order not array', config: { order: 'not-array' } },
    { name: 'order with non-strings', config: { order: [1, 2, 3] } },
    { name: 'hidden not array', config: { hidden: 'not-array' } },
    { name: 'labels not object', config: { labels: 'not-object' } },
    { name: 'labels with non-string values', config: { labels: { key: 123 } } },
    { name: 'groups not object', config: { groups: 'not-object' } },
    { name: 'group with invalid title', config: { groups: { group1: { title: 123 } } } },
    { name: 'group with invalid order', config: { groups: { group1: { order: 'not-number' } } } },
    { name: 'group with invalid collapsed', config: { groups: { group1: { collapsed: 'not-boolean' } } } }
  ];
  
  for (const { name, config } of invalidConfigs) {
    errors = validateConfig(config);
    console.log(`${name}: ${errors.length} errors (expected: > 0)`);
  }
}

async function testIntegration() {
  console.log('\n=== Testing Integration ===');
  
  const navigationBuilder = new NavigationBuilder(testContentDir);
  const contentPath = path.join(testContentDir, testLocale, testVersion);
  
  // Create a comprehensive sidebar config
  const config: SidebarConfig = {
    order: [
      'index.mdx',
      'getting-started',
      'api-reference',
      'guides'
    ],
    hidden: ['guides/best-practices.mdx'],
    labels: {
      'getting-started': 'Getting Started',
      'api-reference': 'API Reference',
      'guides': 'User Guides'
    },
    groups: {
      'getting-started': {
        title: 'Getting Started',
        order: 1,
        collapsed: false
      },
      'api-reference': {
        title: 'API Documentation',
        order: 2,
        collapsed: true
      }
    }
  };
  
  const configPath = path.join(contentPath, '_sidebar.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  // Build navigation with config
  const tree = await navigationBuilder.buildNavigationTree(testLocale, testVersion);
  
  console.log('Final navigation tree:');
  printTree(tree);
  
  // Validate the tree
  const errors = navigationBuilder.validateNavigationTree(tree);
  console.log('\nNavigation validation errors:', errors.length);
  if (errors.length > 0) {
    errors.forEach(error => console.log('  -', error));
  }
  
  // Get stats
  const stats = navigationBuilder.getNavigationStats(tree);
  console.log('\nNavigation stats:');
  console.log('  Total items:', stats.totalItems);
  console.log('  Max depth:', stats.maxDepth);
  console.log('  Directories:', stats.directoriesCount);
  console.log('  Pages:', stats.pagesCount);
  
  // Clean up
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

async function runTests() {
  try {
    await setupTestContent();
    
    await testLoadSidebarConfig();
    await testApplySidebarConfig();
    await testValidation();
    await testIntegration();
    
    console.log('\n✅ All sidebar configuration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await cleanupTestContent();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}