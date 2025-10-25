#!/usr/bin/env tsx

import { searchAnalytics } from '../lib/search-analytics';

async function main() {
  console.log('🧪 Testing search analytics...');

  try {
    // Test logging a search
    await searchAnalytics.logSearch({
      query: 'authentication',
      locale: 'en',
      version: 'v1',
      resultsCount: 5
    });

    await searchAnalytics.logSearch({
      query: 'api reference',
      locale: 'en',
      version: 'v1',
      resultsCount: 10
    });

    await searchAnalytics.logResultClick({
      query: 'authentication',
      locale: 'en',
      version: 'v1',
      resultsCount: 5,
      clickedResultPath: '/en/v1/authentication'
    });

    console.log('✅ Logged test search queries');

    // Test getting popular searches
    const popularSearches = await searchAnalytics.getPopularSearches('en', 'v1', 5);
    console.log('📊 Popular searches:', popularSearches);

    // Test getting analytics
    const analytics = await searchAnalytics.getSearchAnalytics('en', 'v1', 30);
    console.log('📈 Search analytics:', analytics);

    // Test getting metadata
    const metadata = await searchAnalytics.getSearchMetadata('en', 'v1');
    console.log('🔍 Search metadata:', metadata);

    console.log('✅ Search analytics test completed successfully');
  } catch (error) {
    console.error('❌ Search analytics test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}