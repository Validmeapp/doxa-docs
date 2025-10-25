#!/usr/bin/env tsx

import { searchIndexer } from '../lib/search-indexer';

async function main() {
  console.log('🔍 Building search indexes...');
  
  try {
    await searchIndexer.generateAllIndexes();
    console.log('✅ All search indexes built successfully');
  } catch (error) {
    console.error('❌ Failed to build search indexes:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}