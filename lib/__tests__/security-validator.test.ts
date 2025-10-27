#!/usr/bin/env tsx

/**
 * Security-focused unit tests for SecurityValidator
 */

import { SecurityValidator } from '../security-validator';
import { promises as fs } from 'fs';

// Simple test framework
let testCount = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  testCount++;
  if (condition) {
    passedTests++;
    console.log(`✅ ${message}`);
  } else {
    failedTests++;
    console.log(`❌ ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  assert(actual === expected, `${message} (expected: ${expected}, actual: ${actual})`);
}

function assertContains(array: any[], item: any, message: string) {
  assert(Array.isArray(array) && array.includes(item), 
    `${message} (array should contain: ${item})`);
}

function assertThrows(fn: () => void, message: string) {
  try {
    fn();
    assert(false, `${message} (should have thrown an error)`);
  } catch (error) {
    assert(true, message);
  }
}

function assertAsync(promise: Promise<boolean>, message: string): Promise<void> {
  return promise.then(result => {
    assert(result, message);
  }).catch(() => {
    assert(false, `${message} (promise rejected)`);
  });
}

async function runTests() {
  console.log('🧪 Running Security Validator Tests\n');

  // Test basic instantiation
  console.log('=== Testing SecurityValidator instantiation ===');
  
  const validator = new SecurityValidator();
  assert(validator !== null && validator !== undefined, 'SecurityValidator should be instantiated');

  const customValidator = new SecurityValidator({
    maxFileSize: 5 * 1024 * 1024, // 5MB
    enableContentScanning: false,
    strictPathValidation: false
  });
  assert(customValidator !== null && customValidator !== undefined, 'Custom SecurityValidator should be instantiated');

  // Test file type validation
  console.log('\n=== Testing file type validation ===');
  
  assertEqual(validator.validateFileType('test.png'), true, 'PNG files should be allowed');
  assertEqual(validator.validateFileType('test.jpg'), true, 'JPG files should be allowed');
  assertEqual(validator.validateFileType('test.jpeg'), true, 'JPEG files should be allowed');
  assertEqual(validator.validateFileType('test.webp'), true, 'WebP files should be allowed');
  assertEqual(validator.validateFileType('test.gif'), true, 'GIF files should be allowed');
  assertEqual(validator.validateFileType('test.svg'), true, 'SVG files should be allowed');
  assertEqual(validator.validateFileType('test.pdf'), true, 'PDF files should be allowed');
  assertEqual(validator.validateFileType('test.zip'), true, 'ZIP files should be allowed');
  assertEqual(validator.validateFileType('test.json'), true, 'JSON files should be allowed');
  assertEqual(validator.validateFileType('test.csv'), true, 'CSV files should be allowed');
  assertEqual(validator.validateFileType('test.txt'), true, 'TXT files should be allowed');
  
  assertEqual(validator.validateFileType('test.exe'), false, 'EXE files should be rejected');
  assertEqual(validator.validateFileType('test.bat'), false, 'BAT files should be rejected');
  assertEqual(validator.validateFileType('test.sh'), false, 'Shell scripts should be rejected');
  assertEqual(validator.validateFileType('test.php'), false, 'PHP files should be rejected');
  assertEqual(validator.validateFileType('test.js'), false, 'JavaScript files should be rejected');

  // Test path sanitization
  console.log('\n=== Testing path sanitization ===');
  
  assertEqual(validator.sanitizePath('normal/path.png'), 'normal/path.png', 'Normal paths should not be modified');
  assertEqual(validator.sanitizePath('./relative/path.png'), 'relative/path.png', 'Relative paths should be sanitized');
  assertEqual(validator.sanitizePath('/absolute/path.png'), 'absolute/path.png', 'Leading slashes should be removed');
  assertEqual(validator.sanitizePath('\\windows\\path.png'), 'windows/path.png', 'Windows paths should be normalized');
  
  // Test dangerous path rejection
  assertThrows(() => validator.sanitizePath('../../../etc/passwd'), 'Path traversal should be rejected');
  assertThrows(() => validator.sanitizePath('~/secret.txt'), 'Home directory access should be rejected');
  assertThrows(() => validator.sanitizePath('/etc/passwd'), 'System directory access should be rejected');
  assertThrows(() => validator.sanitizePath('/proc/version'), 'Process filesystem access should be rejected');
  assertThrows(() => validator.sanitizePath('path\0injection'), 'Null byte injection should be rejected');

  // Test lenient path validation
  const lenientValidator = new SecurityValidator({ strictPathValidation: false });
  assertEqual(lenientValidator.sanitizePath('../test.png'), 'test.png', 'Lenient validator should sanitize but not throw');

  // Test file size validation
  console.log('\n=== Testing file size validation ===');
  
  // Mock fs.statSync for size tests
  const originalStatSync = require('fs').statSync;
  
  // Mock small file
  require('fs').statSync = () => ({ size: 1024 });
  assertEqual(validator.checkFileSize('/test/small.png'), true, 'Small files should pass size check');
  
  // Mock large file
  require('fs').statSync = () => ({ size: 15 * 1024 * 1024 }); // 15MB
  assertEqual(validator.checkFileSize('/test/large.png'), false, 'Large files should fail size check');
  
  // Mock non-existent file
  require('fs').statSync = () => {
    throw new Error('ENOENT');
  };
  assertEqual(validator.checkFileSize('/test/missing.png'), false, 'Missing files should fail size check');
  
  // Restore original function
  require('fs').statSync = originalStatSync;

  // Test malicious content scanning
  console.log('\n=== Testing malicious content scanning ===');
  
  // Mock fs.open and file operations for content scanning
  const originalOpen = fs.open;
  
  // Mock safe image content
  const mockSafeImageContent = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG signature
  fs.open = async () => ({
    read: async (buffer: Buffer) => {
      mockSafeImageContent.copy(buffer);
      return { bytesRead: mockSafeImageContent.length };
    },
    close: async () => {}
  } as any);
  
  await assertAsync(validator.scanForMaliciousContent('/test/safe.png'), 'Safe PNG content should pass scan');
  
  // Mock executable content
  const mockExecutableContent = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // PE executable signature
  fs.open = async () => ({
    read: async (buffer: Buffer) => {
      mockExecutableContent.copy(buffer);
      return { bytesRead: mockExecutableContent.length };
    },
    close: async () => {}
  } as any);
  
  const executableResult = await validator.scanForMaliciousContent('/test/malicious.png');
  assertEqual(executableResult, false, 'Executable content should fail scan');
  
  // Mock script content in image
  const mockScriptContent = Buffer.from('<script>alert("xss")</script>');
  fs.open = async () => ({
    read: async (buffer: Buffer) => {
      mockScriptContent.copy(buffer);
      return { bytesRead: mockScriptContent.length };
    },
    close: async () => {}
  } as any);
  
  const scriptResult = await validator.scanForMaliciousContent('/test/script.png');
  assertEqual(scriptResult, false, 'Script content should fail scan');
  
  // Test disabled content scanning
  const noScanValidator = new SecurityValidator({ enableContentScanning: false });
  await assertAsync(noScanValidator.scanForMaliciousContent('/test/any.png'), 'Disabled scanning should always pass');
  
  // Restore original function
  fs.open = originalOpen;

  // Test comprehensive asset validation
  console.log('\n=== Testing comprehensive asset validation ===');
  
  // Mock valid file
  require('fs').statSync = () => ({ size: 1024 });
  fs.open = async () => ({
    read: async (buffer: Buffer) => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      pngSignature.copy(buffer);
      return { bytesRead: pngSignature.length };
    },
    close: async () => {}
  } as any);
  
  const validResult = await validator.validateAsset('/test/valid.png');
  assertEqual(validResult.isValid, true, 'Valid asset should pass comprehensive validation');
  assertEqual(validResult.errors.length, 0, 'Valid asset should have no errors');
  
  // Mock invalid file type
  const invalidTypeResult = await validator.validateAsset('/test/invalid.exe');
  assertEqual(invalidTypeResult.isValid, false, 'Invalid file type should fail validation');
  assertContains(invalidTypeResult.errors, 'File type not allowed: application/octet-stream', 'Should have file type error');
  
  // Mock large file
  require('fs').statSync = () => ({ size: 15 * 1024 * 1024 });
  
  const largeFileResult = await validator.validateAsset('/test/large.png');
  assertEqual(largeFileResult.isValid, false, 'Large file should fail validation');
  assert(largeFileResult.errors.some(error => error.includes('File size exceeds')), 'Should have size error');
  
  // Mock non-existent file
  require('fs').statSync = () => {
    throw new Error('ENOENT');
  };
  
  const missingResult = await validator.validateAsset('/test/missing.png');
  assertEqual(missingResult.isValid, false, 'Missing file should fail validation');
  assertContains(missingResult.errors, 'File does not exist: /test/missing.png', 'Should have file not found error');

  // Test batch validation
  console.log('\n=== Testing batch asset validation ===');
  
  // Reset mocks for batch test
  require('fs').statSync = () => ({ size: 1024 });
  fs.open = async (filePath: string) => ({
    read: async (buffer: Buffer) => {
      // Return appropriate signature based on file extension
      let signature: Buffer;
      if (filePath.includes('.png')) {
        signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // PNG
      } else if (filePath.includes('.jpg')) {
        signature = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG
      } else {
        signature = Buffer.from([0x00, 0x00, 0x00, 0x00]); // Invalid
      }
      signature.copy(buffer);
      return { bytesRead: signature.length };
    },
    close: async () => {}
  } as any);
  
  const batchResults = await validator.validateAssets([
    '/test/valid1.png',
    '/test/valid2.jpg',
    '/test/invalid.exe'
  ]);
  
  assertEqual(Object.keys(batchResults).length, 3, 'Batch validation should return results for all files');
  assertEqual(batchResults['/test/valid1.png'].isValid, true, 'First valid file should pass');
  
  // Debug the second file result
  if (!batchResults['/test/valid2.jpg'].isValid) {
    console.log('Second file errors:', batchResults['/test/valid2.jpg'].errors);
  }
  assertEqual(batchResults['/test/valid2.jpg'].isValid, true, 'Second valid file should pass');
  assertEqual(batchResults['/test/invalid.exe'].isValid, false, 'Invalid file should fail');

  // Test image signature validation
  console.log('\n=== Testing image signature validation ===');
  
  // Test PNG signature validation
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
  fs.open = async () => ({
    read: async (buffer: Buffer) => {
      pngBuffer.copy(buffer);
      return { bytesRead: pngBuffer.length };
    },
    close: async () => {}
  } as any);
  
  const pngResult = await validator.scanForMaliciousContent('/test/valid.png');
  assertEqual(pngResult, true, 'Valid PNG signature should pass');
  
  // Test JPEG signature validation
  const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
  fs.open = async () => ({
    read: async (buffer: Buffer) => {
      jpegBuffer.copy(buffer);
      return { bytesRead: jpegBuffer.length };
    },
    close: async () => {}
  } as any);
  
  const jpegResult = await validator.scanForMaliciousContent('/test/valid.jpg');
  assertEqual(jpegResult, true, 'Valid JPEG signature should pass');
  
  // Test invalid image signature
  const invalidImageBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  fs.open = async () => ({
    read: async (buffer: Buffer) => {
      invalidImageBuffer.copy(buffer);
      return { bytesRead: invalidImageBuffer.length };
    },
    close: async () => {}
  } as any);
  
  const invalidImageResult = await validator.scanForMaliciousContent('/test/invalid.png');
  assertEqual(invalidImageResult, false, 'Invalid image signature should fail');

  // Restore original functions
  require('fs').statSync = originalStatSync;
  fs.open = originalOpen;

  // Print results
  console.log('\n=== Test Results ===');
  console.log(`Total tests: ${testCount}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  
  if (failedTests === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${failedTests} test(s) failed`);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}