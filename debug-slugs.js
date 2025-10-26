const { contentLoader } = require('./lib/content-loader.ts');

async function debugSlugs() {
  try {
    console.log('Loading all content...');
    const allContent = await contentLoader.loadAllContent();
    
    console.log('\nAll content pages:');
    allContent.forEach(page => {
      console.log(`- Slug: "${page.slug}", Locale: ${page.frontmatter.locale}, Version: ${page.frontmatter.version}, Title: ${page.frontmatter.title}`);
    });
    
    console.log('\nEnglish v1 slugs:');
    const enSlugs = await contentLoader.getAllContentSlugs('en', 'v1');
    console.log(enSlugs);
    
    console.log('\nTesting specific lookups:');
    const usersContent = await contentLoader.getContentBySlug('en', 'v1', 'users');
    console.log('Users content found:', !!usersContent);
    
    const webhooksContent = await contentLoader.getContentBySlug('en', 'v1', 'webhooks');
    console.log('Webhooks content found:', !!webhooksContent);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugSlugs();