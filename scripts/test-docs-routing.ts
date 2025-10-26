#!/usr/bin/env tsx

/**
 * Test script for docs page routing functionality
 * Tests home document handling and routing behavior
 */

import { contentLoader } from '../lib/content-loader';
import { type Locale } from '../lib/locale-config';

async function testDocsRouting() {
  console.log('🧪 Testing docs page routing functionality...\n');

  const testLocales: Locale[] = ['en', 'es'];
  const testVersion = 'v1';

  for (const locale of testLocales) {
    console.log(`📍 Testing locale: ${locale}`);
    
    try {
      // Test 1: Home document loading
      console.log('  ✅ Testing home document loading...');
      const homeContent = await contentLoader.getHomeDocument(locale, testVersion);
      
      if (homeContent) {
        console.log(`    ✓ Home document loaded: "${homeContent.frontmatter.title}"`);
        console.log(`    ✓ Is missing home: ${homeContent.frontmatter.title === 'Missing Home Document'}`);
        console.log(`    ✓ Content length: ${homeContent.content.length} characters`);
      } else {
        console.log('    ❌ Home document returned null (unexpected)');
      }

      // Test 2: Available content loading
      console.log('  ✅ Testing available content loading...');
      const availableContent = await contentLoader.getAllContentSlugs(locale, testVersion);
      console.log(`    ✓ Available content items: ${availableContent.length}`);
      
      if (availableContent.length > 0) {
        console.log(`    ✓ Sample content: ${availableContent.slice(0, 3).join(', ')}`);
      }

      // Test 3: Index file detection
      console.log('  ✅ Testing index file detection...');
      const indexFile = await contentLoader.findIndexFile(locale, testVersion);
      
      if (indexFile) {
        console.log(`    ✓ Index file found: ${indexFile}`);
      } else {
        console.log(`    ✓ No index file found (will use fallback)`);
      }

      // Test 4: Content by slug (empty slug should return home)
      console.log('  ✅ Testing empty slug handling...');
      const emptySlugContent = await contentLoader.getContentBySlug(locale, testVersion, '');
      
      if (emptySlugContent) {
        console.log(`    ✓ Empty slug returns: "${emptySlugContent.frontmatter.title}"`);
      } else {
        console.log('    ❌ Empty slug returned null (unexpected)');
      }

      // Test 5: Test a specific content slug if available
      if (availableContent.length > 0) {
        console.log('  ✅ Testing specific content slug...');
        const firstSlug = availableContent[0];
        const specificContent = await contentLoader.getContentBySlug(locale, testVersion, firstSlug);
        
        if (specificContent) {
          console.log(`    ✓ Content loaded for slug "${firstSlug}": "${specificContent.frontmatter.title}"`);
        } else {
          console.log(`    ❌ Failed to load content for slug "${firstSlug}"`);
        }
      }

    } catch (error) {
      console.log(`    ❌ Error testing locale ${locale}:`, error);
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('✅ Docs routing tests completed!');
}

// Run the test
testDocsRouting().catch(console.error);