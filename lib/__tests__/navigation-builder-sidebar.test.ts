#!/usr/bin/env tsx

/**
 * Unit tests for NavigationBuilder sidebar configuration functionality
 */

import { NavigationBuilder } from '../navigation-builder';
import { SidebarConfig, NavigationTree, NavigationItem } from '../content-types';

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

function assertArrayLength(array: any[], expectedLength: number, message: string) {
  assert(Array.isArray(array) && array.length === expectedLength, 
    `${message} (expected length: ${expectedLength}, actual: ${array?.length || 'not array'})`);
}

function assertContains(array: any[], item: any, message: string) {
  assert(Array.isArray(array) && array.includes(item), 
    `${message} (array should contain: ${item})`);
}

function assertUndefined(value: any, message: string) {
  assert(value === undefined, `${message} (should be undefined, got: ${value})`);
}

async function runTests() {
  console.log('🧪 Running NavigationBuilder Sidebar Configuration Tests\n');

  const navigationBuilder = new NavigationBuilder();

  // Test validateSidebarConfig
  console.log('=== Testing validateSidebarConfig ===');
  
  // Access private method for testing
  const validateConfig = (config: any) => {
    return (navigationBuilder as any).validateSidebarConfig(config);
  };

  // Test valid configuration
  const validConfig: SidebarConfig = {
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

  const validErrors = validateConfig(validConfig);
  assertArrayLength(validErrors, 0, 'Valid configuration should have no errors');

  // Test invalid configurations
  const nullErrors = validateConfig(null);
  assertContains(nullErrors, 'Configuration must be an object', 'Null config should be rejected');

  const stringErrors = validateConfig('string');
  assertContains(stringErrors, 'Configuration must be an object', 'String config should be rejected');

  const orderErrors = validateConfig({ order: 'not-array' });
  assertContains(orderErrors, 'order must be an array of strings', 'Invalid order should be rejected');

  const orderTypeErrors = validateConfig({ order: [1, 2, 3] });
  assertContains(orderTypeErrors, 'order array must contain only strings', 'Non-string order items should be rejected');

  const hiddenErrors = validateConfig({ hidden: 'not-array' });
  assertContains(hiddenErrors, 'hidden must be an array of strings', 'Invalid hidden should be rejected');

  const labelsErrors = validateConfig({ labels: 'not-object' });
  assertContains(labelsErrors, 'labels must be an object with string keys and values', 'Invalid labels should be rejected');

  const groupsErrors = validateConfig({ groups: 'not-object' });
  assertContains(groupsErrors, 'groups must be an object', 'Invalid groups should be rejected');

  // Test applySidebarConfig
  console.log('\n=== Testing applySidebarConfig ===');

  const mockTree: NavigationTree = [
    {
      title: 'Getting Started',
      path: '',
      order: 1,
      isDirectory: true,
      originalPath: 'getting-started',
      customLabel: false,
      children: [
        {
          title: 'Installation',
          path: '/v1/getting-started/installation',
          order: 1,
          isDirectory: false,
          originalPath: 'getting-started/installation.mdx',
          customLabel: false
        }
      ]
    },
    {
      title: 'API Reference',
      path: '',
      order: 2,
      isDirectory: true,
      originalPath: 'api-reference',
      customLabel: false,
      children: []
    },
    {
      title: 'Best Practices',
      path: '/v1/best-practices',
      order: 3,
      isDirectory: false,
      originalPath: 'best-practices.mdx',
      customLabel: false
    }
  ];

  // Test filtering hidden items
  const hiddenConfig: SidebarConfig = {
    hidden: ['best-practices.mdx']
  };

  const filteredResult = navigationBuilder.applySidebarConfig(mockTree, hiddenConfig);
  assertArrayLength(filteredResult, 2, 'Hidden items should be filtered out');
  
  const hiddenItem = filteredResult.find(item => item.title === 'Best Practices');
  assertUndefined(hiddenItem, 'Hidden item should not be present');

  // Test custom labels
  const labelsConfig: SidebarConfig = {
    labels: {
      'getting-started': 'Getting Started Guide',
      'api-reference': 'API Documentation'
    }
  };

  const labeledResult = navigationBuilder.applySidebarConfig(mockTree, labelsConfig);
  assertEqual(labeledResult[0].title, 'Getting Started Guide', 'Custom label should be applied to first item');
  assertEqual(labeledResult[0].customLabel, true, 'Custom label flag should be set');
  assertEqual(labeledResult[1].title, 'API Documentation', 'Custom label should be applied to second item');

  // Test custom ordering
  const orderConfig: SidebarConfig = {
    order: ['api-reference', 'getting-started', 'best-practices.mdx']
  };

  const orderedResult = navigationBuilder.applySidebarConfig(mockTree, orderConfig);
  assertEqual(orderedResult[0].title, 'API Reference', 'Items should be reordered according to config');
  assertEqual(orderedResult[1].title, 'Getting Started', 'Second item should be Getting Started');
  assertEqual(orderedResult[2].title, 'Best Practices', 'Third item should be Best Practices');

  // Test group configurations
  const groupConfig: SidebarConfig = {
    groups: {
      'getting-started': {
        title: 'Getting Started Section',
        order: 10,
        collapsed: false
      }
    }
  };

  const groupResult = navigationBuilder.applySidebarConfig(mockTree, groupConfig);
  const gettingStartedItem = groupResult.find(item => item.originalPath === 'getting-started');
  assertEqual(gettingStartedItem?.title, 'Getting Started Section', 'Group title should be applied');
  assertEqual(gettingStartedItem?.order, 10, 'Group order should be applied');

  // Test combined configuration
  const combinedConfig: SidebarConfig = {
    order: ['api-reference', 'getting-started'],
    hidden: ['best-practices.mdx'],
    labels: {
      'api-reference': 'API Documentation'
    },
    groups: {
      'getting-started': {
        title: 'Getting Started Section',
        order: 5
      }
    }
  };

  const combinedResult = navigationBuilder.applySidebarConfig(mockTree, combinedConfig);
  assertArrayLength(combinedResult, 2, 'Combined config should filter and reorder items');
  assertEqual(combinedResult[0].title, 'API Documentation', 'First item should have custom label');
  assertEqual(combinedResult[1].title, 'Getting Started Section', 'Second item should have group title');
  assertEqual(combinedResult[0].customLabel, true, 'Custom label flag should be set');

  // Test filterHiddenItems
  console.log('\n=== Testing filterHiddenItems ===');
  
  const filterHiddenItems = (tree: NavigationTree, hiddenPaths: string[]) => {
    return (navigationBuilder as any).filterHiddenItems(tree, hiddenPaths);
  };

  const testTree: NavigationTree = [
    { title: 'Item 1', path: '/item1', order: 1, originalPath: 'item1.mdx' },
    { title: 'Item 2', path: '/item2', order: 2, originalPath: 'item2.mdx' }
  ];

  const filteredTree = filterHiddenItems(testTree, ['item1.mdx']);
  assertArrayLength(filteredTree, 1, 'Should filter out hidden items');
  assertEqual(filteredTree[0].title, 'Item 2', 'Remaining item should be Item 2');

  // Test path variants
  const variantTree: NavigationTree = [
    { title: 'Item 1', path: '/item1', order: 1, originalPath: 'dir/item1.mdx' },
    { title: 'Item 2', path: '/item2', order: 2, originalPath: 'item2.mdx' }
  ];

  const variantFiltered = filterHiddenItems(variantTree, ['item1.mdx']);
  assertArrayLength(variantFiltered, 1, 'Should filter by basename match');
  assertEqual(variantFiltered[0].title, 'Item 2', 'Should keep non-matching item');

  // Test applyCustomLabels
  console.log('\n=== Testing applyCustomLabels ===');
  
  const applyCustomLabels = (tree: NavigationTree, labels: Record<string, string>) => {
    return (navigationBuilder as any).applyCustomLabels(tree, labels);
  };

  const labelTree: NavigationTree = [
    { title: 'Original Title', path: '/item', order: 1, originalPath: 'item.mdx', customLabel: false }
  ];

  const labeledTree = applyCustomLabels(labelTree, { 'item.mdx': 'Custom Title' });
  assertEqual(labeledTree[0].title, 'Custom Title', 'Custom label should be applied');
  assertEqual(labeledTree[0].customLabel, true, 'Custom label flag should be set');

  // Test directory labels
  const dirTree: NavigationTree = [
    { 
      title: 'Directory', 
      path: '', 
      order: 1, 
      originalPath: 'some-dir', 
      isDirectory: true,
      customLabel: false 
    }
  ];

  const dirLabeledTree = applyCustomLabels(dirTree, { 'some-dir': 'Custom Directory' });
  assertEqual(dirLabeledTree[0].title, 'Custom Directory', 'Directory label should be applied');
  assertEqual(dirLabeledTree[0].customLabel, true, 'Directory custom label flag should be set');

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