#!/usr/bin/env tsx

/**
 * Performance monitoring script for build analysis
 * Monitors bundle sizes, build times, and performance metrics
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { glob } from 'glob';

interface BundleStats {
  file: string;
  size: number;
  gzipSize: number;
  type: 'js' | 'css' | 'html' | 'other';
}

interface PerformanceReport {
  buildTime: number;
  totalSize: number;
  totalGzipSize: number;
  jsSize: number;
  cssSize: number;
  htmlSize: number;
  bundles: BundleStats[];
  recommendations: string[];
}

class PerformanceMonitor {
  private outDir = 'out';
  public report: PerformanceReport = {
    buildTime: 0,
    totalSize: 0,
    totalGzipSize: 0,
    jsSize: 0,
    cssSize: 0,
    htmlSize: 0,
    bundles: [],
    recommendations: []
  };

  async analyze(): Promise<PerformanceReport> {
    console.log('📊 Starting performance analysis...');

    // Check if build output exists
    if (!fs.existsSync(this.outDir)) {
      throw new Error(`Build output directory '${this.outDir}' not found. Run 'npm run build' first.`);
    }

    // Analyze bundle sizes
    await this.analyzeBundles();

    // Generate recommendations
    this.generateRecommendations();

    // Display report
    this.displayReport();

    return this.report;
  }

  private async analyzeBundles(): Promise<void> {
    const files = await glob(`${this.outDir}/**/*`, { nodir: true });
    
    for (const file of files) {
      const stats = fs.statSync(file);
      const relativePath = path.relative(this.outDir, file);
      const ext = path.extname(file).toLowerCase();
      
      let type: BundleStats['type'] = 'other';
      if (ext === '.js') type = 'js';
      else if (ext === '.css') type = 'css';
      else if (ext === '.html') type = 'html';

      // Calculate gzip size
      let gzipSize = 0;
      try {
        const content = fs.readFileSync(file);
        const zlib = require('zlib');
        gzipSize = zlib.gzipSync(content).length;
      } catch (error) {
        // Skip binary files or files that can't be gzipped
        gzipSize = stats.size;
      }

      const bundleStats: BundleStats = {
        file: relativePath,
        size: stats.size,
        gzipSize,
        type
      };

      this.report.bundles.push(bundleStats);
      this.report.totalSize += stats.size;
      this.report.totalGzipSize += gzipSize;

      // Accumulate by type
      switch (type) {
        case 'js':
          this.report.jsSize += stats.size;
          break;
        case 'css':
          this.report.cssSize += stats.size;
          break;
        case 'html':
          this.report.htmlSize += stats.size;
          break;
      }
    }

    // Sort bundles by size (largest first)
    this.report.bundles.sort((a, b) => b.size - a.size);
  }

  private generateRecommendations(): void {
    const recommendations: string[] = [];

    // Check JavaScript bundle size
    if (this.report.jsSize > 300 * 1024) { // 300KB
      recommendations.push('⚠️  JavaScript bundle is large (>300KB). Consider code splitting or removing unused dependencies.');
    }

    // Check individual large files
    const largeFiles = this.report.bundles.filter(bundle => 
      bundle.size > 100 * 1024 && bundle.type === 'js'
    );
    
    if (largeFiles.length > 0) {
      recommendations.push(`📦 Large JavaScript files detected: ${largeFiles.map(f => f.file).join(', ')}`);
    }

    // Check CSS size
    if (this.report.cssSize > 50 * 1024) { // 50KB
      recommendations.push('🎨 CSS bundle is large (>50KB). Consider purging unused styles or splitting CSS.');
    }

    // Check compression ratio
    const compressionRatio = this.report.totalGzipSize / this.report.totalSize;
    if (compressionRatio > 0.7) {
      recommendations.push('🗜️  Poor compression ratio. Consider optimizing assets or enabling better compression.');
    }

    // Check for duplicate chunks
    const jsFiles = this.report.bundles.filter(b => b.type === 'js');
    if (jsFiles.length > 10) {
      recommendations.push('🔄 Many JavaScript chunks detected. Review code splitting strategy.');
    }

    // Performance budget recommendations
    if (this.report.totalGzipSize > 500 * 1024) { // 500KB
      recommendations.push('📏 Total bundle size exceeds recommended 500KB budget.');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Bundle sizes look good! No immediate optimizations needed.');
    }

    this.report.recommendations = recommendations;
  }

  private displayReport(): void {
    console.log('\n📊 Performance Report');
    console.log('='.repeat(50));

    // Size summary
    console.log('\n📦 Bundle Size Summary:');
    console.log(`  Total Size: ${this.formatBytes(this.report.totalSize)}`);
    console.log(`  Gzipped: ${this.formatBytes(this.report.totalGzipSize)} (${Math.round((this.report.totalGzipSize / this.report.totalSize) * 100)}% compression)`);
    console.log(`  JavaScript: ${this.formatBytes(this.report.jsSize)}`);
    console.log(`  CSS: ${this.formatBytes(this.report.cssSize)}`);
    console.log(`  HTML: ${this.formatBytes(this.report.htmlSize)}`);

    // Largest files
    console.log('\n📋 Largest Files:');
    const topFiles = this.report.bundles.slice(0, 10);
    for (const bundle of topFiles) {
      const sizeStr = this.formatBytes(bundle.size);
      const gzipStr = this.formatBytes(bundle.gzipSize);
      const typeIcon = this.getTypeIcon(bundle.type);
      console.log(`  ${typeIcon} ${bundle.file.padEnd(40)} ${sizeStr.padStart(8)} (${gzipStr} gzipped)`);
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    for (const recommendation of this.report.recommendations) {
      console.log(`  ${recommendation}`);
    }

    // Performance budgets
    console.log('\n🎯 Performance Budgets:');
    this.checkBudget('JavaScript', this.report.jsSize, 300 * 1024);
    this.checkBudget('CSS', this.report.cssSize, 50 * 1024);
    this.checkBudget('Total (gzipped)', this.report.totalGzipSize, 500 * 1024);

    console.log('\n' + '='.repeat(50));
  }

  private checkBudget(name: string, actual: number, budget: number): void {
    const percentage = (actual / budget) * 100;
    const status = actual <= budget ? '✅' : '❌';
    const actualStr = this.formatBytes(actual);
    const budgetStr = this.formatBytes(budget);
    
    console.log(`  ${status} ${name}: ${actualStr} / ${budgetStr} (${Math.round(percentage)}%)`);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private getTypeIcon(type: BundleStats['type']): string {
    const icons = {
      js: '📜',
      css: '🎨',
      html: '📄',
      other: '📁'
    };
    return icons[type];
  }

  async measureBuildTime(): Promise<number> {
    console.log('⏱️  Measuring build time...');
    
    const startTime = Date.now();
    
    try {
      execSync('npm run build', { 
        stdio: 'pipe',
        timeout: 300000 // 5 minutes timeout
      });
      
      const buildTime = Date.now() - startTime;
      this.report.buildTime = buildTime;
      
      console.log(`✅ Build completed in ${(buildTime / 1000).toFixed(2)}s`);
      return buildTime;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('❌ Build failed:', message);
      throw error;
    }
  }

  async generateLighthouseReport(): Promise<void> {
    console.log('🔍 Generating Lighthouse report...');
    
    try {
      // Check if lighthouse is available
      execSync('which lighthouse', { stdio: 'pipe' });
      
      // Start a simple HTTP server for the static files
      const { spawn } = require('child_process');
      const server = spawn('npx', ['serve', this.outDir, '-p', '3001'], {
        stdio: 'pipe'
      });

      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Run Lighthouse
      execSync('lighthouse http://localhost:3001 --output=json --output-path=lighthouse-report.json --chrome-flags="--headless"', {
        stdio: 'inherit'
      });

      // Kill the server
      server.kill();

      console.log('✅ Lighthouse report generated: lighthouse-report.json');
    } catch (error) {
      console.log('⚠️  Lighthouse not available or failed. Install with: npm install -g lighthouse');
    }
  }
}

// CLI execution
async function main() {
  const monitor = new PerformanceMonitor();
  
  try {
    // Measure build time if requested
    if (process.argv.includes('--build')) {
      await monitor.measureBuildTime();
    }

    // Analyze existing build
    await monitor.analyze();

    // Generate Lighthouse report if requested
    if (process.argv.includes('--lighthouse')) {
      await monitor.generateLighthouseReport();
    }

    // Save report to file
    const reportPath = 'performance-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(monitor.report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Performance analysis failed:', message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { PerformanceMonitor };