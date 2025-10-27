#!/usr/bin/env tsx

/**
 * Test LinkAuditor with real project content
 */

import { LinkAuditor } from '../lib/link-auditor';

async function testWithRealContent() {
  console.log('🔍 Testing LinkAuditor with real project content...\n');
  
  const auditor = new LinkAuditor('content');
  
  try {
    // Test with English content
    console.log('1. Auditing English content (v1)...');
    const enResult = await auditor.auditAllLinks('en', 'v1');
    
    console.log(`   📊 English Audit Results:`);
    console.log(`   - Processed files: ${enResult.processedFiles}`);
    console.log(`   - Total links: ${enResult.totalLinks}`);
    console.log(`   - Valid links: ${enResult.validLinks}`);
    console.log(`   - Broken links: ${enResult.brokenLinks.length}`);
    console.log(`   - Fixable links: ${enResult.fixableLinks.length}`);
    console.log(`   - Unfixable links: ${enResult.unfixableLinks.length}`);
    
    if (enResult.brokenLinks.length > 0) {
      console.log(`\n   🔴 Broken Links in English content:`);
      enResult.brokenLinks.slice(0, 5).forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.filePath.replace(process.cwd(), '.')}`);
        console.log(`      Text: "${link.linkText}"`);
        console.log(`      URL: "${link.originalUrl}"`);
        console.log(`      Reason: ${link.reason}`);
        if (link.suggestedFix) {
          console.log(`      Suggested fix: "${link.suggestedFix}"`);
        }
        console.log('');
      });
      
      if (enResult.brokenLinks.length > 5) {
        console.log(`   ... and ${enResult.brokenLinks.length - 5} more broken links`);
      }
    }
    
    // Test with Spanish content
    console.log('\n2. Auditing Spanish content (v1)...');
    const esResult = await auditor.auditAllLinks('es', 'v1');
    
    console.log(`   📊 Spanish Audit Results:`);
    console.log(`   - Processed files: ${esResult.processedFiles}`);
    console.log(`   - Total links: ${esResult.totalLinks}`);
    console.log(`   - Valid links: ${esResult.validLinks}`);
    console.log(`   - Broken links: ${esResult.brokenLinks.length}`);
    console.log(`   - Fixable links: ${esResult.fixableLinks.length}`);
    console.log(`   - Unfixable links: ${esResult.unfixableLinks.length}`);
    
    if (esResult.brokenLinks.length > 0) {
      console.log(`\n   🔴 Broken Links in Spanish content:`);
      esResult.brokenLinks.slice(0, 3).forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.filePath.replace(process.cwd(), '.')}`);
        console.log(`      Text: "${link.linkText}"`);
        console.log(`      URL: "${link.originalUrl}"`);
        if (link.suggestedFix) {
          console.log(`      Suggested fix: "${link.suggestedFix}"`);
        }
        console.log('');
      });
    }
    
    // Test link normalization with real examples
    console.log('\n3. Testing link normalization with real examples...');
    const testLinks = [
      'getting-started.mdx',
      '../index.mdx',
      'user-guide/billing.mdx',
      '/developer-guide/api-reference.mdx'
    ];
    
    testLinks.forEach(link => {
      const enNormalized = auditor.normalizeLink(link, 'en', 'v1');
      const esNormalized = auditor.normalizeLink(link, 'es', 'v1');
      console.log(`   "${link}"`);
      console.log(`     EN: "${enNormalized}"`);
      console.log(`     ES: "${esNormalized}"`);
    });
    
    console.log('\n✅ Real content testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testWithRealContent().catch(console.error);
}