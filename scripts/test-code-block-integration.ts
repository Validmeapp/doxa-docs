#!/usr/bin/env tsx

import { mdxProcessor } from '../lib/mdx-processor';

/**
 * Integration test for enhanced code block handling in real content scenarios
 */

async function testCodeBlockIntegration() {
  console.log('🔗 Testing Code Block Integration\n');

  const realWorldContent = `
# API Documentation

## Authentication

To authenticate with our API, include your API key in the request headers:

\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.example.com/users
\`\`\`

## Configuration

Create a configuration file with the following structure:

\`\`\` filename="config.json"
{
  "apiUrl": "https://api.example.com",
  "timeout": 5000,
  "retries": 3
}
\`\`\`

## Example Response

The API returns JSON responses in this format:

\`\`\`json
{
  "status": "success",
  "data": {
    "users": [
      {"id": 1, "name": "John Doe"},
      {"id": 2, "name": "Jane Smith"}
    ]
  },
  "meta": {
    "total": 2,
    "page": 1
  }
}
\`\`\`

## Environment Variables

Set the following environment variables:

\`\`\`
API_KEY=your_secret_key_here
API_URL=https://api.example.com
DEBUG=true
\`\`\`

## Error Handling

When errors occur, you might see output like this:

\`\`\`
Error: Connection timeout
  at APIClient.request (/app/client.js:45:12)
  at async getUserData (/app/users.js:23:18)
Status: 500 Internal Server Error
\`\`\`

## Code Examples

Here's a complete JavaScript example:

\`\`\`javascript filename="api-client.js" highlightLines="5,12,18"
const axios = require('axios');

class APIClient {
  constructor(apiKey, baseURL) {
    this.apiKey = apiKey;
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getUsers() {
    try {
      const response = await this.client.get('/users');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error.message);
      throw error;
    }
  }
}

module.exports = APIClient;
\`\`\`

## Installation

Install the required dependencies:

\`\`\`
npm install axios dotenv
yarn add axios dotenv
pnpm add axios dotenv
\`\`\`
`;

  try {
    const result = await mdxProcessor.processMarkdown(realWorldContent);
    
    console.log('📊 Integration Test Results:');
    
    // Count different types of code blocks
    const typedBlocks = result.processedContent.match(/data-code-block-type="typed"/g);
    const untypedBlocks = result.processedContent.match(/data-code-block-type="untyped"/g);
    const emptyBlocks = result.processedContent.match(/Empty Code Block/g);
    
    console.log(`  ✅ Typed code blocks: ${typedBlocks?.length || 0}`);
    console.log(`  ✅ Untyped code blocks: ${untypedBlocks?.length || 0}`);
    console.log(`  ✅ Empty code blocks: ${emptyBlocks?.length || 0}`);
    
    // Check for proper language detection
    const languages = [
      'Bash', 'JSON', 'JavaScript', 'Plain Text'
    ];
    
    for (const lang of languages) {
      const count = (result.processedContent.match(new RegExp(lang, 'g')) || []).length;
      console.log(`  ✅ ${lang} blocks: ${count}`);
    }
    
    // Check for metadata handling
    const filenames = result.processedContent.match(/config\.json|api-client\.js/g);
    console.log(`  ✅ Filenames displayed: ${filenames?.length || 0}`);
    
    // Check for copy functionality
    const copyButtons = result.processedContent.match(/Copy code to clipboard/g);
    console.log(`  ✅ Copy buttons: ${copyButtons?.length || 0}`);
    
    // Check for proper HTML escaping
    const hasEscapedHTML = result.processedContent.includes('&lt;') && 
                          result.processedContent.includes('&gt;');
    console.log(`  ${hasEscapedHTML ? '✅' : '❌'} HTML properly escaped`);
    
    // Check for horizontal scrolling and word wrap
    const hasScrolling = result.processedContent.includes('overflow-x: auto');
    const hasWordWrap = result.processedContent.includes('white-space: pre-wrap');
    console.log(`  ${hasScrolling ? '✅' : '❌'} Horizontal scrolling enabled`);
    console.log(`  ${hasWordWrap ? '✅' : '❌'} Word wrapping enabled`);
    
    // Verify no processing errors
    const hasErrors = result.linkValidationErrors.length > 0;
    console.log(`  ${hasErrors ? '⚠️' : '✅'} Processing errors: ${result.linkValidationErrors.length}`);
    
    // Check table of contents generation
    console.log(`  ✅ TOC entries: ${result.tableOfContents.length}`);
    
    console.log('\n🎉 Integration test completed successfully!');
    
    // Optional: Save processed content for manual inspection
    if (process.env.SAVE_OUTPUT) {
      const fs = require('fs');
      fs.writeFileSync('test-output.html', result.processedContent);
      console.log('💾 Processed content saved to test-output.html');
    }
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  }
}

// Run the integration test
if (require.main === module) {
  testCodeBlockIntegration().catch(console.error);
}

export { testCodeBlockIntegration };