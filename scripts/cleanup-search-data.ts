#!/usr/bin/env tsx

import { searchAnalytics } from '../lib/search-analytics';

async function main() {
  const args = process.argv.slice(2);
  const daysToKeep = args[0] ? parseInt(args[0]) : 90;

  if (isNaN(daysToKeep) || daysToKeep < 1) {
    console.error('Invalid days to keep. Please provide a positive number.');
    process.exit(1);
  }

  console.log(`🧹 Cleaning up search data older than ${daysToKeep} days...`);
  
  try {
    const deletedCount = await searchAnalytics.cleanupOldSearches(daysToKeep);
    console.log(`✅ Cleaned up ${deletedCount} old search records`);
  } catch (error) {
    console.error('❌ Failed to cleanup search data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}