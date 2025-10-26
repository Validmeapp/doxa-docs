#!/usr/bin/env tsx

/**
 * Test script for missing home document routing functionality
 * Tests fallback behavior when index.mdx is missing
 */

import fs from 'fs';
import path from 'path';
import { contentLoader } from '../lib/content-loader';
import { type Locale } from '../lib/locale-config';

async function testMissingHomeRouting() {
  console.log('🧪 Testing missing home document routing functionality...\n');

  const testLocale: Locale = 'en';
  const testVersion = 'v1';
  const indexPath = path.join(process.cwd(), 'content', testLocale, testVersion, 'index.mdx');
  const backupPath = indexPath + '.backup';

  try {
    // Backup the existing index file if it exists
    if (fs.existsSync(indexPath)) {
      console.log('📁 Backing up existing index.mdx file...');
      fs.copyFileSync(indexPath, backupPath);
      fs.unlinkSync(indexPath);
      console.log('✓ Index file temporarily removed\n');
    }

    // Test 1: Home document loading with missing index
    console.log('📍 Testing missing home document behavior...');
    const homeContent = await contentLoader.getHomeDocument(testLocale, testVersion);
    
    if (homeContent) {
      console.log(`  ✓ Home document loaded: "${homeContent.frontmatter.title}"`);
      console.log(`  ✓ Is missing home: ${homeContent.frontmatter.title === 'Missing Home Document'}`);
      console.log(`  ✓ Content length: ${homeContent.content.length} characters`);
      
      if (homeContent.frontmatter.title === 'Missing Home Document') {
        console.log('  ✓ Fallback content generated correctly');
      } else {
        console.log('  ❌ Expected fallback content but got actual content');
      }
    } else {
      console.log('  ❌ Home document returned null (unexpected)');
    }

    // Test 2: Index file detection should return null
    console.log('\n📍 Testing index file detection with missing file...');
    const indexFile = await contentLoader.findIndexFile(testLocale, testVersion);
    
    if (indexFile === null) {
      console.log('  ✓ Index file correctly detected as missing');
    } else {
      console.log(`  ❌ Index file detection returned: ${indexFile} (expected null)`);
    }

    // Test 3: Empty slug handling should still work
    console.log('\n📍 Testing empty slug handling with missing index...');
    const emptySlugContent = await contentLoader.getContentBySlug(testLocale, testVersion, '');
    
    if (emptySlugContent && emptySlugContent.frontmatter.title === 'Missing Home Document') {
      console.log('  ✓ Empty slug returns fallback content correctly');
    } else if (emptySlugContent) {
      console.log(`  ❌ Empty slug returned: "${emptySlugContent.frontmatter.title}" (expected fallback)`);
    } else {
      console.log('  ❌ Empty slug returned null (unexpected)');
    }

    // Test 4: Available content should still be accessible
    console.log('\n📍 Testing available content loading with missing home...');
    const availableContent = await contentLoader.getAllContentSlugs(testLocale, testVersion);
    console.log(`  ✓ Available content items: ${availableContent.length}`);
    
    if (availableContent.length > 0) {
      console.log(`  ✓ Sample content: ${availableContent.slice(0, 3).join(', ')}`);
      
      // Test loading a specific piece of content
      const firstSlug = availableContent[0];
      const specificContent = await contentLoader.getContentBySlug(testLocale, testVersion, firstSlug);
      
      if (specificContent && specificContent.frontmatter.title !== 'Missing Home Document') {
        console.log(`  ✓ Specific content still loads: "${specificContent.frontmatter.title}"`);
      } else {
        console.log(`  ❌ Failed to load specific content for slug "${firstSlug}"`);
      }
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    // Restore the backup if it exists
    if (fs.existsSync(backupPath)) {
      console.log('\n🔄 Restoring original index.mdx file...');
      fs.copyFileSync(backupPath, indexPath);
      fs.unlinkSync(backupPath);
      console.log('✓ Index file restored');
    }
  }

  console.log('\n✅ Missing home document routing tests completed!');
}

// Run the test
testMissingHomeRouting().catch(console.error);