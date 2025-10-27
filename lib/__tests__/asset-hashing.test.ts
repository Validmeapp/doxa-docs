#!/usr/bin/env tsx

/**
 * Unit tests for Asset Hashing and Manifest Generation
 */

import { AssetProcessor, AssetType } from '../asset-processor';
import crypto from 'crypto';

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

function assertNotEqual(actual: any, expected: any, message: string) {
  assert(actual !== expected, `${message} (should not equal: ${expected})`);
}

function assertMatches(actual: string, pattern: RegExp, message: string) {
  assert(pattern.test(actual), `${message} (${actual} should match ${pattern})`);
}

function assertDefined(value: any, message: string) {
  assert(value !== undefined && value !== null, `${message} (should be defined, got: ${value})`);
}

async function runTests() {
  console.log('🧪 Running Asset Hashing and Manifest Generation Tests\n');

  const processor = new AssetProcessor('test-content', 'test-public/assets');

  // Test content hashing consistency
  console.log('=== Testing content hashing consistency ===');
  
  // Access private method for testing
  const generateContentHash = (processor as any).generateContentHash.bind(processor);
  
  const testContent1 = Buffer.from('test content for hashing');
  const testContent2 = Buffer.from('test content for hashing'); // Same content
  const testContent3 = Buffer.from('different content for hashing');
  
  const hash1 = generateContentHash(testContent1);
  const hash2 = generateContentHash(testContent2);
  const hash3 = generateContentHash(testContent3);
  
  assertEqual(hash1, hash2, 'Same content should produce same hash');
  assertNotEqual(hash1, hash3, 'Different content should produce different hash');
  assertMatches(hash1, /^[a-f0-9]{64}$/, 'Hash should be 64-character hex string');
  
  // Verify hash is actually SHA-256
  const expectedHash = crypto.createHash('sha256').update(testContent1).digest('hex');
  assertEqual(hash1, expectedHash, 'Hash should match SHA-256 output');

  // Test hashed filename generation
  console.log('\n=== Testing hashed filename generation ===');
  
  // Mock fs for processAsset test
  const originalStat = require('fs').promises.stat;
  const originalReadFile = require('fs').promises.readFile;
  
  require('fs').promises.stat = async () => ({ size: 1024 });
  require('fs').promises.readFile = async () => Buffer.from('test image content');
  
  const testAsset = {
    sourcePath: '/test/content/en/v1/assets/images/test-image.png',
    relativePath: 'en/v1/assets/images/test-image.png',
    locale: 'en',
    version: 'v1',
    type: AssetType.IMAGE,
    referencedBy: []
  };
  
  const processed1 = await processor.processAsset(testAsset);
  const processed2 = await processor.processAsset(testAsset);
  
  assertEqual(processed1.hashedFilename, processed2.hashedFilename, 'Same asset should produce same hashed filename');
  assertEqual(processed1.contentHash, processed2.contentHash, 'Same asset should produce same content hash');
  assertMatches(processed1.hashedFilename, /^test-image\.[a-f0-9]{8}\.png$/, 'Hashed filename should have correct format');
  
  // Test different assets produce different hashes
  const differentAsset = {
    ...testAsset,
    sourcePath: '/test/content/en/v1/assets/images/different-image.png',
    relativePath: 'en/v1/assets/images/different-image.png'
  };
  
  require('fs').promises.readFile = async () => Buffer.from('different image content');
  
  const processedDifferent = await processor.processAsset(differentAsset);
  assertNotEqual(processed1.contentHash, processedDifferent.contentHash, 'Different assets should have different hashes');
  assertNotEqual(processed1.hashedFilename, processedDifferent.hashedFilename, 'Different assets should have different hashed filenames');

  // Test manifest structure and consistency
  console.log('\n=== Testing manifest structure ===');
  
  const assets = [processed1, processedDifferent];
  const manifest1 = processor.generateManifest(assets);
  const manifest2 = processor.generateManifest(assets);
  
  // Manifests should have same structure (except timestamp)
  assertEqual(manifest1.version, manifest2.version, 'Manifest versions should be consistent');
  assertEqual(Object.keys(manifest1.assets).length, Object.keys(manifest2.assets).length, 'Manifest should have same number of assets');
  assertEqual(manifest1.locales.length, manifest2.locales.length, 'Manifest should have same locales');
  assertEqual(manifest1.versions.length, manifest2.versions.length, 'Manifest should have same versions');
  
  // Test manifest asset entries
  const assetKey = processed1.relativePath;
  const manifestEntry = manifest1.assets[assetKey];
  
  assertDefined(manifestEntry, 'Manifest should contain asset entry');
  assertEqual(manifestEntry.contentHash, processed1.contentHash, 'Manifest entry should have correct content hash');
  assertEqual(manifestEntry.hashedFilename, processed1.hashedFilename, 'Manifest entry should have correct hashed filename');
  assertEqual(manifestEntry.originalPath, processed1.relativePath, 'Manifest entry should have correct original path');
  assertEqual(manifestEntry.fileSize, processed1.fileSize, 'Manifest entry should have correct file size');
  assertEqual(manifestEntry.mimeType, processed1.mimeType, 'Manifest entry should have correct MIME type');
  assertEqual(manifestEntry.locale, processed1.locale, 'Manifest entry should have correct locale');
  assertEqual(manifestEntry.version, processed1.version, 'Manifest entry should have correct version');
  
  // Test metadata structure
  assertDefined(manifestEntry.metadata, 'Manifest entry should have metadata');
  assertDefined(manifestEntry.metadata.lastModified, 'Metadata should have lastModified timestamp');
  assertEqual(Array.isArray(manifestEntry.metadata.referencedBy), true, 'Metadata should have referencedBy array');
  assertEqual(manifestEntry.metadata.optimized, false, 'Metadata should indicate not optimized initially');
  assertEqual(manifestEntry.metadata.securityScanned, true, 'Metadata should indicate security scanned');

  // Test idempotent processing
  console.log('\n=== Testing idempotent processing ===');
  
  // Process same asset multiple times
  const idempotentAsset = {
    sourcePath: '/test/content/en/v1/assets/files/document.pdf',
    relativePath: 'en/v1/assets/files/document.pdf',
    locale: 'en',
    version: 'v1',
    type: AssetType.BINARY,
    referencedBy: ['page1.mdx']
  };
  
  require('fs').promises.readFile = async () => Buffer.from('consistent pdf content');
  
  const result1 = await processor.processAsset(idempotentAsset);
  const result2 = await processor.processAsset(idempotentAsset);
  const result3 = await processor.processAsset(idempotentAsset);
  
  assertEqual(result1.contentHash, result2.contentHash, 'Multiple processing should produce same hash (1st vs 2nd)');
  assertEqual(result2.contentHash, result3.contentHash, 'Multiple processing should produce same hash (2nd vs 3rd)');
  assertEqual(result1.hashedFilename, result2.hashedFilename, 'Multiple processing should produce same filename (1st vs 2nd)');
  assertEqual(result2.hashedFilename, result3.hashedFilename, 'Multiple processing should produce same filename (2nd vs 3rd)');
  assertEqual(result1.publicPath, result2.publicPath, 'Multiple processing should produce same public path (1st vs 2nd)');
  assertEqual(result2.publicPath, result3.publicPath, 'Multiple processing should produce same public path (2nd vs 3rd)');

  // Test manifest generation with same assets
  const manifestA = processor.generateManifest([result1]);
  const manifestB = processor.generateManifest([result2]);
  const manifestC = processor.generateManifest([result3]);
  
  const entryA = manifestA.assets[result1.relativePath];
  const entryB = manifestB.assets[result2.relativePath];
  const entryC = manifestC.assets[result3.relativePath];
  
  assertEqual(entryA.contentHash, entryB.contentHash, 'Manifest entries should have same hash (A vs B)');
  assertEqual(entryB.contentHash, entryC.contentHash, 'Manifest entries should have same hash (B vs C)');
  assertEqual(entryA.hashedFilename, entryB.hashedFilename, 'Manifest entries should have same filename (A vs B)');
  assertEqual(entryB.hashedFilename, entryC.hashedFilename, 'Manifest entries should have same filename (B vs C)');

  // Test hash truncation for filename
  console.log('\n=== Testing hash truncation ===');
  
  const longHashAsset = {
    sourcePath: '/test/content/en/v1/assets/images/long-name-image.jpg',
    relativePath: 'en/v1/assets/images/long-name-image.jpg',
    locale: 'en',
    version: 'v1',
    type: AssetType.IMAGE,
    referencedBy: []
  };
  
  require('fs').promises.readFile = async () => Buffer.from('content for hash truncation test');
  
  const longHashResult = await processor.processAsset(longHashAsset);
  
  // Hash should be truncated to 8 characters in filename
  assertMatches(longHashResult.hashedFilename, /^long-name-image\.[a-f0-9]{8}\.jpg$/, 'Filename should contain 8-character hash');
  
  // But full hash should be stored
  assertEqual(longHashResult.contentHash.length, 64, 'Full content hash should be 64 characters');
  
  // Filename hash should be prefix of full hash
  const filenameHash = longHashResult.hashedFilename.match(/\.([a-f0-9]{8})\./)?.[1];
  assertEqual(longHashResult.contentHash.startsWith(filenameHash || ''), true, 'Filename hash should be prefix of full hash');

  // Restore original fs functions
  require('fs').promises.stat = originalStat;
  require('fs').promises.readFile = originalReadFile;

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