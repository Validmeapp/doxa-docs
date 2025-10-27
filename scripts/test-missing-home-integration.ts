#!/usr/bin/env tsx

/**
 * Integration test for MissingHomePage component
 * Tests the complete integration with ContentLoader and docs pages
 */

import fs from 'fs';
import path from 'path';
import { contentLoader } from '../lib/content-loader';

console.log('🧪 Testing MissingHomePage Integration...\n');

async function runIntegrationTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Verify ContentLoader has the required methods
  console.log('1. Testing ContentLoader methods...');
  try {
    if (typeof contentLoader.getHomeDocument !== 'function') {
      throw new Error('getHomeDocument method not found');
    }
    if (typeof contentLoader.findIndexFile !== 'function') {
      throw new Error('findIndexFile method not found');
    }
    if (typeof contentLoader.generateMissingHomeContent !== 'function') {
      throw new Error('generateMissingHomeContent method not found');
    }
    console.log('   ✅ All required ContentLoader methods exist');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ ContentLoader methods test failed: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }

  // Test 2: Test with existing index.mdx file
  console.log('2. Testing with existing index.mdx file...');
  try {
    const homeContent = await contentLoader.getHomeDocument('en', 'v1');
    if (!homeContent) {
      throw new Error('getHomeDocument returned null for existing index.mdx');
    }
    if (homeContent.frontmatter.title === 'Missing Home Document') {
      throw new Error('getHomeDocument returned fallback content for existing index.mdx');
    }
    console.log('   ✅ Existing index.mdx file loaded correctly');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Existing index.mdx test failed: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }

  // Test 3: Test with missing index.mdx file (temporarily move it)
  console.log('3. Testing with missing index.mdx file...');
  const indexPath = path.join(process.cwd(), 'content/en/docs/v1/index.mdx');
  const backupPath = path.join(process.cwd(), 'content/en/docs/v1/index.mdx.test-backup');
  
  try {
    // Backup the index file
    if (fs.existsSync(indexPath)) {
      fs.renameSync(indexPath, backupPath);
    }

    const homeContent = await contentLoader.getHomeDocument('en', 'v1');
    if (!homeContent) {
      throw new Error('getHomeDocument returned null for missing index.mdx');
    }
    if (homeContent.frontmatter.title !== 'Missing Home Document') {
      throw new Error('getHomeDocument did not return fallback content for missing index.mdx');
    }
    if (!homeContent.content.includes('Missing Home Document')) {
      throw new Error('Fallback content does not contain expected text');
    }
    console.log('   ✅ Missing index.mdx file handled correctly with fallback');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Missing index.mdx test failed: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  } finally {
    // Restore the index file
    if (fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, indexPath);
    }
  }

  // Test 4: Test fallback content generation
  console.log('4. Testing fallback content generation...');
  try {
    const fallbackContent = contentLoader.generateMissingHomeContent('es', 'v2');
    if (!fallbackContent.includes('content/es/v2/index.mdx')) {
      throw new Error('Fallback content does not include correct file path');
    }
    if (!fallbackContent.includes('locale: "es"')) {
      throw new Error('Fallback content does not include correct locale');
    }
    if (!fallbackContent.includes('version: "v2"')) {
      throw new Error('Fallback content does not include correct version');
    }
    console.log('   ✅ Fallback content generation works correctly');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Fallback content generation test failed: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }

  // Test 5: Test available content listing
  console.log('5. Testing available content listing...');
  try {
    const availableContent = await contentLoader.getAllContentSlugs('en', 'v1');
    if (!Array.isArray(availableContent)) {
      throw new Error('getAllContentSlugs did not return an array');
    }
    if (availableContent.length === 0) {
      throw new Error('getAllContentSlugs returned empty array');
    }
    // Should include some expected content
    const hasExpectedContent = availableContent.some(slug => 
      slug.includes('developer-guide') || slug.includes('user-guide')
    );
    if (!hasExpectedContent) {
      throw new Error('getAllContentSlugs did not return expected content');
    }
    console.log(`   ✅ Available content listing works (found ${availableContent.length} items)`);
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Available content listing test failed: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }

  // Test 6: Test component import
  console.log('6. Testing MissingHomePage component import...');
  try {
    const { MissingHomePage } = await import('../components/missing-home-page');
    if (typeof MissingHomePage !== 'function') {
      throw new Error('MissingHomePage is not a function');
    }
    console.log('   ✅ MissingHomePage component imports correctly');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Component import test failed: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }

  // Test 7: Test getContentBySlug with empty slug (home document)
  console.log('7. Testing getContentBySlug with empty slug...');
  try {
    const homeContent = await contentLoader.getContentBySlug('en', 'v1', '');
    if (!homeContent) {
      throw new Error('getContentBySlug returned null for empty slug');
    }
    console.log('   ✅ getContentBySlug handles empty slug correctly');
    testsPassed++;
  } catch (error) {
    console.log(`   ❌ Empty slug test failed: ${error instanceof Error ? error.message : String(error)}`);
    testsFailed++;
  }

  // Summary
  console.log(`\n📊 Integration Test Results:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 All integration tests passed! MissingHomePage component is fully integrated.');
  } else {
    console.log('\n⚠️  Some integration tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run the tests
runIntegrationTests().catch((error) => {
  console.error('\n💥 Integration test runner failed:', error);
  process.exit(1);
});