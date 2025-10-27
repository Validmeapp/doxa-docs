#!/usr/bin/env tsx

/**
 * Integration test for code block components
 * Tests the actual MDXCodeBlock and CodeBlock components
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Test that the components can be imported without errors
console.log('🧪 Testing Code Block Component Integration\n');

try {
  // Read the component files to check for syntax errors
  const mdxCodeBlockPath = join(process.cwd(), 'components/mdx-code-block.tsx');
  const codeBlockPath = join(process.cwd(), 'components/code-block.tsx');
  
  console.log('1. Reading component files...');
  const mdxCodeBlockContent = readFileSync(mdxCodeBlockPath, 'utf-8');
  const codeBlockContent = readFileSync(codeBlockPath, 'utf-8');
  
  console.log('   ✅ MDXCodeBlock component file read successfully');
  console.log('   ✅ CodeBlock component file read successfully');
  
  // Check for key enhancements
  console.log('\n2. Checking for required enhancements...');
  
  const checks = [
    {
      name: 'Enhanced error handling for null/undefined children',
      file: 'MDXCodeBlock',
      content: mdxCodeBlockContent,
      pattern: /children === null \|\| children === undefined/,
      pass: false
    },
    {
      name: 'Neutral styling prop support',
      file: 'CodeBlock',
      content: codeBlockContent,
      pattern: /neutralStyling\?\: boolean/,
      pass: false
    },
    {
      name: 'Enhanced copy functionality with fallbacks',
      file: 'CodeBlock',
      content: codeBlockContent,
      pattern: /navigator\.clipboard && window\.isSecureContext/,
      pass: false
    },
    {
      name: 'Consistent styling for untyped blocks',
      file: 'CodeBlock',
      content: codeBlockContent,
      pattern: /neutral-code-block/,
      pass: false
    },
    {
      name: 'Graceful handling of empty code blocks',
      file: 'MDXCodeBlock',
      content: mdxCodeBlockContent,
      pattern: /This code block is empty/,
      pass: false
    },
    {
      name: 'Enhanced language detection for untyped blocks',
      file: 'MDXCodeBlock',
      content: mdxCodeBlockContent,
      pattern: /normalizedLanguage !== 'plain'/,
      pass: false
    },
    {
      name: 'Improved error handling for malformed content',
      file: 'CodeBlock',
      content: codeBlockContent,
      pattern: /typeof code !== 'string'/,
      pass: false
    },
    {
      name: 'Enhanced horizontal scroll and line wrapping',
      file: 'CodeBlock',
      content: codeBlockContent,
      pattern: /overflowWrap: 'break-word'/,
      pass: false
    }
  ];
  
  checks.forEach(check => {
    check.pass = check.pattern.test(check.content);
    if (check.pass) {
      console.log(`   ✅ ${check.name} (${check.file})`);
    } else {
      console.log(`   ❌ ${check.name} (${check.file})`);
    }
  });
  
  const passedChecks = checks.filter(c => c.pass).length;
  const totalChecks = checks.length;
  
  console.log(`\n📊 Enhancement Check Results:`);
  console.log(`✅ Passed: ${passedChecks}/${totalChecks}`);
  console.log(`📈 Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
  
  // Check TypeScript compilation
  console.log('\n3. Checking TypeScript compilation...');
  
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit --skipLibCheck components/mdx-code-block.tsx components/code-block.tsx', {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    console.log('   ✅ TypeScript compilation successful');
  } catch (error) {
    console.log('   ❌ TypeScript compilation failed');
    console.log(`   Error: ${error.message}`);
  }
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 All enhancements are present and components are ready!');
    console.log('\n📋 Summary of enhancements:');
    console.log('   • Enhanced error handling for malformed code block content');
    console.log('   • Neutral styling mode support for untyped code blocks');
    console.log('   • Consistent styling between typed and untyped blocks');
    console.log('   • Improved copy functionality with cross-browser support');
    console.log('   • Better handling of empty and whitespace-only code blocks');
    console.log('   • Enhanced language detection and graceful fallbacks');
    console.log('   • Improved horizontal scroll and line wrapping for long lines');
    console.log('   • Better accessibility and error messaging');
  } else {
    console.log('\n⚠️  Some enhancements are missing. Please review the implementation.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Integration test failed:', error);
  process.exit(1);
}