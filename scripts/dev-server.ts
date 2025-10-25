#!/usr/bin/env tsx

/**
 * Enhanced development server with content hot reload
 * Watches for content changes and rebuilds search index automatically
 */

import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';

interface DevServerOptions {
  port?: number;
  watchContent?: boolean;
  rebuildSearch?: boolean;
  verbose?: boolean;
}

class DevServer {
  private nextProcess: ChildProcess | null = null;
  private options: DevServerOptions;
  private isRebuilding = false;

  constructor(options: DevServerOptions = {}) {
    this.options = {
      port: 3000,
      watchContent: true,
      rebuildSearch: true,
      verbose: false,
      ...options
    };
  }

  async start(): Promise<void> {
    console.log('🚀 Starting enhanced development server...\n');

    // Start Next.js dev server
    await this.startNextServer();

    // Set up content watching if enabled
    if (this.options.watchContent) {
      await this.setupContentWatcher();
    }

    // Handle graceful shutdown
    this.setupShutdownHandlers();

    console.log(`
🎉 Development server is ready!

📍 Local:            http://localhost:${this.options.port}
📁 Content directory: ./content/
🔍 Search index:      ./public/search/

${this.options.watchContent ? '👀 Watching content files for changes...' : ''}
${this.options.rebuildSearch ? '🔄 Auto-rebuilding search index on content changes...' : ''}

Press Ctrl+C to stop the server
`);

    // Keep the process running
    process.stdin.resume();
  }

  private async startNextServer(): Promise<void> {
    console.log('🏗️  Starting Next.js development server...');

    const env = {
      ...process.env,
      PORT: this.options.port?.toString()
    };

    this.nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: this.options.verbose ? 'inherit' : 'pipe',
      env
    });

    if (!this.options.verbose && this.nextProcess.stdout) {
      this.nextProcess.stdout.on('data', (data) => {
        const output = data.toString();
        // Only show important messages
        if (output.includes('Ready') || output.includes('compiled') || output.includes('Error')) {
          process.stdout.write(output);
        }
      });
    }

    if (this.nextProcess.stderr) {
      this.nextProcess.stderr.on('data', (data) => {
        console.error('Next.js Error:', data.toString());
      });
    }

    this.nextProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Next.js process exited with code ${code}`);
        process.exit(code || 1);
      }
    });

    // Wait for Next.js to be ready
    await this.waitForServer();
  }

  private async waitForServer(): Promise<void> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`http://localhost:${this.options.port}`);
        if (response.ok) {
          console.log('✅ Next.js server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Next.js server failed to start within 30 seconds');
  }

  private async setupContentWatcher(): Promise<void> {
    console.log('👀 Setting up content file watcher...');

    const chokidar = await import('chokidar');
    const watcher = chokidar.default.watch('content/**/*.mdx', {
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('add', (filePath) => {
        console.log(`\n📄 Content added: ${path.relative('content', filePath)}`);
        this.handleContentChange(filePath, 'added');
      })
      .on('change', (filePath) => {
        console.log(`\n📝 Content changed: ${path.relative('content', filePath)}`);
        this.handleContentChange(filePath, 'changed');
      })
      .on('unlink', (filePath) => {
        console.log(`\n🗑️  Content removed: ${path.relative('content', filePath)}`);
        this.handleContentChange(filePath, 'removed');
      });

    // Also watch for navigation changes
    watcher.add('lib/navigation-builder.ts');
    watcher.add('lib/content-loader.ts');
  }

  private async handleContentChange(filePath: string, changeType: 'added' | 'changed' | 'removed'): Promise<void> {
    if (this.isRebuilding) {
      console.log('⏳ Rebuild already in progress, skipping...');
      return;
    }

    this.isRebuilding = true;

    try {
      // Validate the changed file if it's a content file
      if (filePath.endsWith('.mdx')) {
        await this.validateChangedFile(filePath, changeType);
      }

      // Rebuild search index if enabled
      if (this.options.rebuildSearch) {
        await this.rebuildSearchIndex();
      }

      console.log('✅ Content changes processed successfully\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Error processing content changes:', message);
    } finally {
      this.isRebuilding = false;
    }
  }

  private async validateChangedFile(filePath: string, changeType: string): Promise<void> {
    if (changeType === 'removed') {
      return; // Skip validation for removed files
    }

    try {
      const matter = await import('gray-matter');
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter.default(content);

      // Basic frontmatter validation
      const required = ['title', 'description', 'version', 'locale', 'order'];
      const missing = required.filter(field => !data[field]);

      if (missing.length > 0) {
        console.log(`  ⚠️  Missing frontmatter fields: ${missing.join(', ')}`);
      } else {
        console.log('  ✅ Frontmatter validation passed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Validation error: ${message}`);
    }
  }

  private async rebuildSearchIndex(): Promise<void> {
    console.log('🔄 Rebuilding search index...');

    try {
      const { execSync } = await import('child_process');
      execSync('tsx scripts/build-search-index.ts', {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: 30000 // 30 seconds timeout
      });
      console.log('✅ Search index rebuilt');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Failed to rebuild search index:', message);
    }
  }

  private setupShutdownHandlers(): void {
    const shutdown = () => {
      console.log('\n🛑 Shutting down development server...');
      
      if (this.nextProcess) {
        this.nextProcess.kill('SIGTERM');
      }
      
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  async checkDependencies(): Promise<boolean> {
    console.log('🔍 Checking dependencies...');

    const requiredDirs = ['content', 'lib', 'components'];
    const requiredFiles = ['package.json', 'next.config.js', 'tailwind.config.js'];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(dir)) {
        console.error(`❌ Required directory missing: ${dir}`);
        return false;
      }
    }

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        console.error(`❌ Required file missing: ${file}`);
        return false;
      }
    }

    // Check if content directory has files
    const { glob } = await import('glob');
    const contentFiles = await glob('content/**/*.mdx');
    
    if (contentFiles.length === 0) {
      console.log('⚠️  No content files found in ./content/');
      console.log('💡 Run: tsx scripts/content-authoring.ts create en v1 guide "Getting Started"');
    } else {
      console.log(`✅ Found ${contentFiles.length} content files`);
    }

    console.log('✅ All dependencies check passed\n');
    return true;
  }

  async generateDevReport(): Promise<void> {
    console.log('📊 Generating development report...');

    const { glob } = await import('glob');
    const contentFiles = await glob('content/**/*.mdx');
    const componentFiles = await glob('components/**/*.{ts,tsx}');
    const libFiles = await glob('lib/**/*.ts');

    const report = {
      timestamp: new Date().toISOString(),
      server: {
        port: this.options.port,
        url: `http://localhost:${this.options.port}`
      },
      content: {
        totalFiles: contentFiles.length,
        byLocale: this.groupFilesByLocale(contentFiles),
        byType: this.groupFilesByType(contentFiles)
      },
      codebase: {
        components: componentFiles.length,
        libraries: libFiles.length
      },
      features: {
        contentWatching: this.options.watchContent,
        searchRebuild: this.options.rebuildSearch
      }
    };

    const reportPath = 'dev-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Development report saved to: ${reportPath}`);
  }

  private groupFilesByLocale(files: string[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const file of files) {
      const parts = file.split(path.sep);
      if (parts.length >= 2) {
        const locale = parts[1]; // content/[locale]/...
        groups[locale] = (groups[locale] || 0) + 1;
      }
    }
    
    return groups;
  }

  private groupFilesByType(files: string[]): Record<string, number> {
    const groups: Record<string, number> = {};
    
    for (const file of files) {
      if (file.includes('/guides/')) {
        groups.guides = (groups.guides || 0) + 1;
      } else if (file.includes('/api-reference/')) {
        groups['api-reference'] = (groups['api-reference'] || 0) + 1;
      } else {
        groups.other = (groups.other || 0) + 1;
      }
    }
    
    return groups;
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  const options: DevServerOptions = {
    port: args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1]) : 3000,
    watchContent: !args.includes('--no-watch'),
    rebuildSearch: !args.includes('--no-search'),
    verbose: args.includes('--verbose')
  };

  if (args.includes('--help')) {
    console.log(`
🚀 Enhanced Development Server

Usage: tsx scripts/dev-server.ts [options]

Options:
  --port <number>     Port to run the server on (default: 3000)
  --no-watch          Disable content file watching
  --no-search         Disable automatic search index rebuilding
  --verbose           Show detailed output
  --help              Show this help message

Examples:
  tsx scripts/dev-server.ts                    # Start with default settings
  tsx scripts/dev-server.ts --port 3001        # Start on port 3001
  tsx scripts/dev-server.ts --no-watch         # Start without content watching
  tsx scripts/dev-server.ts --verbose          # Start with verbose output
`);
    return;
  }

  const server = new DevServer(options);

  try {
    // Check dependencies first
    const depsOk = await server.checkDependencies();
    if (!depsOk) {
      console.error('❌ Dependency check failed. Please fix the issues above.');
      process.exit(1);
    }

    // Generate development report
    await server.generateDevReport();

    // Start the server
    await server.start();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to start development server:', message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DevServer };