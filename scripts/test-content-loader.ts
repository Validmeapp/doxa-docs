#!/usr/bin/env tsx

import { contentLoader } from '../lib/content-loader';

async function testContentLoader() {
  console.log('🧪 Testing Content Loader...\n');

  // Test content discovery
  console.log('📁 Discovering content files...');
  const files = contentLoader.discoverContentFiles();
  console.log(`Found ${files.length} content files:`);
  files.forEach(file => console.log(`  - ${file}`));
  console.log();

  // Test content validation
  console.log('✅ Validating all content...');
  const validationErrors = contentLoader.validateAllContent();
  if (validationErrors.length === 0) {
    console.log('All content files are valid!');
  } else {
    console.log(`Found ${validationErrors.length} validation errors:`);
    validationErrors.forEach(error => {
      console.log(`  - ${error.filePath}: ${error.field} - ${error.message}`);
    });
  }
  console.log();

  // Test loading all content
  console.log('📖 Loading all content...');
  const allContent = await contentLoader.loadAllContent();
  console.log(`Loaded ${allContent.length} content pages:`);
  allContent.forEach(page => {
    console.log(`  - ${page.frontmatter.locale}/${page.frontmatter.version}/${page.slug}: "${page.frontmatter.title}"`);
  });
  console.log();

  // Test available locales and versions
  console.log('🌍 Available locales:', contentLoader.getAvailableLocales());
  console.log('📋 Available versions:', contentLoader.getAvailableVersions());
  console.log();

  // Test filtering by locale and version
  console.log('🔍 Testing content filtering...');
  const enV1Content = await contentLoader.loadContentByLocaleAndVersion('en', 'v1');
  console.log(`English v1 content: ${enV1Content.length} pages`);
  
  const esV1Content = await contentLoader.loadContentByLocaleAndVersion('es', 'v1');
  console.log(`Spanish v1 content: ${esV1Content.length} pages`);
  console.log();

  // Test finding content by slug
  console.log('🎯 Testing content lookup by slug...');
  const overviewPage = await contentLoader.findContentBySlug('en/v1/overview', 'en', 'v1');
  if (overviewPage) {
    console.log(`Found page: "${overviewPage.frontmatter.title}"`);
    console.log(`Description: ${overviewPage.frontmatter.description}`);
  } else {
    console.log('Page not found');
  }

  console.log('\n✨ Content loader test completed!');
}

testContentLoader().catch(console.error);