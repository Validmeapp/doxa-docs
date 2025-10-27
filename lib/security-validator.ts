/**
 * Security Validation Framework for Asset Processing
 * Provides comprehensive security validation for uploaded and processed assets
 */

import { promises as fs } from 'fs';
import path from 'path';
import { 
  ALLOWED_IMAGE_TYPES, 
  ALLOWED_BINARY_TYPES, 
  MAX_FILE_SIZE,
  ValidationResult 
} from './asset-processor';

export interface SecurityValidationOptions {
  maxFileSize?: number;
  allowedImageTypes?: string[];
  allowedBinaryTypes?: string[];
  enableContentScanning?: boolean;
  strictPathValidation?: boolean;
}

/**
 * Security Validator for asset files
 */
export class SecurityValidator {
  private options: Required<SecurityValidationOptions>;

  constructor(options: SecurityValidationOptions = {}) {
    this.options = {
      maxFileSize: options.maxFileSize || MAX_FILE_SIZE,
      allowedImageTypes: options.allowedImageTypes || [...ALLOWED_IMAGE_TYPES],
      allowedBinaryTypes: options.allowedBinaryTypes || [...ALLOWED_BINARY_TYPES],
      enableContentScanning: options.enableContentScanning ?? true,
      strictPathValidation: options.strictPathValidation ?? true
    };
  }

  /**
   * Validate file type based on MIME type and extension
   */
  validateFileType(filePath: string): boolean {
    const mimeType = this.getMimeType(filePath);
    const allowedTypes = [...this.options.allowedImageTypes, ...this.options.allowedBinaryTypes];
    return allowedTypes.includes(mimeType);
  }

  /**
   * Sanitize file path to prevent directory traversal and other attacks
   */
  sanitizePath(inputPath: string): string {
    // Normalize the path
    const normalized = path.normalize(inputPath);
    
    // Check for dangerous patterns
    if (this.options.strictPathValidation) {
      this.validatePathSecurity(normalized);
    }
    
    // Remove leading path separators and dots
    const sanitized = normalized.replace(/^[\.\/\\]+/, '');
    
    // Ensure path doesn't start with drive letters on Windows
    const withoutDrive = sanitized.replace(/^[a-zA-Z]:/, '');
    
    // Normalize path separators to forward slashes
    const normalizedSeparators = withoutDrive.replace(/\\/g, '/');
    
    return normalizedSeparators;
  }

  /**
   * Check file size against maximum allowed size
   */
  checkFileSize(filePath: string): boolean {
    try {
      const stats = require('fs').statSync(filePath);
      return stats.size <= this.options.maxFileSize;
    } catch (error) {
      return false;
    }
  }

  /**
   * Scan file content for malicious patterns
   */
  async scanForMaliciousContent(filePath: string): Promise<boolean> {
    if (!this.options.enableContentScanning) {
      return true; // Skip scanning if disabled
    }

    try {
      // Read first 1KB of file for analysis
      const buffer = Buffer.alloc(1024);
      const fd = await fs.open(filePath, 'r');
      const { bytesRead } = await fd.read(buffer, 0, 1024, 0);
      await fd.close();

      const content = buffer.subarray(0, bytesRead);
      
      // Check for common malicious patterns
      return this.analyzeFileContent(content, filePath);
    } catch (error) {
      // If we can't read the file, consider it suspicious
      return false;
    }
  }

