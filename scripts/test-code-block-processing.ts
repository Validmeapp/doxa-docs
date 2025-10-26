import { mdxProcessor } from '../lib/mdx-processor';

async function testCodeBlockProcessing() {
  const testContent = `
# Test Document

Here's a code block:

\`\`\`javascript filename="example.js" highlightLines="1,2"
const greeting = "Hello World";
console.log(greeting);
\`\`\`

And another one:

\`\`\`json
{
  "name": "test",
  "value": 123
}
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(testContent);
    console.log('Processed content:');
    console.log(result.processedContent);
    console.log('\nTable of contents:');
    console.log(JSON.stringify(result.tableOfContents, null, 2));
  } catch (error) {
    console.error('Error processing MDX:', error);
  }
}

testCodeBlockProcessing();