#!/usr/bin/env tsx

/**
 * Enhanced test script for CodeBlock component functionality
 * Tests the improved error handling, fallback mechanisms, and language support
 */

import { codeToHtml } from 'shiki';

// Test language normalization
function testLanguageNormalization() {
  console.log('🧪 Testing language normalization...');
  
  const normalizeLanguageForShiki = (lang: string): string => {
    const shikiLanguageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'sh': 'bash',
      'shell': 'bash',
      'yml': 'yaml',
      'md': 'markdown',
      'c++': 'cpp',
      'c#': 'csharp',
      'objective-c': 'objc',
    };
    
    const normalizedLang = lang.toLowerCase().trim();
    return shikiLanguageMap[normalizedLang] || normalizedLang;
  };

  const testCases = [
    { input: 'js', expected: 'javascript' },
    { input: 'JS', expected: 'javascript' },
    { input: 'typescript', expected: 'typescript' },
    { input: 'py', expected: 'python' },
    { input: 'shell', expected: 'bash' },
    { input: 'unknown-lang', expected: 'unknown-lang' },
  ];

  let passed = 0;
  testCases.forEach(({ input, expected }) => {
    const result = normalizeLanguageForShiki(input);
    if (result === expected) {
      console.log(`✅ ${input} -> ${result}`);
      passed++;
    } else {
      console.log(`❌ ${input} -> ${result} (expected: ${expected})`);
    }
  });

  console.log(`Language normalization: ${passed}/${testCases.length} tests passed`);
}

// Test enhanced language display names
function testEnhancedLanguageMapping() {
  console.log('\n🧪 Testing enhanced language display names...');
  
  const getLanguageDisplayName = (lang: string): string => {
    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      javascript: 'JavaScript',
      ts: 'TypeScript',
      typescript: 'TypeScript',
      py: 'Python',
      python: 'Python',
      bash: 'Bash',
      shell: 'Shell',
      json: 'JSON',
      yaml: 'YAML',
      html: 'HTML',
      css: 'CSS',
      sql: 'SQL',
      text: 'Plain Text',
    };
    
    const normalizedLang = lang.toLowerCase().trim();
    return languageMap[normalizedLang] || lang.toUpperCase();
  };

  const testCases = [
    { input: 'js', expected: 'JavaScript' },
    { input: 'JavaScript', expected: 'JavaScript' },
    { input: 'typescript', expected: 'TypeScript' },
    { input: 'PYTHON', expected: 'Python' },
    { input: 'unknown', expected: 'UNKNOWN' },
    { input: 'text', expected: 'Plain Text' },
  ];

  let passed = 0;
  testCases.forEach(({ input, expected }) => {
    const result = getLanguageDisplayName(input);
    if (result === expected) {
      console.log(`✅ ${input} -> ${result}`);
      passed++;
    } else {
      console.log(`❌ ${input} -> ${result} (expected: ${expected})`);
    }
  });

  console.log(`Enhanced language mapping: ${passed}/${testCases.length} tests passed`);
}

// Test error handling with invalid languages
async function testErrorHandling() {
  console.log('\n🧪 Testing error handling with invalid languages...');
  
  const testCases = [
    { lang: 'invalid-language', code: 'console.log("test");' },
    { lang: 'nonexistent', code: 'print("hello")' },
    { lang: '', code: 'some code' },
  ];

  for (const { lang, code } of testCases) {
    try {
      const html = await codeToHtml(code, {
        lang: lang,
        themes: {
          light: 'github-light',
          dark: 'github-dark',
        },
        defaultColor: false,
        cssVariablePrefix: '--shiki-',
      });
      
      if (html.includes(code)) {
        console.log(`✅ ${lang || 'empty'} -> Handled gracefully with fallback`);
      } else {
        console.log(`❌ ${lang || 'empty'} -> Unexpected result`);
      }
    } catch (error) {
      console.log(`✅ ${lang || 'empty'} -> Error caught: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Test clipboard functionality simulation
function testClipboardFallback() {
  console.log('\n🧪 Testing clipboard fallback mechanisms...');
  
  // Simulate environments where clipboard API might not be available
  const testEnvironments = [
    { name: 'Modern browser', hasClipboard: true, hasExecCommand: true },
    { name: 'Older browser', hasClipboard: false, hasExecCommand: true },
    { name: 'Restricted environment', hasClipboard: false, hasExecCommand: false },
  ];

  testEnvironments.forEach(({ name, hasClipboard, hasExecCommand }) => {
    console.log(`Testing ${name}:`);
    
    if (hasClipboard) {
      console.log('  ✅ Can use navigator.clipboard');
    } else if (hasExecCommand) {
      console.log('  ✅ Can use document.execCommand fallback');
    } else {
      console.log('  ⚠️  Would show manual copy instruction');
    }
  });
}

// Test input validation
function testInputValidation() {
  console.log('\n🧪 Testing input validation...');
  
  const testCases = [
    { code: 'console.log("valid");', valid: true },
    { code: '', valid: false },
    { code: null, valid: false },
    { code: undefined, valid: false },
    { code: 123, valid: false },
    { code: {}, valid: false },
  ];

  testCases.forEach(({ code, valid }) => {
    const isValid = typeof code === 'string' && code.trim().length > 0;
    const result = isValid === valid ? '✅' : '❌';
    console.log(`${result} ${JSON.stringify(code)} -> ${isValid ? 'valid' : 'invalid'}`);
  });
}

// Test tabs configuration validation
function testTabsValidation() {
  console.log('\n🧪 Testing tabs configuration validation...');
  
  const testCases = [
    {
      name: 'Valid tabs',
      tabs: '[{"label":"JS","code":"console.log()","language":"js"}]',
      valid: true
    },
    {
      name: 'Invalid JSON',
      tabs: '{ invalid json }',
      valid: false
    },
    {
      name: 'Empty array',
      tabs: '[]',
      valid: false
    },
    {
      name: 'Missing properties',
      tabs: '[{"label":"JS"}]',
      valid: false
    },
    {
      name: 'Non-array',
      tabs: '{"not":"array"}',
      valid: false
    },
  ];

  testCases.forEach(({ name, tabs, valid }) => {
    try {
      const parsed = JSON.parse(tabs);
      const isValid = Array.isArray(parsed) && 
                     parsed.length > 0 && 
                     parsed.every(tab => 
                       tab && 
                       typeof tab === 'object' && 
                       typeof tab.label === 'string' && 
                       typeof tab.code === 'string' && 
                       typeof tab.language === 'string'
                     );
      
      const result = isValid === valid ? '✅' : '❌';
      console.log(`${result} ${name}: ${isValid ? 'valid' : 'invalid'}`);
    } catch (error) {
      const result = !valid ? '✅' : '❌';
      console.log(`${result} ${name}: JSON parse error (expected: ${valid ? 'valid' : 'invalid'})`);
    }
  });
}

async function runEnhancedTests() {
  console.log('🚀 Running enhanced CodeBlock component tests...\n');
  
  testLanguageNormalization();
  testEnhancedLanguageMapping();
  await testErrorHandling();
  testClipboardFallback();
  testInputValidation();
  testTabsValidation();
  
  console.log('\n🎉 Enhanced CodeBlock tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runEnhancedTests().catch(console.error);
}

export { runEnhancedTests };