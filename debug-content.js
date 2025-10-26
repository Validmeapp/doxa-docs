const { contentLoader } = require('./lib/content-loader.ts');

async function debugContent() {
  try {
    console.log('=== DEBUGGING CONTENT LOADING ===');
    
    // Load all content
    const allContent = await contentLoader.loadAllContent();
    console.log('\nAll content loaded:');
    allContent.forEach(page => {
      console.log(`- File: ${page.filePath}`);
      console.log(`  Slug: "${page.slug}"`);
      console.log(`  Locale: ${page.frontmatter.locale}`);
      console.log(`  Version: ${page.frontmatter.version}`);
      console.log(`  Title: ${page.frontmatter.title}`);
      console.log('');
    });
    
    // Test specific lookups
    console.log('\n=== TESTING SPECIFIC LOOKUPS ===');
    
    const testCases = [
      { locale: 'en', version: 'v1', slug: 'overview' },
      { locale: 'en', version: 'v1', slug: 'api-reference/users' },
      { locale: 'en', version: 'v1', slug: 'guides/getting-started' },
      { locale: 'es', version: 'v1', slug: 'overview' },
    ];
    
    for (const testCase of testCases) {
      const result = await contentLoader.getContentBySlug(testCase.locale, testCase.version, testCase.slug);
      console.log(`Lookup: ${testCase.locale}/${testCase.version}/${testCase.slug} -> ${result ? 'FOUND' : 'NOT FOUND'}`);
      if (result) {
        console.log(`  Title: ${result.frontmatter.title}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugContent();