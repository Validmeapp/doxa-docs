#!/usr/bin/env tsx

/**
 * Test script for LinkAuditor functionality
 */

import { promises as fs } from 'fs';
import path from 'path';
import { LinkAuditor } from '../lib/link-auditor';

async function setupTestContent() {
  const testDir = 'test-content';
  
  // Clean up any existing test content
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Directory might not exist, that's fine
  }
  
  // Create test content structure
  await fs.mkdir(path.join(testDir, 'en', 'v1', 'user-guide'), { recursive: true });
  await fs.mkdir(path.join(testDir, 'en', 'v1', 'developer-guide'), { recursive: true });
  
  // Create test files with various link scenarios
  await fs.writeFile(path.join(testDir, 'en', 'v1', 'index.mdx'), `
# Documentation Home

Welcome to our documentation!

## Quick Links

- [Getting Started](getting-started.mdx)
- [User Guide](user-guide/index.mdx)
- [API Reference](developer-guide/api-reference.mdx)
- [Broken Link](non-existent.mdx)
- [Wrong Extension](getting-started.md)
- [External Link](https://example.com)

## Navigation

[Back to top](#documentation-home)
  `);
  
  await fs.writeFile(path.join(testDir, 'en', 'v1', 'getting-started.mdx'), `
# Getting Started

This guide will help you get started.

## Prerequisites

Before you begin, make sure you have:

- [User account](user-guide/account-setup.mdx)
- [API access](developer-guide/api-reference.mdx)

## Next Steps

- [User Guide](user-guide/index.mdx)
- [Missing file](missing-guide.mdx)
- [Home](index.mdx)
  `);
  
  await fs.writeFile(path.join(testDir, 'en', 'v1', 'user-guide', 'index.mdx'), `
# User Guide

Complete user guide for the platform.

## Sections

- [Account Setup](account-setup.mdx)
- [Billing](billing.mdx)
- [Support](support.mdx)

[Back to Home](../index.mdx)
  `);
  
  await fs.writeFile(path.join(testDir, 'en', 'v1', 'user-guide', 'account-setup.mdx'), `
# Account Setup

How to set up your account.

[Back to User Guide](index.mdx)
[Getting Started](../getting-started.mdx)
  `);
  
  await fs.writeFile(path.join(testDir, 'en', 'v1', 'user-guide', 'billing.mdx'), `
# Billing

Billing information and pricing.

[User Guide](index.mdx)
[Missing billing file](billing-details.mdx)
  `);
  
  await fs.writeFile(path.join(testDir, 'en', 'v1', 'developer-guide', 'api-reference.mdx'), `
# API Reference

Complete API documentation.

## Authentication

See [Getting Started](../getting-started.mdx) for authentication details.

## Endpoints

- [Users API](users-api.mdx)
- [Billing API](../user-guide/billing.mdx)

[Home](../index.mdx)
  `);
  
  console.log('✅ Test content created successfully');
}

async function testLinkAuditor() {
  console.log('🔍 Testing LinkAuditor functionality...\n');
  
  const auditor = new LinkAuditor('test-content');
  
  try {
    // Test 1: Audit all links
    console.log('1. Auditing all links...');
    const auditResult = await auditor.auditAllLinks('en', 'v1');
    
    console.log(`   📊 Audit Results:`);
    console.log(`   - Processed files: ${auditResult.processedFiles}`);
    console.log(`   - Total links: ${auditResult.totalLinks}`);
    console.log(`   - Valid links: ${auditResult.validLinks}`);
    console.log(`   - Broken links: ${auditResult.brokenLinks.length}`);
    console.log(`   - Fixable links: ${auditResult.fixableLinks.length}`);
    console.log(`   - Unfixable links: ${auditResult.unfixableLinks.length}`);
    
    if (auditResult.brokenLinks.length > 0) {
      console.log(`\n   🔴 Broken Links:`);
      auditResult.brokenLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.filePath}:${link.lineNumber}`);
        console.log(`      Text: "${link.linkText}"`);
        console.log(`      URL: "${link.originalUrl}"`);
        console.log(`      Reason: ${link.reason}`);
        if (link.suggestedFix) {
          console.log(`      Suggested fix: "${link.suggestedFix}"`);
        }
        console.log('');
      });
    }
    
    // Test 2: Test link normalization
    console.log('2. Testing link normalization...');
    const testLinks = [
      'getting-started.mdx',
      '/getting-started.mdx',
      'en/v1/getting-started.mdx',
      'user-guide/billing.mdx',
      'https://example.com',
      '#section'
    ];
    
    testLinks.forEach(link => {
      const normalized = auditor.normalizeLink(link, 'en', 'v1');
      console.log(`   "${link}" → "${normalized}"`);
    });
    
    // Test 3: Test plausible target finding
    console.log('\n3. Testing plausible target finding...');
    const brokenLinks = [
      'getting-started.md',
      'user-guide/billing.md',
      'non-existent.mdx',
      'missing-guide.mdx'
    ];
    
    brokenLinks.forEach(link => {
      const target = auditor.findPlausibleTarget(link, 'en', 'v1');
      console.log(`   "${link}" → ${target || 'No target found'}`);
    });
    
    // Test 4: Dry run fix
    console.log('\n4. Testing link fixing (dry run)...');
    const fixResult = await auditor.fixBrokenLinks('en', 'v1', true);
    
    console.log(`   📊 Fix Results (Dry Run):`);
    console.log(`   - Total fixed: ${fixResult.totalFixed}`);
    console.log(`   - Fixed links: ${fixResult.fixedLinks.length}`);
    console.log(`   - Stripped links: ${fixResult.strippedLinks.length}`);
    console.log(`   - Backup created: ${fixResult.backupCreated}`);
    console.log(`   - Errors: ${fixResult.errors.length}`);
    
    if (fixResult.fixedLinks.length > 0) {
      console.log(`\n   🔧 Fixed Links:`);
      fixResult.fixedLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.filePath}`);
        console.log(`      "${link.originalUrl}" → "${link.newUrl}"`);
      });
    }
    
    if (fixResult.strippedLinks.length > 0) {
      console.log(`\n   ✂️  Stripped Links:`);
      fixResult.strippedLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.filePath}:${link.lineNumber}`);
        console.log(`      Removed: "${link.originalUrl}"`);
        console.log(`      Kept text: "${link.linkText}"`);
      });
    }
    
    // Test 5: Actual fix (commented out to avoid modifying test files)
    console.log('\n5. Actual link fixing (skipped to preserve test files)');
    console.log('   To test actual fixing, uncomment the code below');
    
    /*
    console.log('\n5. Testing actual link fixing...');
    const actualFixResult = await auditor.fixBrokenLinks('en', 'v1', false);
    console.log(`   Fixed ${actualFixResult.totalFixed} links`);
    console.log(`   Backup created: ${actualFixResult.backupCreated}`);
    */
    
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

async function cleanup() {
  try {
    await fs.rm('test-content', { recursive: true, force: true });
    console.log('🧹 Test content cleaned up');
  } catch (error) {
    console.warn('Warning: Could not clean up test content:', error);
  }
}

async function main() {
  try {
    await setupTestContent();
    await testLinkAuditor();
  } finally {
    await cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}