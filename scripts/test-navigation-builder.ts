#!/usr/bin/env tsx

/**
 * Test script for navigation builder functionality
 */

import { navigationBuilder } from '../lib/navigation-builder';
import { contentLoader } from '../lib/content-loader';

async function testNavigationBuilder() {
  console.log('🧪 Testing Navigation Builder\n');

  try {
    // Test 1: Get available locales and versions
    console.log('📋 Available Content:');
    const locales = await contentLoader.getAvailableLocales();
    const versions = await contentLoader.getAvailableVersions();
    console.log(`  Locales: ${locales.join(', ')}`);
    console.log(`  Versions: ${versions.join(', ')}\n`);

    // Test 2: Build navigation for each locale/version combination
    for (const locale of locales) {
      for (const version of versions) {
        console.log(`🌐 Navigation Tree for ${locale}/${version}:`);
        const tree = await navigationBuilder.buildNavigationTree(locale, version);
        
        if (tree.length === 0) {
          console.log('  No content found for this locale/version\n');
          continue;
        }

        // Display tree structure
        const displayTree = (items: any[], indent = '  ') => {
          for (const item of items) {
            const badge = item.badge ? ` [${item.badge}]` : '';
            const path = item.path || '(directory)';
            console.log(`${indent}- ${item.title}${badge} -> ${path} (order: ${item.order})`);
            
            if (item.children && item.children.length > 0) {
              displayTree(item.children, indent + '  ');
            }
          }
        };

        displayTree(tree);
        console.log();

        // Test 3: Validate navigation tree
        const errors = navigationBuilder.validateNavigationTree(tree);
        if (errors.length > 0) {
          console.log('❌ Validation Errors:');
          errors.forEach(error => console.log(`  - ${error}`));
        } else {
          console.log('✅ Navigation tree validation passed');
        }

        // Test 3.5: Show navigation statistics
        const stats = navigationBuilder.getNavigationStats(tree);
        console.log(`📊 Navigation Stats: ${stats.totalItems} items, ${stats.maxDepth} max depth, ${stats.directoriesCount} directories, ${stats.pagesCount} pages`);
        console.log();

        // Test 4: Test breadcrumb functionality
        if (tree.length > 0) {
          // Test with a top-level item
          const firstItem = tree[0];
          if (firstItem.path) {
            console.log(`🍞 Breadcrumbs for ${firstItem.path}:`);
            const breadcrumbs = navigationBuilder.getBreadcrumbs(tree, firstItem.path);
            const breadcrumbText = breadcrumbs.map(item => item.title).join(' > ');
            console.log(`  ${breadcrumbText}`);
          }
          
          // Test with a nested item if available
          for (const item of tree) {
            if (item.children && item.children.length > 0) {
              const nestedItem = item.children[0];
              if (nestedItem.path) {
                console.log(`🍞 Breadcrumbs for ${nestedItem.path}:`);
                const breadcrumbs = navigationBuilder.getBreadcrumbs(tree, nestedItem.path);
                const breadcrumbText = breadcrumbs.map(item => item.title).join(' > ');
                console.log(`  ${breadcrumbText}`);
                break;
              }
            }
          }
          console.log();
        }
      }
    }

    // Test 5: Get all navigation trees
    console.log('🗂️  All Navigation Trees:');
    const allTrees = await navigationBuilder.getAllNavigationTrees();
    for (const [locale, versionTrees] of Object.entries(allTrees)) {
      for (const [version, tree] of Object.entries(versionTrees)) {
        console.log(`  ${locale}/${version}: ${tree.length} top-level items`);
      }
    }
    console.log();

    // Test 6: Test finding navigation items
    console.log('🔍 Testing Navigation Item Search:');
    const enV1Tree = await navigationBuilder.buildNavigationTree('en', 'v1');
    if (enV1Tree.length > 0) {
      const firstItem = enV1Tree[0];
      if (firstItem.path) {
        const found = navigationBuilder.findNavigationItem(enV1Tree, firstItem.path);
        if (found) {
          console.log(`  Found item: ${found.title} at ${found.path}`);
        } else {
          console.log('  Item not found');
        }
      }
    }

    console.log('\n✅ Navigation Builder tests completed successfully!');

  } catch (error) {
    console.error('❌ Navigation Builder test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNavigationBuilder();