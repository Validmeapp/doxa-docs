#!/usr/bin/env tsx

import { mdxProcessor } from '../lib/mdx-processor';

/**
 * Comprehensive test script for enhanced code block handling
 * Tests both typed and untyped code fences with various scenarios
 */

async function testEnhancedCodeBlockHandling() {
  console.log('🧪 Testing Enhanced Code Block Handling\n');

  // Test 1: Typed code blocks (existing functionality)
  console.log('📝 Test 1: Typed Code Blocks');
  await testTypedCodeBlocks();

  // Test 2: Untyped code blocks (new functionality)
  console.log('\n📝 Test 2: Untyped Code Blocks');
  await testUntypedCodeBlocks();

  // Test 3: Empty code blocks
  console.log('\n📝 Test 3: Empty Code Blocks');
  await testEmptyCodeBlocks();

  // Test 4: Mixed typed and untyped blocks
  console.log('\n📝 Test 4: Mixed Code Blocks');
  await testMixedCodeBlocks();

  // Test 5: Code blocks with special characters
  console.log('\n📝 Test 5: Special Characters');
  await testSpecialCharacters();

  // Test 6: Code blocks with metadata
  console.log('\n📝 Test 6: Code Blocks with Metadata');
  await testCodeBlocksWithMetadata();

  // Test 7: Very long code blocks
  console.log('\n📝 Test 7: Long Code Blocks');
  await testLongCodeBlocks();

  console.log('\n🎉 Enhanced code block handling tests completed!');
}

