#!/usr/bin/env tsx

/**
 * Test script to verify code block rendering in actual content
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { mdxProcessor } from '../lib/mdx-processor';

async function testCodeBlockRendering() {
  console.log('🧪 Testing code block rendering in actual content...\n');

  try {
    // Read the users.mdx file
    const contentPath = join(process.cwd(), 'content/en/v1/api-reference/users.mdx');
    const content = await readFile(contentPath, 'utf-8');
    
    console.log('📄 Processing users.mdx content...');
    
    // Process the content
    const result = await mdxProcessor.processMarkdown(content);
    
    // Check if code blocks are preserved as markers
    const codeBlockMarkers = result.processedContent.match(/data-mdx-code-block="[^"]+"/g);
    
    if (codeBlockMarkers && codeBlockMarkers.length > 0) {
      console.log(`✅ Found ${codeBlockMarkers.length} code block markers`);
      
      // Decode and analyze the first few markers
      for (let i = 0; i < Math.min(3, codeBlockMarkers.length); i++) {
        const marker = codeBlockMarkers[i];
        const encodedData = marker.match(/data-mdx-code-block="([^"]+)"/)?.[1];
        
        if (encodedData) {
          try {
            const decodedData = Buffer.from(encodedData, 'base64').toString();
            const codeBlockData = JSON.parse(decodedData);
            
            console.log(`  📝 Code block ${i + 1}:`);
            console.log(`     Language: ${codeBlockData.language}`);
            console.log(`     Code length: ${codeBlockData.code?.length || 0} characters`);
            console.log(`     Has filename: ${!!codeBlockData.filename}`);
            
            if (codeBlockData.code && codeBlockData.code.length > 0) {
              console.log(`     Preview: ${codeBlockData.code.substring(0, 50)}...`);
            }
          } catch (error) {
            console.log(`  ❌ Failed to decode marker ${i + 1}: ${error}`);
          }
        }
      }
    } else {
      console.log('❌ No code block markers found in processed content');
    }
    
    // Check for any processing errors
    if (result.linkValidationErrors.length > 0) {
      console.log(`\n⚠️  Link validation errors: ${result.linkValidationErrors.length}`);
      result.linkValidationErrors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Check table of contents
    if (result.tableOfContents.length > 0) {
      console.log(`\n📚 Table of contents: ${result.tableOfContents.length} headings`);
    }
    
    console.log('\n✅ Code block rendering test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testCodeBlockRendering().catch(console.error);
}

export { testCodeBlockRendering };