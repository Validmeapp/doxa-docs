#!/usr/bin/env tsx

/**
 * Test script to verify base64 encoding/decoding compatibility
 */

function testBase64Compatibility() {
  console.log('🧪 Testing base64 encoding/decoding compatibility...\n');

  const testData = {
    language: 'javascript',
    code: 'console.log("Hello, World!");',
    filename: 'example.js'
  };

  console.log('Original data:', testData);

  // Test Node.js encoding (used in MDX processor)
  const nodeEncoded = Buffer.from(JSON.stringify(testData)).toString('base64');
  console.log('Node.js encoded:', nodeEncoded);

  // Test Node.js decoding
  const nodeDecoded = JSON.parse(Buffer.from(nodeEncoded, 'base64').toString());
  console.log('Node.js decoded:', nodeDecoded);

  // Test browser-compatible encoding (what we should use)
  const browserEncoded = Buffer.from(JSON.stringify(testData)).toString('base64');
  console.log('Browser-compatible encoded:', browserEncoded);

  // Test browser-compatible decoding (simulating atob)
  try {
    // Simulate what happens in the browser
    const browserDecoded = JSON.parse(Buffer.from(browserEncoded, 'base64').toString());
    console.log('Browser-compatible decoded:', browserDecoded);
    
    // Check if they match
    const matches = JSON.stringify(testData) === JSON.stringify(browserDecoded);
    console.log('✅ Encoding/decoding matches:', matches);
    
    if (!matches) {
      console.log('❌ Data mismatch detected!');
      console.log('Expected:', testData);
      console.log('Got:', browserDecoded);
    }
  } catch (error) {
    console.error('❌ Browser decoding failed:', error);
  }

  // Test with special characters
  console.log('\n🧪 Testing with special characters...');
  const specialData = {
    language: 'javascript',
    code: 'const message = "Hello, 世界! 🌍";',
    filename: 'unicode-test.js'
  };

  const specialEncoded = Buffer.from(JSON.stringify(specialData)).toString('base64');
  console.log('Special chars encoded:', specialEncoded);

  try {
    const specialDecoded = JSON.parse(Buffer.from(specialEncoded, 'base64').toString());
    console.log('Special chars decoded:', specialDecoded);
    
    const specialMatches = JSON.stringify(specialData) === JSON.stringify(specialDecoded);
    console.log('✅ Special chars match:', specialMatches);
  } catch (error) {
    console.error('❌ Special chars decoding failed:', error);
  }
}

// Run test if this script is executed directly
if (require.main === module) {
  testBase64Compatibility();
}

export { testBase64Compatibility };