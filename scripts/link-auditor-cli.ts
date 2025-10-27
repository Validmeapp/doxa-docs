#!/usr/bin/env tsx

/**
 * CLI tool for running LinkAuditor
 */

import { Command } from 'commander';
import { LinkAuditor } from '../lib/link-auditor';

const program = new Command();

program
  .name('link-auditor')
  .description('Audit and fix internal links in documentation content')
  .version('1.0.0');

program
  .command('audit')
  .description('Audit links in documentation content')
  .requiredOption('-l, --locale <locale>', 'Content locale (e.g., en, es)')
  .requiredOption('--content-version <version>', 'Content version (e.g., v1)')
  .option('-c, --content-root <path>', 'Content root directory', 'content')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const auditor = new LinkAuditor(options.contentRoot);
    
    try {
      console.log(`🔍 Auditing links for ${options.locale}/${options.contentVersion}...`);
      const result = await auditor.auditAllLinks(options.locale, options.contentVersion);
      
      console.log(`\n📊 Audit Results:`);
      console.log(`- Processed files: ${result.processedFiles}`);
      console.log(`- Total links: ${result.totalLinks}`);
      console.log(`- Valid links: ${result.validLinks}`);
      console.log(`- Broken links: ${result.brokenLinks.length}`);
      console.log(`- Fixable links: ${result.fixableLinks.length}`);
      console.log(`- Unfixable links: ${result.unfixableLinks.length}`);
      
      if (result.brokenLinks.length > 0) {
        console.log(`\n🔴 Broken Links:`);
        result.brokenLinks.forEach((link, index) => {
          console.log(`${index + 1}. ${link.filePath.replace(process.cwd(), '.')}:${link.lineNumber}`);
          console.log(`   Text: "${link.linkText}"`);
          console.log(`   URL: "${link.originalUrl}"`);
          console.log(`   Reason: ${link.reason}`);
          if (link.suggestedFix) {
            console.log(`   Suggested fix: "${link.suggestedFix}"`);
          }
          console.log('');
        });
      }
      
      if (options.verbose && result.fixableLinks.length > 0) {
        console.log(`\n🔧 Fixable Links:`);
        result.fixableLinks.forEach((link, index) => {
          console.log(`${index + 1}. ${link.filePath.replace(process.cwd(), '.')}:${link.lineNumber}`);
          console.log(`   "${link.originalUrl}" → "${link.suggestedFix}"`);
        });
      }
      
      // Exit with error code if there are broken links
      if (result.brokenLinks.length > 0) {
        console.log(`\n❌ Found ${result.brokenLinks.length} broken links`);
        process.exit(1);
      } else {
        console.log(`\n✅ All links are valid!`);
      }
      
    } catch (error) {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    }
  });

program
  .command('fix')
  .description('Fix broken links in documentation content')
  .requiredOption('-l, --locale <locale>', 'Content locale (e.g., en, es)')
  .requiredOption('--content-version <version>', 'Content version (e.g., v1)')
  .option('-c, --content-root <path>', 'Content root directory', 'content')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const auditor = new LinkAuditor(options.contentRoot);
    
    try {
      const mode = options.dryRun ? 'dry run' : 'actual fix';
      console.log(`🔧 Fixing links for ${options.locale}/${options.contentVersion} (${mode})...`);
      
      const result = await auditor.fixBrokenLinks(options.locale, options.contentVersion, options.dryRun);
      
      console.log(`\n📊 Fix Results:`);
      console.log(`- Total fixed: ${result.totalFixed}`);
      console.log(`- Fixed links: ${result.fixedLinks.length}`);
      console.log(`- Stripped links: ${result.strippedLinks.length}`);
      console.log(`- Backup created: ${result.backupCreated}`);
      console.log(`- Errors: ${result.errors.length}`);
      
      if (result.fixedLinks.length > 0) {
        console.log(`\n🔧 Fixed Links:`);
        result.fixedLinks.forEach((link, index) => {
          console.log(`${index + 1}. ${link.filePath.replace(process.cwd(), '.')}:${link.lineNumber}`);
          console.log(`   "${link.originalUrl}" → "${link.newUrl}"`);
        });
      }
      
      if (result.strippedLinks.length > 0) {
        console.log(`\n✂️  Stripped Links:`);
        result.strippedLinks.forEach((link, index) => {
          console.log(`${index + 1}. ${link.filePath.replace(process.cwd(), '.')}:${link.lineNumber}`);
          console.log(`   Removed: "${link.originalUrl}"`);
          console.log(`   Kept text: "${link.linkText}"`);
        });
      }
      
      if (result.errors.length > 0) {
        console.log(`\n❌ Errors:`);
        result.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error}`);
        });
      }
      
      if (options.dryRun) {
        console.log(`\n💡 Run without --dry-run to apply these changes`);
      } else if (result.totalFixed > 0 || result.strippedLinks.length > 0) {
        console.log(`\n✅ Link fixing completed!`);
        if (result.backupCreated) {
          console.log(`📁 Backup created before making changes`);
        }
      } else {
        console.log(`\n✅ No links needed fixing`);
      }
      
    } catch (error) {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    }
  });

program
  .command('normalize')
  .description('Test link normalization')
  .requiredOption('-l, --locale <locale>', 'Content locale (e.g., en, es)')
  .requiredOption('--content-version <version>', 'Content version (e.g., v1)')
  .argument('<links...>', 'Links to normalize')
  .action((links, options) => {
    const auditor = new LinkAuditor();
    
    console.log(`🔗 Normalizing links for ${options.locale}/${options.contentVersion}:`);
    links.forEach((link: string) => {
      const normalized = auditor.normalizeLink(link, options.locale, options.contentVersion);
      console.log(`  "${link}" → "${normalized}"`);
    });
  });

if (require.main === module) {
  program.parse();
}