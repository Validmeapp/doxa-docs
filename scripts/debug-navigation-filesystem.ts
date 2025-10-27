#!/usr/bin/env tsx

/**
 * Debug script for NavigationBuilder filesystem issues
 */

import fs from 'fs';
import path from 'path';
import { NavigationBuilder } from '../lib/navigation-builder';
import { contentLoader } from '../lib/content-loader';

const testContentDir = path.join(process.cwd(), '.temp-debug-content');

async function setupSimpleTestContent() {
  console.log('🔧 Setting up simple test content...');
  
  // Clean up
  if (fs.existsSync(testContentDir)) {
    fs.rmSync(testContentDir, { recursive: true, force: true });
  }

  // Create simple structure
  const enV1Dir = path.join(testContentDir, 'en', 'v1');
  fs.mkdirSync(enV1Dir, { recursive: true });

  // Create a simple index file
  const indexContent = `---
title: Home
description: Home page
version: v1
locale: en
order: 0
sidebar_position: 1
---

# Home

Welcome to the documentation.`;

  fs.writeFileSync(path.join(enV1Dir, 'index.mdx'), indexContent);

  // Create a simple guide file
  const guideContent = `---
title: Getting Started
description: Get started guide
version: v1
locale: en
order: 10
sidebar_position: 2
sidebar_label: Quick Start
---

# Getting Started

Let's get started!`;

  fs.writeFileSync(path.join(enV1Dir, 'getting-started.mdx'), guideContent);

  console.log('✅ Simple test content created');
}

async function debugContentLoader() {
  console.log('\n🔍 Debugging ContentLoader...');
  
  const indexPath = path.join(testContentDir, 'en', 'v1', 'index.mdx');
  const guidePath = path.join(testContentDir, 'en', 'v1', 'getting-started.mdx');
  
  console.log(`Trying to load: ${indexPath}`);
  console.log(`File exists: ${fs.existsSync(indexPath)}`);
  
  try {
    const content = await contentLoader.loadContentFile(indexPath);
    console.log('Content loaded:', content ? 'SUCCESS' : 'NULL');
    if (content) {
      console.log('Frontmatter:', content.frontmatter);
    }
  } catch (error) {
    console.error('Error loading content:', error);
  }
}

async function debugFilesystemScanning() {
  console.log('\n🔍 Debugging filesystem scanning...');
  
  const builder = new NavigationBuilder(testContentDir);
  const contentPath = path.join(testContentDir, 'en', 'v1');
  
  console.log(`Scanning directory: ${contentPath}`);
  console.log(`Directory exists: ${fs.existsSync(contentPath)}`);
  
  if (fs.existsSync(contentPath)) {
    const entries = fs.readdirSync(contentPath, { withFileTypes: true });
    console.log('Directory entries:', entries.map(e => `${e.name} (${e.isFile() ? 'file' : 'dir'})`));
  }
  
  try {
    const navigation = await builder.buildFilesystemNavigation('en', 'v1');
    console.log('Navigation result:', JSON.stringify(navigation, null, 2));
  } catch (error) {
    console.error('Error building navigation:', error);
  }
}

async function debugFormatDirectoryName() {
  console.log('\n🔍 Testing formatDirectoryName...');
  
  const builder = new NavigationBuilder(testContentDir);
  
  const testCases = [
    '01-introduction',
    '02-setup',
    'api-reference',
    'user-guide'
  ];

  for (const testCase of testCases) {
    const result = builder.formatDirectoryName(testCase);
    console.log(`"${testCase}" → "${result}"`);
    
    // Debug the word splitting
    const words = testCase.toLowerCase().split(/[-_\s\.]+/).filter(word => word.length > 0);
    console.log(`  Words: [${words.join(', ')}]`);
    
    // Test the regex
    const firstWord = words[0];
    const match = firstWord.match(/^(\d+)[-_](.+)$/);
    console.log(`  First word: "${firstWord}", Match: ${match ? `[${match[1]}, ${match[2]}]` : 'null'}`);
  }
}

async function cleanup() {
  if (fs.existsSync(testContentDir)) {
    fs.rmSync(testContentDir, { recursive: true, force: true });
  }
}

async function runDebug() {
  try {
    await setupSimpleTestContent();
    await debugContentLoader();
    await debugFilesystemScanning();
    await debugFormatDirectoryName();
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await cleanup();
  }
}

runDebug();