  /**
   * Comprehensive validation combining all security checks
   */
  async validateAsset(filePath: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // Check if file exists
      if (!this.fileExists(filePath)) {
        result.isValid = false;
        result.errors.push(`File does not exist: ${filePath}`);
        return result;
      }

      // Validate file type
      if (!this.validateFileType(filePath)) {
        result.isValid = false;
        const mimeType = this.getMimeType(filePath);
        result.errors.push(`File type not allowed: ${mimeType}`);
      }

      // Check file size
      if (!this.checkFileSize(filePath)) {
        result.isValid = false;
        const stats = require('fs').statSync(filePath);
        result.errors.push(`File size exceeds maximum allowed size (${this.options.maxFileSize} bytes): ${stats.size} bytes`);
      }

      // Sanitize path
      try {
        const sanitizedPath = this.sanitizePath(filePath);
        if (sanitizedPath !== filePath) {
          result.warnings.push(`Path was sanitized from ${filePath} to ${sanitizedPath}`);
          result.sanitizedPath = sanitizedPath;
        }
      } catch (error) {
        result.isValid = false;
        result.errors.push(`Path validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Scan for malicious content
      if (result.isValid) {
        const isContentSafe = await this.scanForMaliciousContent(filePath);
        if (!isContentSafe) {
          result.isValid = false;
          result.errors.push('File content appears to be malicious or suspicious');
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Validate multiple assets in batch
   */
  async validateAssets(filePaths: string[]): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};
    
    // Process validations in parallel for better performance
    const validationPromises = filePaths.map(async (filePath) => {
      const result = await this.validateAsset(filePath);
      return { filePath, result };
    });

    const validationResults = await Promise.all(validationPromises);
    
    for (const { filePath, result } of validationResults) {
      results[filePath] = result;
    }

    return results;
  }

  // Private helper methods

  private fileExists(filePath: string): boolean {
    try {
      require('fs').statSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.avif': 'image/avif',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private validatePathSecurity(normalizedPath: string): void {
    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
      throw new Error(`Path traversal attempt detected: ${normalizedPath}`);
    }

    // Check for home directory access
    if (normalizedPath.includes('~')) {
      throw new Error(`Home directory access attempt detected: ${normalizedPath}`);
    }

    // Check for null bytes (path injection)
    if (normalizedPath.includes('\0')) {
      throw new Error(`Null byte in path detected: ${normalizedPath}`);
    }

    // Check for suspicious system directory patterns (Unix/Linux)
    const suspiciousPatterns = [
      /\/etc\//,        // System directories
      /\/proc\//,       // Process filesystem
      /\/sys\//,        // System filesystem
      /\/dev\//,        // Device files
      /\/var\/log\//,   // Log files
      /\/root\//,       // Root home directory
      /\/home\/[^\/]+\/\.[^\/]+/, // Hidden files in user directories
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(normalizedPath)) {
        throw new Error(`Suspicious path pattern detected: ${normalizedPath}`);
      }
    }
  }

  private analyzeFileContent(content: Buffer, filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    
    // Check for executable signatures
    if (this.hasExecutableSignature(content)) {
      return false;
    }

    // Check for script content in non-script files
    if (this.hasScriptContent(content, ext)) {
      return false;
    }

    // Check for embedded malicious patterns
    if (this.hasMaliciousPatterns(content)) {
      return false;
    }

    // File type specific validations
    if (this.options.allowedImageTypes.includes(this.getMimeType(filePath))) {
      return this.validateImageContent(content, ext);
    }

    return true;
  }

  private hasExecutableSignature(content: Buffer): boolean {
    // Check for common executable signatures
    const executableSignatures = [
      Buffer.from([0x4D, 0x5A]),        // PE/DOS executable (MZ)
      Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF executable
      Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O executable (32-bit)
      Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O executable (64-bit)
      Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), // Java class file
    ];

    for (const signature of executableSignatures) {
      if (content.subarray(0, signature.length).equals(signature)) {
        return true;
      }
    }

    return false;
  }

  private hasScriptContent(content: Buffer, fileExt: string): boolean {
    // Don't check script content for files that are supposed to contain scripts
    const scriptExtensions = ['.js', '.ts', '.py', '.sh', '.bat', '.ps1'];
    if (scriptExtensions.includes(fileExt)) {
      return false;
    }

    const contentStr = content.toString('utf8', 0, Math.min(content.length, 512));
    
    // Check for script patterns
    const scriptPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i,        // Event handlers
      /eval\s*\(/i,
      /document\.write/i,
      /window\.location/i,
      /\.innerHTML/i,
    ];

    return scriptPatterns.some(pattern => pattern.test(contentStr));
  }

  private hasMaliciousPatterns(content: Buffer): boolean {
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 512));
    
    // Check for common malicious patterns
    const maliciousPatterns = [
      /\$\{.*\}/,          // Template injection
      /<\?php/i,           // PHP code
      /<%.*%>/,            // ASP/JSP code
      /\{\{.*\}\}/,        // Template engines
      /\bexec\s*\(/i,      // Code execution
      /\bsystem\s*\(/i,    // System calls
      /\bshell_exec\s*\(/i, // Shell execution
      /\bpassthru\s*\(/i,  // Command execution
      /\bfile_get_contents\s*\(/i, // File access
      /\bfopen\s*\(/i,     // File operations
      /\binclude\s*\(/i,   // File inclusion
      /\brequire\s*\(/i,   // File inclusion
    ];

    return maliciousPatterns.some(pattern => pattern.test(contentStr));
  }

  private validateImageContent(content: Buffer, ext: string): boolean {
    // Validate image file signatures
    const imageSignatures: Record<string, Buffer[]> = {
      '.jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      '.jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      '.png': [Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
      '.gif': [
        Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
        Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])  // GIF89a
      ],
      '.webp': [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF (WebP container)
      '.svg': [Buffer.from('<?xml'), Buffer.from('<svg')],
    };

    const signatures = imageSignatures[ext];
    if (!signatures) {
      return true; // Unknown image type, let other validation handle it
    }

    // Check if content starts with valid image signature
    return signatures.some(signature => {
      if (ext === '.svg') {
        // For SVG, check if content starts with XML or SVG tag
        const contentStr = content.toString('utf8', 0, Math.min(content.length, 100));
        return contentStr.trim().toLowerCase().startsWith(signature.toString().toLowerCase());
      } else {
        return content.subarray(0, signature.length).equals(signature);
      }
    });
  }
}