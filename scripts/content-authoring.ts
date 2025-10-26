#!/usr/bin/env tsx

/**
 * Content authoring helper script
 * Provides utilities for creating and managing documentation content
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

interface ContentTemplate {
  title: string;
  description: string;
  version: string;
  locale: string;
  order: number;
  tags: string[];
  content: string;
}

interface ContentOptions {
  locale: string;
  version: string;
  type: 'guide' | 'api-reference' | 'overview';
  title: string;
  description?: string;
  order?: number;
  tags?: string[];
}

class ContentAuthor {
  private contentDir = 'content';

  async createContent(options: ContentOptions): Promise<string> {
    const template = this.generateTemplate(options);
    const filePath = this.generateFilePath(options);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Check if file already exists
    if (fs.existsSync(filePath)) {
      throw new Error(`File already exists: ${filePath}`);
    }

    // Write the file
    const frontmatter = matter.stringify(template.content, {
      title: template.title,
      description: template.description,
      version: template.version,
      locale: template.locale,
      order: template.order,
      tags: template.tags
    });

    fs.writeFileSync(filePath, frontmatter);
    
    console.log(`✅ Created content file: ${filePath}`);
    return filePath;
  }

  async listContent(locale?: string, version?: string): Promise<void> {
    const pattern = this.buildGlobPattern(locale, version);
    const { glob } = await import('glob');
    const files = await glob(pattern);

    console.log(`📄 Found ${files.length} content files:\n`);

    const grouped = this.groupContentFiles(files);
    
    for (const [localeKey, versions] of Object.entries(grouped)) {
      console.log(`🌍 ${localeKey.toUpperCase()}:`);
      
      for (const [versionKey, fileList] of Object.entries(versions)) {
        console.log(`  📦 ${versionKey}:`);
        
        for (const file of fileList) {
          const { data } = matter(fs.readFileSync(file, 'utf-8'));
          const relativePath = path.relative(this.contentDir, file);
          console.log(`    📄 ${relativePath} - "${data.title}"`);
        }
        console.log();
      }
    }
  }

  async validateStructure(): Promise<boolean> {
    console.log('🔍 Validating content structure...');
    
    const { glob } = await import('glob');
    const files = await glob(`${this.contentDir}/**/*.mdx`);
    const issues: string[] = [];

    // Check for required files
    const requiredFiles = [
      'en/v1/overview.mdx',
      'en/v1/authentication.mdx',
      'en/v1/guides/getting-started.mdx'
    ];

    for (const required of requiredFiles) {
      const fullPath = path.join(this.contentDir, required);
      if (!fs.existsSync(fullPath)) {
        issues.push(`Missing required file: ${required}`);
      }
    }

    // Check frontmatter consistency
    for (const file of files) {
      try {
        const { data } = matter(fs.readFileSync(file, 'utf-8'));
        const relativePath = path.relative(this.contentDir, file);
        
        // Extract expected locale and version from path
        const pathParts = relativePath.split(path.sep);
        const expectedLocale = pathParts[0];
        const expectedVersion = pathParts[1];

        if (data.locale !== expectedLocale) {
          issues.push(`${relativePath}: locale mismatch (expected: ${expectedLocale}, got: ${data.locale})`);
        }

        if (data.version !== expectedVersion) {
          issues.push(`${relativePath}: version mismatch (expected: ${expectedVersion}, got: ${data.version})`);
        }

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push(`${file}: Failed to parse frontmatter - ${message}`);
      }
    }

    if (issues.length > 0) {
      console.log('❌ Structure validation issues found:\n');
      for (const issue of issues) {
        console.log(`  • ${issue}`);
      }
      return false;
    }

    console.log('✅ Content structure is valid');
    return true;
  }

  async generateTranslation(sourceFile: string, targetLocale: string): Promise<string> {
    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    const { data, content } = matter(fs.readFileSync(sourceFile, 'utf-8'));
    
    // Generate target file path
    const relativePath = path.relative(this.contentDir, sourceFile);
    const pathParts = relativePath.split(path.sep);
    pathParts[0] = targetLocale; // Replace locale
    const targetPath = path.join(this.contentDir, ...pathParts);

    // Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Update frontmatter
    const translatedData = {
      ...data,
      locale: targetLocale,
      title: `[TRANSLATE] ${data.title}`,
      description: `[TRANSLATE] ${data.description}`
    };

    // Create translation template
    const translationContent = `<!-- TRANSLATION NEEDED -->
