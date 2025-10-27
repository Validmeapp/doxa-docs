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
  console.log('🌍 Available locales:', await contentLoader.getAvailableLocales());
  console.log('📋 Available versions:', await contentLoader.getAvailableVersions());
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
  console.log();

  // Test home document functionality
  console.log('🏠 Testing home document functionality...');
  
  // Test finding index files
  console.log('📍 Testing findIndexFile...');
  const enIndexPath = await contentLoader.findIndexFile('en', 'v1');
  console.log(`English v1 index file: ${enIndexPath || 'Not found'}`);
  
  const esIndexPath = await contentLoader.findIndexFile('es', 'v1');
  console.log(`Spanish v1 index file: ${esIndexPath || 'Not found'}`);
  
  const nonExistentIndexPath = await contentLoader.findIndexFile('fr', 'v1');
  console.log(`French v1 index file: ${nonExistentIndexPath || 'Not found'}`);
  console.log();

  // Test getting home documents
  console.log('📄 Testing getHomeDocument...');
  const enHomeDoc = await contentLoader.getHomeDocument('en', 'v1');
  if (enHomeDoc) {
    console.log(`English v1 home document: "${enHomeDoc.frontmatter.title}"`);
    console.log(`Slug: "${enHomeDoc.slug}"`);
    console.log(`Content length: ${enHomeDoc.content.length} characters`);
  } else {
    console.log('English v1 home document: Not found');
  }
  
  const esHomeDoc = await contentLoader.getHomeDocument('es', 'v1');
  if (esHomeDoc) {
    console.log(`Spanish v1 home document: "${esHomeDoc.frontmatter.title}"`);
    console.log(`Slug: "${esHomeDoc.slug}"`);
  } else {
    console.log('Spanish v1 home document: Not found');
  }
  
  // Test fallback for missing home document
  const frHomeDoc = await contentLoader.getHomeDocument('fr', 'v1');
  if (frHomeDoc) {
    console.log(`French v1 home document (fallback): "${frHomeDoc.frontmatter.title}"`);
    console.log(`Is fallback content: ${frHomeDoc.content.includes('Missing Home Document')}`);
  } else {
    console.log('French v1 home document: Not found');
  }
  console.log();

  // Test getContentBySlug with empty slug (home document)
  console.log('🔗 Testing getContentBySlug with empty slug...');
  const homeViaEmptySlug = await contentLoader.getContentBySlug('en', 'v1', '');
  if (homeViaEmptySlug) {
    console.log(`Home via empty slug: "${homeViaEmptySlug.frontmatter.title}"`);
  } else {
    console.log('Home via empty slug: Not found');
  }
  
  const homeViaSlash = await contentLoader.getContentBySlug('en', 'v1', '/');
  if (homeViaSlash) {
    console.log(`Home via slash: "${homeViaSlash.frontmatter.title}"`);
  } else {
    console.log('Home via slash: Not found');
  }
  console.log();

  // Test missing home content generation
  console.log('📝 Testing missing home content generation...');
  const missingContent = contentLoader.generateMissingHomeContent('test', 'v1');
  console.log(`Generated missing content length: ${missingContent.length} characters`);
  console.log(`Contains instructions: ${missingContent.includes('index.mdx')}`);
  console.log(`Contains locale/version: ${missingContent.includes('test/v1')}`);

  console.log('\n✨ Content loader test completed!');
}

testContentLoader().catch(console.error);