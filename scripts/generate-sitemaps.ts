#!/usr/bin/env tsx

/**
 * Build-time sitemap generation script
 * This script generates static sitemap files during the build process
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { generateAllSitemaps } from '../lib/sitemap-generator';

async function generateStaticSitemaps() {
  console.log('🗺️  Generating sitemaps...');

  try {
    const { sitemaps, sitemapIndex, robotsTxt } = await generateAllSitemaps();

    // Ensure public directory exists
    const publicDir = join(process.cwd(), 'public');
    mkdirSync(publicDir, { recursive: true });

    // Write individual sitemaps
    for (const sitemap of sitemaps) {
      const filePath = join(publicDir, sitemap.filename);
      writeFileSync(filePath, sitemap.content, 'utf-8');
      console.log(`✅ Generated ${sitemap.filename} (${sitemap.locale} ${sitemap.version})`);
    }

    // Write sitemap index
    const sitemapIndexPath = join(publicDir, 'sitemap.xml');
    writeFileSync(sitemapIndexPath, sitemapIndex, 'utf-8');
    console.log('✅ Generated sitemap.xml (index)');

    // Write robots.txt
    const robotsPath = join(publicDir, 'robots.txt');
    writeFileSync(robotsPath, robotsTxt, 'utf-8');
    console.log('✅ Generated robots.txt');

    console.log(`🎉 Successfully generated ${sitemaps.length} sitemaps`);
  } catch (error) {
    console.error('❌ Error generating sitemaps:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  generateStaticSitemaps();
}

export { generateStaticSitemaps };