async function testTypedCodeBlocks() {
  const testContent = `
# Typed Code Blocks Test

JavaScript example:
\`\`\`javascript
const greeting = "Hello World";
console.log(greeting);
\`\`\`

Python example:
\`\`\`python
def greet(name):
    return f"Hello, {name}!"
print(greet("World"))
\`\`\`

JSON example:
\`\`\`json
{
  "name": "test",
  "version": "1.0.0",
  "dependencies": {}
}
\`\`\`

Shell example:
\`\`\`bash
npm install
npm run build
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    
    // Check for proper language badges
    const languageBadges = result.processedContent.match(/background: #3b82f6[^>]*>([^<]+)</g);
    console.log(`  ✅ Found ${languageBadges?.length || 0} typed language badges`);
    
    // Check for proper code block structure
    const codeBlocks = result.processedContent.match(/data-code-block-type="typed"/g);
    console.log(`  ✅ Found ${codeBlocks?.length || 0} typed code blocks`);
    
    // Verify copy functionality is present
    const copyButtons = result.processedContent.match(/Copy code to clipboard/g);
    console.log(`  ✅ Found ${copyButtons?.length || 0} copy buttons`);
    
  } catch (error) {
    console.error('  ❌ Error testing typed code blocks:', error);
  }
}

async function testUntypedCodeBlocks() {
  const testContent = `
# Untyped Code Blocks Test

Plain text example:
\`\`\`
This is plain text without any language specification.
It should render with neutral styling and no syntax highlighting.
\`\`\`

Configuration example:
\`\`\`
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
}
\`\`\`

Command output example:
\`\`\`
$ npm install
added 1234 packages in 45s
\`\`\`

Mixed content:
\`\`\`
Here's some mixed content:
- URLs: https://example.com
- Commands: npm run dev
- File paths: /path/to/file.txt
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    
    // Check for untyped code block markers
    const untypedBlocks = result.processedContent.match(/data-code-block-type="untyped"/g);
    console.log(`  ✅ Found ${untypedBlocks?.length || 0} untyped code blocks`);
    
    // Check for "Plain Text" badges
    const plainTextBadges = result.processedContent.match(/Plain Text/g);
    console.log(`  ✅ Found ${plainTextBadges?.length || 0} "Plain Text" badges`);
    
    // Check for "No syntax highlighting" indicators
    const noHighlightIndicators = result.processedContent.match(/No syntax highlighting/g);
    console.log(`  ✅ Found ${noHighlightIndicators?.length || 0} "No syntax highlighting" indicators`);
    
    // Verify copy functionality still works
    const copyButtons = result.processedContent.match(/Copy code to clipboard/g);
    console.log(`  ✅ Found ${copyButtons?.length || 0} copy buttons`);
    
  } catch (error) {
    console.error('  ❌ Error testing untyped code blocks:', error);
  }
}

async function testEmptyCodeBlocks() {
  const testContent = `
# Empty Code Blocks Test

Empty typed block:
\`\`\`javascript
\`\`\`

Empty untyped block:
\`\`\`
\`\`\`

Block with only whitespace:
\`\`\`python
   
   
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    
    // Check for empty code block handling
    const emptyBlockMessages = result.processedContent.match(/This code block is empty/g);
    console.log(`  ✅ Found ${emptyBlockMessages?.length || 0} empty block messages`);
    
    // Check for empty code block badges
    const emptyBadges = result.processedContent.match(/Empty Code Block/g);
    console.log(`  ✅ Found ${emptyBadges?.length || 0} empty code block badges`);
    
  } catch (error) {
    console.error('  ❌ Error testing empty code blocks:', error);
  }
}

async function testMixedCodeBlocks() {
  const testContent = `
# Mixed Code Blocks Test

Typed JavaScript:
\`\`\`javascript
function hello() {
  console.log("Hello!");
}
\`\`\`

Untyped configuration:
\`\`\`
# This is a config file
debug = true
port = 3000
\`\`\`

Typed JSON:
\`\`\`json
{"mixed": "content", "test": true}
\`\`\`

Untyped command sequence:
\`\`\`
cd project
npm install
npm start
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    
    // Count typed vs untyped blocks
    const typedBlocks = result.processedContent.match(/data-code-block-type="typed"/g);
    const untypedBlocks = result.processedContent.match(/data-code-block-type="untyped"/g);
    
    console.log(`  ✅ Found ${typedBlocks?.length || 0} typed blocks`);
    console.log(`  ✅ Found ${untypedBlocks?.length || 0} untyped blocks`);
    
    // Verify both types have copy functionality
    const copyButtons = result.processedContent.match(/Copy code to clipboard/g);
    console.log(`  ✅ Found ${copyButtons?.length || 0} copy buttons total`);
    
  } catch (error) {
    console.error('  ❌ Error testing mixed code blocks:', error);
  }
}

async function testSpecialCharacters() {
  const testContent = `
# Special Characters Test

HTML entities:
\`\`\`html
<div class="test">&lt;script&gt;alert('xss')&lt;/script&gt;</div>
\`\`\`

Special symbols:
\`\`\`
Special characters: < > & " ' 
Unicode: 🚀 ✅ ❌ 📝
Math symbols: ∑ ∆ π ∞
\`\`\`

Code with quotes:
\`\`\`javascript
const message = "Hello 'World'";
const template = \`Template \${variable}\`;
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    
    // Check that HTML entities are properly escaped
    const hasEscapedEntities = result.processedContent.includes('&lt;') && 
                              result.processedContent.includes('&gt;') &&
                              result.processedContent.includes('&amp;');
    console.log(`  ${hasEscapedEntities ? '✅' : '❌'} HTML entities properly escaped`);
    
    // Check that Unicode characters are preserved
    const hasUnicode = result.processedContent.includes('🚀') && 
                      result.processedContent.includes('✅');
    console.log(`  ${hasUnicode ? '✅' : '❌'} Unicode characters preserved`);
    
  } catch (error) {
    console.error('  ❌ Error testing special characters:', error);
  }
}

async function testCodeBlocksWithMetadata() {
  const testContent = `
# Code Blocks with Metadata Test

With filename:
\`\`\`javascript filename="app.js"
console.log("Hello from app.js");
\`\`\`

Untyped with filename:
\`\`\` filename="config.txt"
debug=true
port=3000
\`\`\`

With multiple attributes:
\`\`\`python filename="script.py" highlightLines="1,3"
def main():
    print("Hello")
    return True
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    
    // Check for filename display
    const filenames = result.processedContent.match(/app\.js|config\.txt|script\.py/g);
    console.log(`  ✅ Found ${filenames?.length || 0} filename references`);
    
    // Count all code block types
    const typedBlocks = result.processedContent.match(/data-code-block-type="typed"/g);
    const untypedBlocks = result.processedContent.match(/data-code-block-type="untyped"/g);
    console.log(`  ✅ Found ${typedBlocks?.length || 0} typed blocks, ${untypedBlocks?.length || 0} untyped blocks`);
    
    // Verify metadata parsing doesn't break untyped blocks
    const untypedWithMeta = result.processedContent.includes('data-code-block-type="untyped"') && 
                           result.processedContent.includes('config.txt');
    console.log(`  ${untypedWithMeta ? '✅' : '❌'} Untyped blocks with metadata work`);
    
  } catch (error) {
    console.error('  ❌ Error testing code blocks with metadata:', error);
  }
}

async function testLongCodeBlocks() {
  // Generate a long code block
  const longCode = Array(50).fill(0).map((_, i) => 
    `console.log("This is line ${i + 1} of a very long code block");`
  ).join('\n');

  const testContent = `
# Long Code Blocks Test

Long typed block:
\`\`\`javascript
${longCode}
\`\`\`

Long untyped block:
\`\`\`
${Array(30).fill(0).map((_, i) => 
  `Line ${i + 1}: This is a long untyped code block with various content`
).join('\n')}
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    
    // Check that long blocks are handled properly
    const hasScrolling = result.processedContent.includes('overflow-x: auto');
    console.log(`  ${hasScrolling ? '✅' : '❌'} Horizontal scrolling enabled`);
    
    // Check that word wrapping is enabled
    const hasWordWrap = result.processedContent.includes('white-space: pre-wrap');
    console.log(`  ${hasWordWrap ? '✅' : '❌'} Word wrapping enabled`);
    
    // Verify copy functionality works with long content
    const copyButtons = result.processedContent.match(/Copy code to clipboard/g);
    console.log(`  ✅ Found ${copyButtons?.length || 0} copy buttons for long blocks`);
    
  } catch (error) {
    console.error('  ❌ Error testing long code blocks:', error);
  }
}

// Additional utility function to test error handling
async function testErrorHandling() {
  console.log('\n📝 Test 8: Error Handling');
  
  const testContent = `
# Error Handling Test

Invalid language (should fallback gracefully):
\`\`\`nonexistentlanguage
This should still render properly
\`\`\`

Malformed block (missing closing):
\`\`\`javascript
const test = "incomplete
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    console.log('  ✅ Error handling test completed without crashing');
    
    // Check that content is still processed
    const hasContent = result.processedContent.length > 0;
    console.log(`  ${hasContent ? '✅' : '❌'} Content still processed despite errors`);
    
  } catch (error) {
    console.error('  ❌ Error in error handling test:', error);
  }
}

// Run all tests
if (require.main === module) {
  testEnhancedCodeBlockHandling()
    .then(() => testErrorHandling())
    .catch(console.error);
}

export { testEnhancedCodeBlockHandling };