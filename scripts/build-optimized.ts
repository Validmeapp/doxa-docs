#!/usr/bin/env tsx

/**
 * Optimized build script that orchestrates all build steps
 * Includes content validation, performance monitoring, and optimization
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { ContentValidator } from './validate-content';
import { PerformanceMonitor } from './performance-monitor';
import { AssetProcessingManager } from './process-assets';

interface BuildOptions {
  skipValidation?: boolean;
  skipAssetProcessing?: boolean;
  skipPerformanceAnalysis?: boolean;
  enableAnalyzer?: boolean;
  generateLighthouse?: boolean;
  verbose?: boolean;
}

class OptimizedBuilder {
  private options: BuildOptions;
  private startTime: number;

  constructor(options: BuildOptions = {}) {
    this.options = options;
    this.startTime = Date.now();
  }

  async build(): Promise<void> {
    console.log('🚀 Starting optimized build process...\n');

    try {
      // Step 1: Content validation
      if (!this.options.skipValidation) {
        await this.validateContent();
      }

      // Step 2: Pre-build tasks
      await this.runPreBuildTasks();

      // Step 3: Build the application
      await this.buildApplication();

      // Step 4: Post-build analysis
      if (!this.options.skipPerformanceAnalysis) {
        await this.analyzePerformance();
      }

      // Step 5: Generate reports
      await this.generateReports();

      this.logSuccess();

    } catch (error) {
      this.logError(error);
      process.exit(1);
    }
  }

  private async validateContent(): Promise<void> {
    console.log('📋 Step 1: Validating content...');
    
    const validator = new ContentValidator();
    const isValid = await validator.validate();
    
    if (!isValid) {
      throw new Error('Content validation failed. Fix the errors above before building.');
    }
    
    console.log('✅ Content validation passed\n');
  }

  private async runPreBuildTasks(): Promise<void> {
    console.log('⚙️  Step 2: Running pre-build tasks...');

    // Process static assets
    if (!this.options.skipAssetProcessing) {
      this.runCommand('tsx scripts/process-assets.ts', 'Processing static assets');
    }

    // Build search index
    this.runCommand('tsx scripts/build-search-index.ts', 'Building search index');

    // Generate sitemaps
    this.runCommand('tsx scripts/generate-sitemaps.ts', 'Generating sitemaps');

    // Type checking
    this.runCommand('npm run type-check', 'Type checking');

    // Linting
    this.runCommand('npm run lint', 'Linting code');

    console.log('✅ Pre-build tasks completed\n');
  }

  private async buildApplication(): Promise<void> {
    console.log('🏗️  Step 3: Building application...');

    const buildCommand = this.options.enableAnalyzer 
      ? 'ANALYZE=true next build'
      : 'next build';

    this.runCommand(buildCommand, 'Building Next.js application');

    console.log('✅ Application build completed\n');
  }

  private async analyzePerformance(): Promise<void> {
    console.log('📊 Step 4: Analyzing performance...');

    const monitor = new PerformanceMonitor();
    await monitor.analyze();

    if (this.options.generateLighthouse) {
      await monitor.generateLighthouseReport();
    }

    console.log('✅ Performance analysis completed\n');
  }

  private async generateReports(): Promise<void> {
    console.log('📄 Step 5: Generating reports...');

    // Create reports directory
    const reportsDir = 'reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    // Build summary report
    const buildSummary = {
      timestamp: new Date().toISOString(),
      buildTime: Date.now() - this.startTime,
      nodeVersion: process.version,
      platform: process.platform,
      options: this.options,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        CI: process.env.CI,
      }
    };

    fs.writeFileSync(
      path.join(reportsDir, 'build-summary.json'),
      JSON.stringify(buildSummary, null, 2)
    );

    // Copy performance report if it exists
    if (fs.existsSync('performance-report.json')) {
      fs.copyFileSync('performance-report.json', path.join(reportsDir, 'performance-report.json'));
    }

    // Copy lighthouse report if it exists
    if (fs.existsSync('lighthouse-report.json')) {
      fs.copyFileSync('lighthouse-report.json', path.join(reportsDir, 'lighthouse-report.json'));
    }

    console.log('✅ Reports generated in ./reports/\n');
  }

  private runCommand(command: string, description: string): void {
    if (this.options.verbose) {
      console.log(`  Running: ${command}`);
    } else {
      console.log(`  ${description}...`);
    }

    try {
      execSync(command, { 
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: 300000 // 5 minutes
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to ${description.toLowerCase()}: ${message}`);
    }
  }

  private logSuccess(): void {
    const totalTime = Date.now() - this.startTime;
    const minutes = Math.floor(totalTime / 60000);
    const seconds = ((totalTime % 60000) / 1000).toFixed(1);

    console.log('🎉 Build completed successfully!');
    console.log(`⏱️  Total time: ${minutes}m ${seconds}s`);
    console.log('\n📁 Output directory: ./out/');
    console.log('📊 Reports directory: ./reports/');
    
    if (this.options.enableAnalyzer) {
      console.log('📈 Bundle analyzer should have opened in your browser');
    }

    console.log('\n💡 Next steps:');
    console.log('  • Test the build: npx serve out');
    console.log('  • Deploy to production');
    console.log('  • Monitor performance metrics');
  }

  private logError(error: any): void {
    console.error('\n❌ Build failed!');
    console.error(`Error: ${error.message}`);
    
    if (this.options.verbose && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }

    console.error('\n💡 Troubleshooting tips:');
    console.error('  • Check the error message above');
    console.error('  • Run with --verbose for more details');
    console.error('  • Ensure all dependencies are installed');
    console.error('  • Check that content files are valid');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  const options: BuildOptions = {
    skipValidation: args.includes('--skip-validation'),
    skipAssetProcessing: args.includes('--skip-assets'),
    skipPerformanceAnalysis: args.includes('--skip-performance'),
    enableAnalyzer: args.includes('--analyze'),
    generateLighthouse: args.includes('--lighthouse'),
    verbose: args.includes('--verbose')
  };

  if (args.includes('--help')) {
    console.log(`
🚀 Optimized Build Script

Usage: tsx scripts/build-optimized.ts [options]

Options:
  --skip-validation      Skip content validation step
  --skip-assets          Skip asset processing step
  --skip-performance     Skip performance analysis step
  --analyze             Enable webpack bundle analyzer
  --lighthouse          Generate Lighthouse performance report
  --verbose             Show detailed command output
  --help                Show this help message

Examples:
  tsx scripts/build-optimized.ts                    # Standard optimized build
  tsx scripts/build-optimized.ts --analyze          # Build with bundle analysis
  tsx scripts/build-optimized.ts --lighthouse       # Build with Lighthouse report
  tsx scripts/build-optimized.ts --verbose          # Build with detailed output
`);
    return;
  }

  const builder = new OptimizedBuilder(options);
  await builder.build();
}

if (require.main === module) {
  main().catch(console.error);
}

export { OptimizedBuilder };