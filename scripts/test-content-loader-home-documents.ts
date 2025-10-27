#!/usr/bin/env tsx

/**
 * Comprehensive unit tests for ContentLoader home document functionality
 * Tests the implementation of task 1: Enhance ContentLoader for home document handling
 */

import { ContentLoader } from '../lib/content-loader';
import fs from 'fs';
import path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

class HomeDocumentTester {
  private contentLoader: ContentLoader;
  private results: TestResult[] = [];

  constructor() {
    this.contentLoader = new ContentLoader();
  }

  private addResult(name: string, passed: boolean, error?: string) {
    this.results.push({ name, passed, error });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  private async runTest(name: string, testFn: () => Promise<void>) {
    try {
      await testFn();
      this.addResult(name, true);
    } catch (error) {
      this.addResult(name, false, error instanceof Error ? error.message : String(error));
    }
  }

  async testFindIndexFile() {
    console.log('\n📍 Testing findIndexFile method...');

    // Test existing index files
    await this.runTest('findIndexFile - English v1 exists', async () => {
      const result = await this.contentLoader.findIndexFile('en', 'v1');
      if (!result) throw new Error('Expected to find English v1 index file');
      if (!result.includes('content/en/docs/v1/index.mdx')) {
        throw new Error(`Expected path to contain 'content/en/docs/v1/index.mdx', got: ${result}`);
      }
    });

    await this.runTest('findIndexFile - Spanish v1 exists', async () => {
      const result = await this.contentLoader.findIndexFile('es', 'v1');
      if (!result) throw new Error('Expected to find Spanish v1 index file');
      if (!result.includes('content/es/docs/v1/index.mdx')) {
        throw new Error(`Expected path to contain 'content/es/docs/v1/index.mdx', got: ${result}`);
      }
    });

    // Test non-existent index files
    await this.runTest('findIndexFile - Non-existent locale returns null', async () => {
      const result = await this.contentLoader.findIndexFile('fr', 'v1');
      if (result !== null) {
        throw new Error(`Expected null for non-existent locale, got: ${result}`);
      }
    });

    await this.runTest('findIndexFile - Non-existent version returns null', async () => {
      const result = await this.contentLoader.findIndexFile('en', 'v2');
      if (result !== null) {
        throw new Error(`Expected null for non-existent version, got: ${result}`);
      }
    });
  }

  async testGetHomeDocument() {
    console.log('\n📄 Testing getHomeDocument method...');

    // Test existing home documents
    await this.runTest('getHomeDocument - English v1 loads correctly', async () => {
      const result = await this.contentLoader.getHomeDocument('en', 'v1');
      if (!result) throw new Error('Expected to get English v1 home document');
      if (result.frontmatter.title !== 'ValidMe Overview') {
        throw new Error(`Expected title 'ValidMe Overview', got: ${result.frontmatter.title}`);
      }
      if (result.slug !== '') {
        throw new Error(`Expected empty slug for home document, got: '${result.slug}'`);
      }
      if (result.frontmatter.locale !== 'en') {
        throw new Error(`Expected locale 'en', got: ${result.frontmatter.locale}`);
      }
      if (result.frontmatter.version !== 'v1') {
        throw new Error(`Expected version 'v1', got: ${result.frontmatter.version}`);
      }
    });

    await this.runTest('getHomeDocument - Spanish v1 loads correctly', async () => {
      const result = await this.contentLoader.getHomeDocument('es', 'v1');
      if (!result) throw new Error('Expected to get Spanish v1 home document');
      if (result.frontmatter.title !== 'Visión General de ValidMe') {
        throw new Error(`Expected title 'Visión General de ValidMe', got: ${result.frontmatter.title}`);
      }
      if (result.slug !== '') {
        throw new Error(`Expected empty slug for home document, got: '${result.slug}'`);
      }
      if (result.frontmatter.locale !== 'es') {
        throw new Error(`Expected locale 'es', got: ${result.frontmatter.locale}`);
      }
    });

    // Test fallback for missing home documents
    await this.runTest('getHomeDocument - Missing document returns fallback', async () => {
      const result = await this.contentLoader.getHomeDocument('fr', 'v1');
      if (!result) throw new Error('Expected to get fallback home document');
      if (result.frontmatter.title !== 'Missing Home Document') {
        throw new Error(`Expected title 'Missing Home Document', got: ${result.frontmatter.title}`);
      }
      if (result.slug !== '') {
        throw new Error(`Expected empty slug for fallback document, got: '${result.slug}'`);
      }
      if (!result.content.includes('Missing Home Document')) {
        throw new Error('Expected fallback content to contain "Missing Home Document"');
      }
      if (!result.content.includes('content/fr/v1/index.mdx')) {
        throw new Error('Expected fallback content to contain the correct file path');
      }
    });
  }

  async testGetContentBySlugWithEmptySlug() {
    console.log('\n🔗 Testing getContentBySlug with empty slug...');

    // Test empty string slug
    await this.runTest('getContentBySlug - Empty string returns home document', async () => {
      const result = await this.contentLoader.getContentBySlug('en', 'v1', '');
      if (!result) throw new Error('Expected to get home document for empty slug');
      if (result.frontmatter.title !== 'ValidMe Overview') {
        throw new Error(`Expected home document title, got: ${result.frontmatter.title}`);
      }
    });

    // Test slash slug
    await this.runTest('getContentBySlug - Slash returns home document', async () => {
      const result = await this.contentLoader.getContentBySlug('en', 'v1', '/');
      if (!result) throw new Error('Expected to get home document for slash slug');
      if (result.frontmatter.title !== 'ValidMe Overview') {
        throw new Error(`Expected home document title, got: ${result.frontmatter.title}`);
      }
    });

    // Test normal slug still works
    await this.runTest('getContentBySlug - Normal slug still works', async () => {
      const result = await this.contentLoader.getContentBySlug('en', 'v1', 'developer-guide/getting-started');
      if (!result) throw new Error('Expected to get normal document');
      if (result.frontmatter.title !== 'Getting Started - Developers') {
        throw new Error(`Expected normal document title, got: ${result.frontmatter.title}`);
      }
    });

    // Test fallback for missing locale
    await this.runTest('getContentBySlug - Missing locale returns fallback', async () => {
      const result = await this.contentLoader.getContentBySlug('fr', 'v1', '');
      if (!result) throw new Error('Expected to get fallback home document');
      if (result.frontmatter.title !== 'Missing Home Document') {
        throw new Error(`Expected fallback title, got: ${result.frontmatter.title}`);
      }
    });
  }

  async testGenerateMissingHomeContent() {
    console.log('\n📝 Testing generateMissingHomeContent method...');

    await this.runTest('generateMissingHomeContent - Contains required elements', async () => {
      const content = this.contentLoader.generateMissingHomeContent('test', 'v2');
      
      if (!content.includes('Missing Home Document')) {
        throw new Error('Content should contain "Missing Home Document" title');
      }
      
      if (!content.includes('content/test/v2/index.mdx')) {
        throw new Error('Content should contain the correct file path');
      }
      
      if (!content.includes('version: "v2"')) {
        throw new Error('Content should contain the correct version in frontmatter example');
      }
      
      if (!content.includes('locale: "test"')) {
        throw new Error('Content should contain the correct locale in frontmatter example');
      }
      
      if (content.length < 500) {
        throw new Error('Content should be substantial (at least 500 characters)');
      }
    });

    await this.runTest('generateMissingHomeContent - Lists available content', async () => {
      const content = this.contentLoader.generateMissingHomeContent('en', 'v1');
      
      // Should list some available content since en/v1 has content
      if (!content.includes('Available Content')) {
        throw new Error('Content should have "Available Content" section');
      }
      
      // Should contain at least one link to existing content
      if (!content.includes('Developer Guide')) {
        throw new Error('Content should list available content like "Developer Guide"');
      }
    });
  }

  async testSlugGeneration() {
    console.log('\n🏷️ Testing slug generation for index files...');

    await this.runTest('Slug generation - Index files have empty slugs', async () => {
      const allContent = await this.contentLoader.loadAllContent();
      const homeDocuments = allContent.filter(page => 
        page.filePath.includes('/index.mdx') || page.filePath.includes('/index.md')
      );
      
      if (homeDocuments.length === 0) {
        throw new Error('Expected to find at least one home document');
      }
      
      for (const doc of homeDocuments) {
        if (doc.slug !== '') {
          throw new Error(`Expected empty slug for home document ${doc.filePath}, got: '${doc.slug}'`);
        }
      }
    });

    await this.runTest('Slug generation - Non-index files have proper slugs', async () => {
      const allContent = await this.contentLoader.loadAllContent();
      const nonHomeDocuments = allContent.filter(page => 
        !page.filePath.includes('/index.mdx') && !page.filePath.includes('/index.md')
      );
      
      if (nonHomeDocuments.length === 0) {
        throw new Error('Expected to find at least one non-home document');
      }
      
      for (const doc of nonHomeDocuments) {
        if (doc.slug === '') {
          throw new Error(`Expected non-empty slug for non-home document ${doc.filePath}`);
        }
        
        // Slug should not contain locale/version prefix
        if (doc.slug.startsWith('en/v1/') || doc.slug.startsWith('es/v1/')) {
          throw new Error(`Slug should not contain locale/version prefix: '${doc.slug}'`);
        }
      }
    });
  }

  async runAllTests() {
    console.log('🧪 Running comprehensive home document tests...\n');

    await this.testFindIndexFile();
    await this.testGetHomeDocument();
    await this.testGetContentBySlugWithEmptySlug();
    await this.testGenerateMissingHomeContent();
    await this.testSlugGeneration();

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('\n📊 Test Summary:');
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);

    if (failed > 0) {
      console.log('\n❌ Failed tests:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
    }
  }
}

// Run the tests
const tester = new HomeDocumentTester();
tester.runAllTests().catch(console.error);