<!-- Original file: ${sourceFile} -->
<!-- Target locale: ${targetLocale} -->

${content}`;

    const translatedFile = matter.stringify(translationContent, translatedData);
    fs.writeFileSync(targetPath, translatedFile);

    console.log(`✅ Created translation template: ${targetPath}`);
    console.log(`💡 Remember to translate the content and update the title/description`);
    
    return targetPath;
  }

  async watchContent(): Promise<void> {
    console.log('👀 Watching content files for changes...');
    console.log('Press Ctrl+C to stop\n');

    const chokidar = await import('chokidar');
    const watcher = chokidar.default.watch(`${this.contentDir}/**/*.mdx`, {
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('add', (filePath) => {
        console.log(`📄 Added: ${path.relative(this.contentDir, filePath)}`);
        this.validateFile(filePath);
      })
      .on('change', (filePath) => {
        console.log(`📝 Changed: ${path.relative(this.contentDir, filePath)}`);
        this.validateFile(filePath);
      })
      .on('unlink', (filePath) => {
        console.log(`🗑️  Removed: ${path.relative(this.contentDir, filePath)}`);
      });

    // Keep the process running
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping content watcher...');
      watcher.close();
      process.exit(0);
    });
  }

  private generateTemplate(options: ContentOptions): ContentTemplate {
    const templates = {
      guide: this.getGuideTemplate(),
      'api-reference': this.getApiReferenceTemplate(),
      overview: this.getOverviewTemplate()
    };

    const baseTemplate = templates[options.type];
    
    return {
      title: options.title,
      description: options.description || `${options.title} documentation`,
      version: options.version,
      locale: options.locale,
      order: options.order || 1,
      tags: options.tags || [options.type],
      content: baseTemplate
    };
  }

  private generateFilePath(options: ContentOptions): string {
    const slug = options.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let subPath = '';
    if (options.type === 'guide') {
      subPath = 'guides/';
    } else if (options.type === 'api-reference') {
      subPath = 'api-reference/';
    }

    return path.join(
      this.contentDir,
      options.locale,
      options.version,
      subPath,
      `${slug}.mdx`
    );
  }

  private buildGlobPattern(locale?: string, version?: string): string {
    const localePattern = locale || '*';
    const versionPattern = version || '*';
    return `${this.contentDir}/${localePattern}/${versionPattern}/**/*.mdx`;
  }

  private groupContentFiles(files: string[]): Record<string, Record<string, string[]>> {
    const grouped: Record<string, Record<string, string[]>> = {};

    for (const file of files) {
      const relativePath = path.relative(this.contentDir, file);
      const parts = relativePath.split(path.sep);
      const locale = parts[0];
      const version = parts[1];

      if (!grouped[locale]) grouped[locale] = {};
      if (!grouped[locale][version]) grouped[locale][version] = [];
      
      grouped[locale][version].push(file);
    }

    // Sort files within each group
    for (const locale of Object.keys(grouped)) {
      for (const version of Object.keys(grouped[locale])) {
        grouped[locale][version].sort();
      }
    }

    return grouped;
  }

  private async validateFile(filePath: string): Promise<void> {
    try {
      const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
      const required = ['title', 'description', 'version', 'locale', 'order'];
      
      for (const field of required) {
        if (!data[field]) {
          console.log(`  ⚠️  Missing required field: ${field}`);
        }
      }
      
      console.log(`  ✅ Frontmatter is valid`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Validation error: ${message}`);
    }
  }

  private getGuideTemplate(): string {
    return `# {title}

Welcome to this guide! This document will help you understand and implement {topic}.

## Overview

Brief overview of what this guide covers.

## Prerequisites

Before you begin, make sure you have:

- Prerequisite 1
- Prerequisite 2
- Prerequisite 3

## Step-by-Step Instructions

### Step 1: First Step

Description of the first step.

\`\`\`javascript
// Example code
console.log('Hello, world!');
\`\`\`

### Step 2: Second Step

Description of the second step.

## Best Practices

- Best practice 1
- Best practice 2
- Best practice 3

## Troubleshooting

Common issues and their solutions.

## Next Steps

What to do after completing this guide.
`;
  }

  private getApiReferenceTemplate(): string {
    return `# {title}

API reference documentation for {endpoint}.

## Base URL

\`\`\`
https://api.example.com/v1/{endpoint}
\`\`\`

## Authentication

All endpoints require authentication via API key.

\`\`\`bash
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Endpoints

### GET /{endpoint}

Description of the GET endpoint.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| \`param1\` | string | Yes | Description of param1 |
| \`param2\` | integer | No | Description of param2 |

#### Request Example

\`\`\`bash
curl -X GET "https://api.example.com/v1/{endpoint}" \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

#### Response Example

\`\`\`json
{
  "data": {
    "id": "example_id",
    "name": "Example Name"
  }
}
\`\`\`

## Error Responses

Common error responses and their meanings.

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
\`\`\`
`;
  }

  private getOverviewTemplate(): string {
    return `# {title}

Overview of {topic} and its capabilities.

## Introduction

Brief introduction to the topic.

## Key Features

- Feature 1
- Feature 2
- Feature 3

## Getting Started

Quick start instructions.

## Architecture

High-level architecture overview.

## Use Cases

Common use cases and examples.

## Next Steps

Links to detailed documentation and guides.
`;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const author = new ContentAuthor();

  switch (command) {
    case 'create':
      const options: ContentOptions = {
        locale: args[1] || 'en',
        version: args[2] || 'v1',
        type: (args[3] as any) || 'guide',
        title: args[4] || 'New Content',
        description: args[5],
        order: args[6] ? parseInt(args[6]) : undefined,
        tags: args[7] ? args[7].split(',') : undefined
      };
      await author.createContent(options);
      break;

    case 'list':
      await author.listContent(args[1], args[2]);
      break;

    case 'validate':
      const isValid = await author.validateStructure();
      process.exit(isValid ? 0 : 1);
      break;

    case 'translate':
      const sourceFile = args[1];
      const targetLocale = args[2];
      if (!sourceFile || !targetLocale) {
        console.error('Usage: tsx scripts/content-authoring.ts translate <source-file> <target-locale>');
        process.exit(1);
      }
      await author.generateTranslation(sourceFile, targetLocale);
      break;

    case 'watch':
      await author.watchContent();
      break;

    default:
      console.log(`
📝 Content Authoring Helper

Usage: tsx scripts/content-authoring.ts <command> [options]

Commands:
  create <locale> <version> <type> <title> [description] [order] [tags]
    Create a new content file
    Types: guide, api-reference, overview
    Example: tsx scripts/content-authoring.ts create en v1 guide "Getting Started"

  list [locale] [version]
    List all content files
    Example: tsx scripts/content-authoring.ts list en v1

  validate
    Validate content structure and frontmatter
    Example: tsx scripts/content-authoring.ts validate

  translate <source-file> <target-locale>
    Generate translation template from existing file
    Example: tsx scripts/content-authoring.ts translate content/en/docs/v1/overview.mdx es

  watch
    Watch content files for changes and validate
    Example: tsx scripts/content-authoring.ts watch

Examples:
  tsx scripts/content-authoring.ts create en v1 guide "API Integration Guide"
  tsx scripts/content-authoring.ts list
  tsx scripts/content-authoring.ts validate
  tsx scripts/content-authoring.ts translate content/en/docs/v1/overview.mdx es
  tsx scripts/content-authoring.ts watch
`);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ContentAuthor };