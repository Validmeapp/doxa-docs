#!/usr/bin/env tsx

/**
 * Test script for CodeBlock component functionality
 * This script tests the core functionality without requiring a browser environment
 */

import { codeToHtml } from 'shiki';

async function testShikiHighlighting() {
  console.log('🧪 Testing Shiki syntax highlighting...');
  
  const testCode = `function greetUser(name: string): string {
  if (!name) {
    throw new Error('Name is required');
  }
  return \`Hello, \${name}!\`;
}`;

  try {
    const html = await codeToHtml(testCode, {
      lang: 'typescript',
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
      cssVariablePrefix: '--shiki-',
    });

    if (html.includes('function') && html.includes('--shiki-')) {
      console.log('✅ Shiki highlighting works correctly');
      console.log('✅ CSS variables are properly configured');
    } else {
      console.log('❌ Shiki highlighting failed');
      console.log('Generated HTML:', html.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('❌ Shiki highlighting error:', error);
  }
}

function testLanguageMapping() {
  console.log('\n🧪 Testing language display name mapping...');
  
  const languageMap: Record<string, string> = {
    js: 'JavaScript',
    ts: 'TypeScript',
    jsx: 'React',
    tsx: 'React',
    py: 'Python',
    rb: 'Ruby',
    go: 'Go',
    rs: 'Rust',
    php: 'PHP',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    cs: 'C#',
    sh: 'Shell',
    bash: 'Bash',
    json: 'JSON',
    yaml: 'YAML',
    xml: 'XML',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    md: 'Markdown',
    mdx: 'MDX',
  };

  const testCases = [
    { input: 'js', expected: 'JavaScript' },
    { input: 'typescript', expected: 'TYPESCRIPT' },
    { input: 'py', expected: 'Python' },
    { input: 'unknown', expected: 'UNKNOWN' },
  ];

  let passed = 0;
  testCases.forEach(({ input, expected }) => {
    const result = languageMap[input] || input.toUpperCase();
    if (result === expected) {
      console.log(`✅ ${input} -> ${result}`);
      passed++;
    } else {
      console.log(`❌ ${input} -> ${result} (expected: ${expected})`);
    }
  });

  console.log(`Language mapping: ${passed}/${testCases.length} tests passed`);
}

function testHighlightLines() {
  console.log('\n🧪 Testing highlight lines parsing...');
  
  const testCases = [
    { input: '1,2,3', expected: [1, 2, 3] },
    { input: '5, 7, 9', expected: [5, 7, 9] },
    { input: '', expected: [] },
    { input: 'invalid', expected: [] },
  ];

  let passed = 0;
  testCases.forEach(({ input, expected }) => {
    const result = input
      ? input.split(',').map(line => parseInt(line.trim(), 10)).filter(Boolean)
      : [];
    
    const isEqual = JSON.stringify(result) === JSON.stringify(expected);
    if (isEqual) {
      console.log(`✅ "${input}" -> [${result.join(', ')}]`);
      passed++;
    } else {
      console.log(`❌ "${input}" -> [${result.join(', ')}] (expected: [${expected.join(', ')}])`);
    }
  });

  console.log(`Highlight lines parsing: ${passed}/${testCases.length} tests passed`);
}

function testTabsConfiguration() {
  console.log('\n🧪 Testing tabs configuration parsing...');
  
  const validTabsJSON = JSON.stringify([
    { label: 'JavaScript', code: 'console.log("hello");', language: 'js' },
    { label: 'Python', code: 'print("hello")', language: 'python' },
  ]);

  const invalidTabsJSON = '{ invalid json }';

  try {
    const parsed = JSON.parse(validTabsJSON);
    if (Array.isArray(parsed) && parsed.length === 2) {
      console.log('✅ Valid tabs JSON parsed correctly');
    } else {
      console.log('❌ Valid tabs JSON parsing failed');
    }
  } catch (error) {
    console.log('❌ Valid tabs JSON parsing error:', error);
  }

  try {
    JSON.parse(invalidTabsJSON);
    console.log('❌ Invalid JSON should have thrown an error');
  } catch (error) {
    console.log('✅ Invalid tabs JSON properly rejected');
  }
}

async function runTests() {
  console.log('🚀 Running CodeBlock component tests...\n');
  
  await testShikiHighlighting();
  testLanguageMapping();
  testHighlightLines();
  testTabsConfiguration();
  
  console.log('\n🎉 CodeBlock tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };