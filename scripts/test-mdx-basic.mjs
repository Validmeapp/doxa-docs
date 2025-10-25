import { mdxProcessor } from '../lib/mdx-processor.js';

async function testMDXProcessor() {
  console.log('🧪 Testing MDX Processor...\n');

  try {
    // Test markdown processing
    console.log('🔄 Testing markdown processing...');
    const sampleMarkdown = `
# Main Title

This is some content with a [link to overview](overview) and an [external link](https://example.com).

## Section 1

Some content here.

### Subsection 1.1

More content.

## Section 2

Final section with \`inline code\` and:

\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

### Subsection 2.1

Last subsection.
`;

    const result = await mdxProcessor.processMarkdown(sampleMarkdown);
    console.log('📋 Generated TOC:');
    result.tableOfContents.forEach((item, index) => {
      const indent = '  '.repeat(item.level - 2);
      console.log(`  ${indent}${index + 1}. ${item.title} (${item.id})`);
    });

    if (result.linkValidationErrors.length > 0) {
      console.log('\n⚠️  Link validation errors:');
      result.linkValidationErrors.forEach(error => console.log(`  ❌ ${error}`));
    } else {
      console.log('\n✅ No link validation errors in sample content');
    }

    console.log('\n✅ MDX processor test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testMDXProcessor();