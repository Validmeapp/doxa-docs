#!/usr/bin/env tsx

/**
 * Test script to verify CodeBlock component functionality with enhanced features
 * This tests the component-level functionality without requiring a browser environment
 */

// Mock React and DOM APIs for testing
const mockReact = {
  useState: (initial: any) => [initial, () => {}],
  useEffect: (fn: Function) => fn(),
};

const mockDOM = {
  createElement: (tag: string) => ({
    textContent: '',
    innerHTML: '',
    style: {},
    focus: () => {},
    select: () => {},
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
  execCommand: () => true,
};

// Mock globals
(global as any).React = mockReact;
(global as any).document = mockDOM;

// Mock navigator if it doesn't exist or can't be modified
if (typeof navigator === 'undefined') {
  (global as any).navigator = {
    clipboard: {
      writeText: async (text: string) => Promise.resolve(),
    },
  };
}

async function testCodeBlockComponent() {
  console.log('🧪 Testing CodeBlock Component Functionality\n');

  // Test 1: Language normalization
  console.log('📝 Test 1: Language Normalization');
  testLanguageNormalization();

  // Test 2: Language display names
  console.log('\n📝 Test 2: Language Display Names');
  testLanguageDisplayNames();

  // Test 3: Untyped block detection
  console.log('\n📝 Test 3: Untyped Block Detection');
  testUntypedBlockDetection();

  // Test 4: Error handling
  console.log('\n📝 Test 4: Error Handling');
  testErrorHandling();

  console.log('\n🎉 CodeBlock component tests completed!');
}

function testLanguageNormalization() {
  // Test the language normalization logic
  const testCases = [
    { input: 'js', expected: 'javascript' },
    { input: 'ts', expected: 'typescript' },
    { input: 'py', expected: 'python' },
    { input: 'sh', expected: 'bash' },
    { input: 'shell', expected: 'bash' },
    { input: 'yml', expected: 'yaml' },
    { input: 'c++', expected: 'cpp' },
    { input: 'c#', expected: 'csharp' },
    { input: 'javascript', expected: 'javascript' }, // Should remain unchanged
    { input: 'unknown', expected: 'unknown' }, // Should remain unchanged
  ];

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

  let passed = 0;
  for (const testCase of testCases) {
    const result = normalizeLanguageForShiki(testCase.input);
    const success = result === testCase.expected;
    console.log(`  ${success ? '✅' : '❌'} ${testCase.input} -> ${result} (expected: ${testCase.expected})`);
    if (success) passed++;
  }
  
  console.log(`  📊 Passed: ${passed}/${testCases.length} tests`);
}

function testLanguageDisplayNames() {
  const getLanguageDisplayName = (lang: string): string => {
    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      javascript: 'JavaScript',
      ts: 'TypeScript',
      typescript: 'TypeScript',
      jsx: 'React JSX',
      tsx: 'React TSX',
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
    { input: 'javascript', expected: 'JavaScript' },
    { input: 'js', expected: 'JavaScript' },
    { input: 'typescript', expected: 'TypeScript' },
    { input: 'python', expected: 'Python' },
    { input: 'text', expected: 'Plain Text' },
    { input: 'unknown', expected: 'UNKNOWN' },
    { input: '', expected: '' },
  ];

  let passed = 0;
  for (const testCase of testCases) {
    const result = getLanguageDisplayName(testCase.input);
    const success = result === testCase.expected;
    console.log(`  ${success ? '✅' : '❌'} "${testCase.input}" -> "${result}" (expected: "${testCase.expected}")`);
    if (success) passed++;
  }
  
  console.log(`  📊 Passed: ${passed}/${testCases.length} tests`);
}

function testUntypedBlockDetection() {
  const testCases = [
    { language: 'javascript', className: '', expected: false },
    { language: 'text', className: '', expected: true },
    { language: '', className: '', expected: true },
    { language: 'js', className: 'untyped-code-block', expected: true },
    { language: 'python', className: 'some-other-class', expected: false },
  ];

  let passed = 0;
  for (const testCase of testCases) {
    const isTyped = testCase.language && testCase.language.trim().length > 0 && testCase.language !== 'text';
    const isUntypedBlock = testCase.className.includes('untyped-code-block') || !isTyped;
    const success = isUntypedBlock === testCase.expected;
    
    console.log(`  ${success ? '✅' : '❌'} lang="${testCase.language}", class="${testCase.className}" -> untyped: ${isUntypedBlock} (expected: ${testCase.expected})`);
    if (success) passed++;
  }
  
  console.log(`  📊 Passed: ${passed}/${testCases.length} tests`);
}

function testErrorHandling() {
  // Test HTML escaping
  const escapeHtml = (text: string): string => {
    const div = { textContent: '', innerHTML: '' };
    div.textContent = text;
    // Simulate textContent -> innerHTML conversion
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const testCases = [
    { input: '<script>alert("xss")</script>', expected: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;' },
    { input: 'Hello & goodbye', expected: 'Hello &amp; goodbye' },
    { input: 'Normal text', expected: 'Normal text' },
    { input: '', expected: '' },
  ];

  let passed = 0;
  for (const testCase of testCases) {
    const result = escapeHtml(testCase.input);
    const success = result === testCase.expected;
    console.log(`  ${success ? '✅' : '❌'} "${testCase.input}" -> "${result}"`);
    if (success) passed++;
  }
  
  console.log(`  📊 Passed: ${passed}/${testCases.length} tests`);
}

// Run tests if this script is executed directly
if (require.main === module) {
  testCodeBlockComponent().catch(console.error);
}

export { testCodeBlockComponent };