#!/usr/bin/env tsx

import { contentLoader } from '../lib/content-loader';
import { mdxProcessor } from '../lib/mdx-processor';

/**
 * Test script for MDX processor functionality
 */
async function testMDXProcessor() {
  console.log('🧪 Testing MDX Processor...\n');

  try {
    // Test 1: Load all content and check TOC generation
    console.log('📄 Loading all content...');
    const allContent = await contentLoader.loadAllContent();
    console.log(`✅ Loaded ${allContent.length} content files\n`);

    // Test 2: Check TOC generation for each file
    console.log('📋 Testing Table of Contents generation...');
    for (const page of allContent) {
      if (page.tableOfContents.length > 0) {
        console.log(`📄 ${page.slug}:`);
        page.tableOfContents.forEach((item, index) => {
          const indent = '  '.repeat(item.level - 2);
          console.log(`  ${indent}${index + 1}. ${item.title} (${item.id})`);
        });
        console.log('');
      }
    }

    // Test 3: Link validation
    console.log('🔗 Testing link validation...');
    const linkErrors = await contentLoader.validateAllLinks();
    
    if (linkErrors.size === 0) {
      console.log('✅ No broken links found!');
    } else {
      console.log('⚠️  Found broken links:');
      for (const [filePath, errors] of linkErrors) {
        console.log(`  📄 ${filePath}:`);
        errors.forEach(error => console.log(`    ❌ ${error}`));
      }
    }

    // Test 4: Process sample markdown content
    console.log('\n🔄 Testing markdown processing...');
    const sampleMarkdown = `
# Main Title

This is some content with a [link to overview](overview) and an [external link](https://example.com).

## Section 1

Some content here.

### Subsection 1.1

More content.

## Section 2

Final section with \`inline code\` and:

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

### Subsection 2.1

Last subsection.
`;

    const result = await mdxProcessor.processMarkdown(sampleMarkdown);
    console.log('📋 Generated TOC:');
    result.tableOfContents.forEach((item, index) => {
      const indent = '  '.repeat(item.level - 2);
      console.log(`  ${indent}${index + 1}. ${item.title} (${item.id})`);
    });

    if (result.linkValidationErrors.length > 0) {
      console.log('\n⚠️  Link validation errors:');
      result.linkValidationErrors.forEach(error => console.log(`  ❌ ${error}`));
    } else {
      console.log('\n✅ No link validation errors in sample content');
    }

    // Test 5: Available locales and versions
    console.log('\n🌍 Available locales:');
    const locales = await contentLoader.getAvailableLocales();
    console.log(`  ${locales.join(', ')}`);

    console.log('\n📦 Available versions:');
    const versions = await contentLoader.getAvailableVersions();
    console.log(`  ${versions.join(', ')}`);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMDXProcessor();