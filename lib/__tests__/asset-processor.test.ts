#!/usr/bin/env tsx

/**
 * Unit tests for Asset Processor
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  AssetProcessor, 
  AssetType, 
  ALLOWED_IMAGE_TYPES, 
  ALLOWED_BINARY_TYPES,
  MAX_FILE_SIZE 
} from '../asset-processor';

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

function assertArrayLength(array: any[], expectedLength: number, message: string) {
  assert(Array.isArray(array) && array.length === expectedLength, 
    `${message} (expected length: ${expectedLength}, actual: ${array?.length || 'not array'})`);
}

function assertContains(array: any[], item: any, message: string) {
  assert(Array.isArray(array) && array.includes(item), 
    `${message} (array should contain: ${item})`);
}

function assertMatches(actual: string, pattern: RegExp, message: string) {
  assert(pattern.test(actual), `${message} (${actual} should match ${pattern})`);
}

function assertDefined(value: any, message: string) {
  assert(value !== undefined && value !== null, `${message} (should be defined, got: ${value})`);
}

function assertThrows(fn: () => void, message: string) {
  try {
    fn();
    assert(false, `${message} (should have thrown an error)`);
  } catch (error) {
    assert(true, message);
  }
}

// Mock functions for testing
const mockFs = {
  readdir: null as any,
  stat: null as any,
  readFile: null as any,
  statSync: null as any
};

// Store original functions
const originalReaddir = fs.readdir;
const originalStat = fs.stat;
const originalReadFile = fs.readFile;
const originalStatSync = require('fs').statSync;

async function runTests() {
  console.log('🧪 Running Asset Processor Tests\n');

  const processor = new AssetProcessor('test-content', 'test-public/assets');

  // Test basic instantiation
  console.log('=== Testing AssetProcessor instantiation ===');
  assertDefined(processor, 'AssetProcessor should be instantiated');

  // Test MIME type detection
  console.log('\n=== Testing MIME type detection ===');
  
  // Access private method for testing
  const getMimeType = (processor as any).getMimeType.bind(processor);
  
  assertEqual(getMimeType('test.jpg'), 'image/jpeg', 'Should detect JPEG MIME type');
  assertEqual(getMimeType('test.jpeg'), 'image/jpeg', 'Should detect JPEG MIME type');
  assertEqual(getMimeType('test.png'), 'image/png', 'Should detect PNG MIME type');
  assertEqual(getMimeType('test.webp'), 'image/webp', 'Should detect WebP MIME type');
  assertEqual(getMimeType('test.svg'), 'image/svg+xml', 'Should detect SVG MIME type');
  assertEqual(getMimeType('test.pdf'), 'application/pdf', 'Should detect PDF MIME type');
  assertEqual(getMimeType('test.zip'), 'application/zip', 'Should detect ZIP MIME type');
  assertEqual(getMimeType('test.json'), 'application/json', 'Should detect JSON MIME type');
  assertEqual(getMimeType('test.csv'), 'text/csv', 'Should detect CSV MIME type');
  assertEqual(getMimeType('test.unknown'), 'application/octet-stream', 'Should return default for unknown types');

  // Test asset type determination
  console.log('\n=== Testing asset type determination ===');
  
  const determineAssetType = (processor as any).determineAssetType.bind(processor);
  
  assertEqual(determineAssetType('image/png'), AssetType.IMAGE, 'Should identify PNG as image');
  assertEqual(determineAssetType('image/jpeg'), AssetType.IMAGE, 'Should identify JPEG as image');
  assertEqual(determineAssetType('application/pdf'), AssetType.BINARY, 'Should identify PDF as binary');
  assertEqual(determineAssetType('text/csv'), AssetType.BINARY, 'Should identify CSV as binary');
  assertEqual(determineAssetType('application/octet-stream'), AssetType.UNKNOWN, 'Should identify unknown types');

  // Test path sanitization
  console.log('\n=== Testing path sanitization ===');
  
  const sanitizePath = (processor as any).sanitizePath.bind(processor);
  
  assertEqual(sanitizePath('normal/path.png'), 'normal/path.png', 'Should not modify normal paths');
  assertEqual(sanitizePath('./relative/path.png'), 'relative/path.png', 'Should sanitize relative paths');
  
  assertThrows(() => sanitizePath('../../etc/passwd'), 'Should reject path traversal attempts');
  assertThrows(() => sanitizePath('~/secret.txt'), 'Should reject home directory access');

  // Test validation with mock file system
  console.log('\n=== Testing asset validation ===');
  
  // Mock a valid file
  require('fs').statSync = () => ({ size: 1024 });
  
  const validResult = processor.validateAsset('/test/valid.png');
  assert(validResult.isValid, 'Valid PNG file should pass validation');
  assertArrayLength(validResult.errors, 0, 'Valid file should have no errors');

  // Mock a file that's too large
  require('fs').statSync = () => ({ size: MAX_FILE_SIZE + 1 });
  
  const largeResult = processor.validateAsset('/test/large.png');
  assert(!largeResult.isValid, 'Large file should fail validation');
  assert(largeResult.errors.some(error => error.includes('File size exceeds')), 'Should have size error');

  // Mock a non-existent file
  require('fs').statSync = () => {
    throw new Error('ENOENT: no such file or directory');
  };
  
  const missingResult = processor.validateAsset('/test/missing.png');
  assert(!missingResult.isValid, 'Missing file should fail validation');
  assertContains(missingResult.errors, 'File does not exist: /test/missing.png', 'Should have file not found error');

  // Mock an invalid file type
  require('fs').statSync = () => ({ size: 1024 });
  
  const invalidResult = processor.validateAsset('/test/script.exe');
  assert(!invalidResult.isValid, 'Invalid file type should fail validation');
  assert(invalidResult.errors.some(error => error.includes('File type not allowed')), 'Should have file type error');

  // Test manifest generation
  console.log('\n=== Testing manifest generation ===');
  
  const mockAssets = [
    {
      sourcePath: '/test/image.png',
      relativePath: 'en/v1/assets/images/image.png',
      locale: 'en',
      version: 'v1',
      type: AssetType.IMAGE,
      referencedBy: ['page1.mdx'],
      publicPath: '/assets/en/v1/images/image.abc123.png',
      hashedFilename: 'image.abc123.png',
      contentHash: 'abc123def456',
      fileSize: 1024,
      mimeType: 'image/png'
    },
    {
      sourcePath: '/test/doc.pdf',
      relativePath: 'es/v1/assets/files/doc.pdf',
      locale: 'es',
      version: 'v1',
      type: AssetType.BINARY,
      referencedBy: ['page2.mdx'],
      publicPath: '/assets/es/v1/files/doc.def456.pdf',
      hashedFilename: 'doc.def456.pdf',
      contentHash: 'def456ghi789',
      fileSize: 2048,
      mimeType: 'application/pdf'
    }
  ];

  const manifest = processor.generateManifest(mockAssets);
  
  assertEqual(manifest.version, '1.0.0', 'Manifest should have correct version');
  assertDefined(manifest.generatedAt, 'Manifest should have generation timestamp');
  assertArrayLength(manifest.locales, 2, 'Manifest should have correct locales');
  assertContains(manifest.locales, 'en', 'Manifest should contain en locale');
  assertContains(manifest.locales, 'es', 'Manifest should contain es locale');
  assertArrayLength(manifest.versions, 1, 'Manifest should have correct versions');
  assertContains(manifest.versions, 'v1', 'Manifest should contain v1 version');
  assertEqual(Object.keys(manifest.assets).length, 2, 'Manifest should have correct number of assets');
  
  const imageEntry = manifest.assets['en/v1/assets/images/image.png'];
  assertDefined(imageEntry, 'Image entry should exist in manifest');
  assertEqual(imageEntry.publicPath, '/assets/en/v1/images/image.abc123.png', 'Image entry should have correct public path');
  assertEqual(imageEntry.locale, 'en', 'Image entry should have correct locale');
  assertEqual(imageEntry.version, 'v1', 'Image entry should have correct version');
  assertContains(imageEntry.metadata.referencedBy, 'page1.mdx', 'Image entry should have correct references');

  // Test empty manifest generation
  const emptyManifest = processor.generateManifest([]);
  assertEqual(Object.keys(emptyManifest.assets).length, 0, 'Empty manifest should have no assets');
  assertArrayLength(emptyManifest.locales, 0, 'Empty manifest should have no locales');
  assertArrayLength(emptyManifest.versions, 0, 'Empty manifest should have no versions');

  // Restore original fs functions
  require('fs').statSync = originalStatSync;

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