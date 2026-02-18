#!/usr/bin/env tsx

/**
 * Asset Processing Script
 * Processes static assets during the build phase
 */

import { promises as fs } from 'fs';
import path from 'path';
import { AssetProcessor } from '../lib/asset-processor';
import { SecurityValidator } from '../lib/security-validator';

interface AssetProcessingOptions {
  contentDir?: string;
  publicDir?: string;
  enableSecurity?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  generateResponsiveVariants?: boolean;
  generateModernFormats?: boolean;
}

class AssetProcessingManager {
  private processor: AssetProcessor;
  private validator: SecurityValidator;
  private options: Required<AssetProcessingOptions>;

  constructor(options: AssetProcessingOptions = {}) {
    this.options = {
      contentDir: options.contentDir || 'content',
      publicDir: options.publicDir || 'public/assets',
      enableSecurity: options.enableSecurity ?? true,
      verbose: options.verbose ?? false,
      dryRun: options.dryRun ?? false,
      generateResponsiveVariants: options.generateResponsiveVariants ?? true,
      generateModernFormats: options.generateModernFormats ?? true
    };

    this.processor = new AssetProcessor(this.options.contentDir, this.options.publicDir);
    this.validator = new SecurityValidator({
      enableContentScanning: this.options.enableSecurity,
      strictPathValidation: this.options.enableSecurity
    });
  }

  async processAssets(): Promise<void> {
    console.log('🖼️  Processing static assets...\n');

    try {
      // Step 1: Discover assets
      const assets = await this.discoverAssets();
      
      // Step 2: Validate assets
      if (this.options.enableSecurity) {
        await this.validateAssets(assets);
      }

      // Step 3: Process assets
      const processedAssets = await this.processDiscoveredAssets(assets);

      // Step 4: Generate manifest
      const manifest = this.processor.generateManifest(processedAssets);

      // Step 5: Copy assets to public directory
      if (!this.options.dryRun) {
        await this.copyAssetsToPublic(processedAssets);
        await this.writeManifest(manifest);
      }

      this.logSuccess(processedAssets.length, manifest);

    } catch (error) {
      this.logError(error);
      throw error;
    }
  }

  private async discoverAssets() {
    if (this.options.verbose) {
      console.log(`  Scanning content directory: ${this.options.contentDir}`);
    }

    const assets = await this.processor.discoverAssets();
    
    console.log(`  Found ${assets.length} assets across ${this.getUniqueLocales(assets).length} locales`);
    
    if (this.options.verbose && assets.length > 0) {
      console.log('  Assets by type:');
      const assetsByType = this.groupAssetsByType(assets);
      for (const [type, count] of Object.entries(assetsByType)) {
        console.log(`    ${type}: ${count}`);
      }
    }

    return assets;
  }

  private async validateAssets(assets: any[]) {
    console.log(`  Validating ${assets.length} assets for security...`);

    const assetPaths = assets.map(asset => asset.sourcePath);
    const validationResults = await this.validator.validateAssets(assetPaths);

    const invalidAssets = Object.entries(validationResults)
      .filter(([_, result]) => !result.isValid);

    if (invalidAssets.length > 0) {
      console.error(`  ❌ ${invalidAssets.length} assets failed security validation:`);
      
      for (const [filePath, result] of invalidAssets) {
        console.error(`    ${filePath}:`);
        for (const error of result.errors) {
          console.error(`      - ${error}`);
        }
      }
      
      throw new Error(`Asset security validation failed for ${invalidAssets.length} files`);
    }

    console.log(`  ✅ All assets passed security validation`);
  }

  private async processDiscoveredAssets(assets: any[]) {
    console.log(`  Processing ${assets.length} assets...`);
    
    if (this.options.generateResponsiveVariants || this.options.generateModernFormats) {
      console.log(`  Image optimization enabled:`);
      if (this.options.generateResponsiveVariants) {
        console.log(`    • Responsive variants (@1x, @2x)`);
      }
      if (this.options.generateModernFormats) {
        console.log(`    • Modern formats (WebP, AVIF)`);
      }
    }

    const processedAssets = await this.processor.processAssetsWithOptimization(assets, {
      generateResponsiveVariants: this.options.generateResponsiveVariants,
      generateModernFormats: this.options.generateModernFormats,
      responsiveOptions: {
        generateRetina: true,
        quality: 85
      },
      modernFormatOptions: {
        webp: { quality: 85, effort: 4 },
        avif: { quality: 80, effort: 4 }
      }
    });

    // Count derivatives for reporting
    const totalDerivatives = processedAssets.reduce((sum, asset) => 
      sum + (asset.derivatives?.length || 0), 0);

    console.log(`  ✅ Processed ${processedAssets.length} assets`);
    if (totalDerivatives > 0) {
      console.log(`  ✅ Generated ${totalDerivatives} optimized variants`);
    }
    
    return processedAssets;
  }

  private async copyAssetsToPublic(processedAssets: any[]) {
    console.log(`  Copying assets to public directory...`);

    // Ensure public directory exists
    await this.ensureDirectoryExists(this.options.publicDir);

    let copied = 0;
    let derivativesCopied = 0;

    for (const asset of processedAssets) {
      try {
        // Create destination directory structure
        const destPath = path.join(this.options.publicDir, asset.locale, asset.version, 
          asset.type === 'image' ? 'media' : 'files', asset.hashedFilename);
        
        await this.ensureDirectoryExists(path.dirname(destPath));

        // Copy original file
        await fs.copyFile(asset.sourcePath, destPath);
        copied++;

        if (this.options.verbose) {
          console.log(`    [${copied}] ${asset.sourcePath} -> ${destPath}`);
        }

        // Copy derivatives if they exist
        if (asset.derivatives && asset.derivatives.length > 0) {
          for (const derivative of asset.derivatives) {
            // For derivatives, we need to get the optimized buffer from ImageOptimizer
            // For now, we'll skip copying derivatives as they need to be generated and saved
            // This will be handled in a future enhancement
            derivativesCopied++;
          }
        }
      } catch (error) {
        console.error(`    ❌ Failed to copy ${asset.sourcePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }

    console.log(`  ✅ Copied ${copied} original assets to public directory`);
    if (derivativesCopied > 0) {
      console.log(`  ℹ️  ${derivativesCopied} derivatives tracked in manifest (physical copying to be implemented)`);
    }
  }

  private async writeManifest(manifest: any) {
    const manifestPath = path.join(this.options.publicDir, 'assets-manifest.json');
    
    if (this.options.verbose) {
      console.log(`  Writing manifest to: ${manifestPath}`);
    }

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  ✅ Asset manifest written`);
  }

  private async ensureDirectoryExists(dirPath: string) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore EEXIST errors
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private getUniqueLocales(assets: any[]): string[] {
    return [...new Set(assets.map(asset => asset.locale))];
  }

  private groupAssetsByType(assets: any[]): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const asset of assets) {
      groups[asset.type] = (groups[asset.type] || 0) + 1;
    }
    return groups;
  }

  private logSuccess(assetCount: number, manifest: any) {
    console.log('\n✅ Asset processing completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`  • Processed: ${assetCount} assets`);
    console.log(`  • Locales: ${manifest.locales.join(', ')}`);
    console.log(`  • Versions: ${manifest.versions.join(', ')}`);
    console.log(`  • Output: ${this.options.publicDir}/`);
    console.log(`  • Manifest: ${this.options.publicDir}/assets-manifest.json`);
  }

  private logError(error: any) {
    console.error('\n❌ Asset processing failed!');
    console.error(`Error: ${error.message}`);
    
    if (this.options.verbose && error.stack) {
      console.error(`Stack: ${error.stack}`);
    }

    console.error('\n💡 Troubleshooting tips:');
    console.error('  • Check that content directory exists and contains assets');
    console.error('  • Ensure asset files are valid and not corrupted');
    console.error('  • Verify file permissions for reading source files');
    console.error('  • Check available disk space for copying assets');
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  const options: AssetProcessingOptions = {
    contentDir: args.find(arg => arg.startsWith('--content-dir='))?.split('=')[1],
    publicDir: args.find(arg => arg.startsWith('--public-dir='))?.split('=')[1],
    enableSecurity: !args.includes('--skip-security'),
    verbose: args.includes('--verbose'),
    dryRun: args.includes('--dry-run'),
    generateResponsiveVariants: !args.includes('--skip-responsive'),
    generateModernFormats: !args.includes('--skip-modern-formats')
  };

  if (args.includes('--help')) {
    console.log(`
🖼️  Asset Processing Script

Usage: tsx scripts/process-assets.ts [options]

Options:
  --content-dir=<path>   Content directory path (default: content)
  --public-dir=<path>    Public assets directory path (default: public/assets)
  --skip-security        Skip security validation
  --skip-responsive      Skip responsive variant generation
  --skip-modern-formats  Skip modern format conversion (WebP, AVIF)
  --verbose              Show detailed processing output
  --dry-run              Process assets but don't copy files
  --help                 Show this help message

Examples:
  tsx scripts/process-assets.ts                     # Standard asset processing
  tsx scripts/process-assets.ts --verbose           # Detailed output
  tsx scripts/process-assets.ts --dry-run           # Test without copying
  tsx scripts/process-assets.ts --skip-security     # Skip security checks
`);
    return;
  }

  const manager = new AssetProcessingManager(options);
  await manager.processAssets();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Asset processing failed:', error);
    process.exit(1);
  });
}

export { AssetProcessingManager };
