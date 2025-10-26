#!/usr/bin/env tsx

/**
 * Content linting script for documentation quality
 * Checks for writing style, consistency, and best practices
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

interface LintRule {
  name: string;
  description: string;
  check: (content: string, frontmatter: any, filePath: string) => LintIssue[];
}

interface LintIssue {
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

interface LintReport {
  filePath: string;
  issues: LintIssue[];
}

class ContentLinter {
  private rules: LintRule[] = [];

  constructor() {
    this.initializeRules();
  }

  async lintAll(): Promise<LintReport[]> {
    console.log('🔍 Linting all content files...');
    
    const files = await glob('content/**/*.mdx');
    const reports: LintReport[] = [];

    for (const file of files) {
      const report = await this.lintFile(file);
      if (report.issues.length > 0) {
        reports.push(report);
      }
    }

    this.displayResults(reports);
    return reports;
  }

  async lintFile(filePath: string): Promise<LintReport> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: mdxContent } = matter(content);
    
    const issues: LintIssue[] = [];

    for (const rule of this.rules) {
      const ruleIssues = rule.check(mdxContent, frontmatter, filePath);
      issues.push(...ruleIssues);
    }

    return { filePath, issues };
  }

  private initializeRules(): void {
    this.rules = [
      // Frontmatter rules
      {
        name: 'frontmatter-completeness',
        description: 'Check for complete frontmatter',
        check: (content, frontmatter, filePath) => {
          const issues: LintIssue[] = [];
          const required = ['title', 'description', 'version', 'locale', 'order'];
          
          for (const field of required) {
            if (!frontmatter[field]) {
              issues.push({
                rule: 'frontmatter-completeness',
                severity: 'error',
                message: `Missing required frontmatter field: ${field}`,
                suggestion: `Add ${field} to the frontmatter`
              });
            }
          }
          
          return issues;
        }
      },

      // Title rules
      {
        name: 'title-style',
        description: 'Check title formatting and style',
        check: (content, frontmatter) => {
          const issues: LintIssue[] = [];
          const title = frontmatter.title;
          
          if (title) {
            // Check title length
            if (title.length > 60) {
              issues.push({
                rule: 'title-style',
                severity: 'warning',
                message: 'Title is too long (>60 characters)',
                suggestion: 'Consider shortening the title for better readability'
              });
            }
            
            // Check for title case
            const words = title.split(' ');
            const shouldBeCapitalized = words.filter((word: string, index: number) => {
              // Skip articles, prepositions, and conjunctions unless they're the first word
              const skipWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
              return index === 0 || !skipWords.includes(word.toLowerCase());
            });
            
            for (const word of shouldBeCapitalized) {
              if (word[0] !== word[0].toUpperCase()) {
                issues.push({
                  rule: 'title-style',
                  severity: 'info',
                  message: 'Title should use title case',
                  suggestion: 'Capitalize the first letter of major words'
                });
                break;
              }
            }
          }
          
          return issues;
        }
      },

      // Content structure rules
      {
        name: 'heading-structure',
        description: 'Check heading hierarchy and structure',
        check: (content) => {
          const issues: LintIssue[] = [];
          const lines = content.split('\n');
          let lastHeadingLevel = 0;
          let hasH1 = false;
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            
            if (headingMatch) {
              const level = headingMatch[1].length;
              const text = headingMatch[2];
              
              if (level === 1) hasH1 = true;
              
              // Check for empty headings
              if (!text.trim()) {
                issues.push({
                  rule: 'heading-structure',
                  severity: 'error',
                  message: 'Empty heading found',
                  line: i + 1,
                  suggestion: 'Add descriptive text to the heading'
                });
              }
              
              // Check heading hierarchy
              if (level > lastHeadingLevel + 1) {
                issues.push({
                  rule: 'heading-structure',
                  severity: 'warning',
                  message: `Heading level skip: h${level} after h${lastHeadingLevel}`,
                  line: i + 1,
                  suggestion: 'Use sequential heading levels (h1, h2, h3, etc.)'
                });
              }
              
              lastHeadingLevel = level;
            }
          }
          
          if (!hasH1) {
            issues.push({
              rule: 'heading-structure',
              severity: 'error',
              message: 'Missing main heading (h1)',
              suggestion: 'Add a main heading at the top of the document'
            });
          }
          
          return issues;
        }
      },

      // Writing style rules
      {
        name: 'writing-style',
        description: 'Check for writing style and readability',
        check: (content) => {
          const issues: LintIssue[] = [];
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for very long lines (readability)
            if (line.length > 120 && !line.includes('```') && !line.includes('http')) {
              issues.push({
                rule: 'writing-style',
                severity: 'info',
                message: 'Line is very long (>120 characters)',
                line: i + 1,
                suggestion: 'Consider breaking long lines for better readability'
              });
            }
            
            // Check for passive voice indicators
            const passiveIndicators = ['is being', 'was being', 'will be', 'has been', 'have been'];
            for (const indicator of passiveIndicators) {
              if (line.toLowerCase().includes(indicator)) {
                issues.push({
                  rule: 'writing-style',
                  severity: 'info',
                  message: 'Consider using active voice instead of passive voice',
                  line: i + 1,
                  suggestion: 'Rewrite in active voice for clarity'
                });
                break;
              }
            }
            
            // Check for filler words
            const fillerWords = ['very', 'really', 'quite', 'rather', 'somewhat', 'just', 'simply'];
            for (const filler of fillerWords) {
              const regex = new RegExp(`\\b${filler}\\b`, 'gi');
              if (regex.test(line)) {
                issues.push({
                  rule: 'writing-style',
                  severity: 'info',
                  message: `Consider removing filler word: "${filler}"`,
                  line: i + 1,
                  suggestion: 'Remove unnecessary filler words for conciseness'
                });
              }
            }
          }
          
          return issues;
        }
      },

      // Code block rules
      {
        name: 'code-blocks',
        description: 'Check code block formatting and language specification',
        check: (content) => {
          const issues: LintIssue[] = [];
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for code blocks without language
            if (line === '```') {
              // Look ahead to see if this is a code block with content
              let hasContent = false;
              for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].trim() === '```') break;
                if (lines[j].trim()) {
                  hasContent = true;
                  break;
                }
              }
              
              if (hasContent) {
                issues.push({
                  rule: 'code-blocks',
                  severity: 'warning',
                  message: 'Code block without language specification',
                  line: i + 1,
                  suggestion: 'Add language identifier (e.g., ```javascript, ```bash)'
                });
              }
            }
          }
          
          return issues;
        }
      },

      // Link rules
      {
        name: 'links',
        description: 'Check link formatting and accessibility',
        check: (content) => {
          const issues: LintIssue[] = [];
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for bare URLs (should be formatted as links)
            const urlRegex = /https?:\/\/[^\s\)]+/g;
            const urls = line.match(urlRegex);
            
            if (urls) {
              for (const url of urls) {
                // Check if URL is already in a markdown link
                const linkRegex = new RegExp(`\\[.*?\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
                if (!linkRegex.test(line)) {
                  issues.push({
                    rule: 'links',
                    severity: 'info',
                    message: 'Bare URL found, consider formatting as a link',
                    line: i + 1,
                    suggestion: `Format as [descriptive text](${url})`
                  });
                }
              }
            }
            
            // Check for "click here" or similar non-descriptive link text
            const badLinkText = /\[(?:click here|here|read more|more|link)\]/gi;
            if (badLinkText.test(line)) {
              issues.push({
                rule: 'links',
                severity: 'warning',
                message: 'Non-descriptive link text found',
                line: i + 1,
                suggestion: 'Use descriptive link text that explains the destination'
              });
            }
          }
          
          return issues;
        }
      },

      // Consistency rules
      {
        name: 'consistency',
        description: 'Check for consistency in terminology and formatting',
        check: (content, frontmatter, filePath) => {
          const issues: LintIssue[] = [];
          
          // Check for consistent API terminology
          const apiTerms = {
            'REST API': ['rest api', 'Rest API', 'REST api'],
            'JSON': ['json', 'Json'],
            'HTTP': ['http', 'Http'],
            'URL': ['url', 'Url'],
            'API key': ['api key', 'API Key', 'api-key']
          };
          
          for (const [correct, variants] of Object.entries(apiTerms)) {
            for (const variant of variants) {
              if (content.includes(variant)) {
                issues.push({
                  rule: 'consistency',
                  severity: 'info',
                  message: `Inconsistent terminology: "${variant}" should be "${correct}"`,
                  suggestion: `Use "${correct}" consistently throughout the documentation`
                });
              }
            }
          }
          
          return issues;
        }
      }
    ];
  }

  private displayResults(reports: LintReport[]): void {
    if (reports.length === 0) {
      console.log('✅ No linting issues found!');
      return;
    }

    let totalIssues = 0;
    let errorCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    console.log(`\n📋 Linting Results (${reports.length} files with issues):\n`);

    for (const report of reports) {
      console.log(`📄 ${report.filePath}:`);
      
      for (const issue of report.issues) {
        totalIssues++;
        
        const icon = this.getSeverityIcon(issue.severity);
        const location = issue.line ? `:${issue.line}` : '';
        
        console.log(`  ${icon} [${issue.rule}${location}] ${issue.message}`);
        
        if (issue.suggestion) {
          console.log(`    💡 ${issue.suggestion}`);
        }
        
        switch (issue.severity) {
          case 'error': errorCount++; break;
          case 'warning': warningCount++; break;
          case 'info': infoCount++; break;
        }
      }
      
      console.log();
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`  Total issues: ${totalIssues}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`  ⚠️  Warnings: ${warningCount}`);
    console.log(`  ℹ️  Info: ${infoCount}`);

    if (errorCount > 0) {
      console.log('\n💡 Fix errors before publishing content.');
    }
  }

  private getSeverityIcon(severity: LintIssue['severity']): string {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[severity];
  }

  async generateReport(): Promise<void> {
    const reports = await this.lintAll();
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalFiles: reports.length,
      totalIssues: reports.reduce((sum, report) => sum + report.issues.length, 0),
      issuesBySeverity: {
        error: 0,
        warning: 0,
        info: 0
      },
      issuesByRule: {} as Record<string, number>,
      files: reports
    };

    // Calculate statistics
    for (const report of reports) {
      for (const issue of report.issues) {
        summary.issuesBySeverity[issue.severity]++;
        summary.issuesByRule[issue.rule] = (summary.issuesByRule[issue.rule] || 0) + 1;
      }
    }

    const reportPath = 'content-lint-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const linter = new ContentLinter();

  switch (command) {
    case 'check':
      const reports = await linter.lintAll();
      const hasErrors = reports.some(report => 
        report.issues.some(issue => issue.severity === 'error')
      );
      process.exit(hasErrors ? 1 : 0);
      break;

    case 'report':
      await linter.generateReport();
      break;

    case 'file':
      const filePath = args[1];
      if (!filePath) {
        console.error('Usage: tsx scripts/content-linter.ts file <file-path>');
        process.exit(1);
      }
      const report = await linter.lintFile(filePath);
      if (report.issues.length > 0) {
        console.log(`📄 ${report.filePath}:`);
        for (const issue of report.issues) {
          const icon = linter['getSeverityIcon'](issue.severity);
          const location = issue.line ? `:${issue.line}` : '';
          console.log(`  ${icon} [${issue.rule}${location}] ${issue.message}`);
          if (issue.suggestion) {
            console.log(`    💡 ${issue.suggestion}`);
          }
        }
      } else {
        console.log('✅ No issues found in this file');
      }
      break;

    default:
      console.log(`
📋 Content Linter

Usage: tsx scripts/content-linter.ts <command> [options]

Commands:
  check           Lint all content files and exit with error code if issues found
  report          Generate detailed linting report
  file <path>     Lint a specific file

Examples:
  tsx scripts/content-linter.ts check
  tsx scripts/content-linter.ts report
  tsx scripts/content-linter.ts file content/en/docs/v1/overview.mdx

Rules checked:
  • Frontmatter completeness
  • Title style and formatting
  • Heading structure and hierarchy
  • Writing style and readability
  • Code block formatting
  • Link accessibility
  • Terminology consistency
`);
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ContentLinter };