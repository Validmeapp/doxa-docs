import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { CreateRedirectRequest, RedirectRule, BulkRedirectRequest } from '../route';

export const dynamic = 'force-static';

interface RedirectRow {
  from_path: string;
  to_path: string;
  status_code: number;
  locale: string | null;
  version: string | null;
  created_at: string;
}

/**
 * Validate redirect rule
 */
function validateRedirectRule(rule: CreateRedirectRequest): string[] {
  const errors: string[] = [];
  
  if (!rule.from_path || typeof rule.from_path !== 'string') {
    errors.push('from_path is required and must be a string');
  } else if (!rule.from_path.startsWith('/')) {
    errors.push('from_path must start with /');
  }
  
  if (!rule.to_path || typeof rule.to_path !== 'string') {
    errors.push('to_path is required and must be a string');
  } else if (!rule.to_path.startsWith('/') && !rule.to_path.startsWith('http')) {
    errors.push('to_path must start with / or be a full URL');
  }
  
  if (rule.status_code && ![301, 302, 307, 308].includes(rule.status_code)) {
    errors.push('status_code must be 301, 302, 307, or 308');
  }
  
  if (rule.from_path === rule.to_path) {
    errors.push('from_path and to_path cannot be the same');
  }
  
  return errors;
}

/**
 * Check for redirect conflicts within a batch and against existing rules
 */
function checkBulkRedirectConflicts(
  newRules: CreateRedirectRequest[],
  existingRules: RedirectRule[]
): { rule: CreateRedirectRequest; conflicts: string[] }[] {
  const conflictResults: { rule: CreateRedirectRequest; conflicts: string[] }[] = [];
  
  for (let i = 0; i < newRules.length; i++) {
    const rule = newRules[i];
    const conflicts: string[] = [];
    
    // Check conflicts with existing rules
    for (const existing of existingRules) {
      if (existing.from_path === rule.from_path) {
        if (existing.locale === rule.locale && existing.version === rule.version) {
          conflicts.push(`Redirect already exists for path: ${rule.from_path}`);
        }
      }
      
      if (existing.from_path === rule.to_path && existing.to_path === rule.from_path) {
        conflicts.push(`Circular redirect detected: ${rule.from_path} <-> ${rule.to_path}`);
      }
      
      if (existing.from_path === rule.to_path) {
        conflicts.push(`Redirect chain detected: ${rule.from_path} -> ${rule.to_path} -> ${existing.to_path}`);
      }
    }
    
    // Check conflicts within the batch
    for (let j = 0; j < newRules.length; j++) {
      if (i !== j) {
        const otherRule = newRules[j];
        
        if (rule.from_path === otherRule.from_path) {
          if (rule.locale === otherRule.locale && rule.version === otherRule.version) {
            conflicts.push(`Duplicate redirect in batch for path: ${rule.from_path}`);
          }
        }
        
        if (rule.from_path === otherRule.to_path && rule.to_path === otherRule.from_path) {
          conflicts.push(`Circular redirect in batch: ${rule.from_path} <-> ${rule.to_path}`);
        }
      }
    }
    
    if (conflicts.length > 0) {
      conflictResults.push({ rule, conflicts });
    }
  }
  
  return conflictResults;
}

/**
 * POST /api/redirects/bulk
 * Create multiple redirect rules at once
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as BulkRedirectRequest;
    
    if (!body || !Array.isArray(body.redirects)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected { redirects: CreateRedirectRequest[] }' },
        { status: 400 }
      );
    }
    
    if (body.redirects.length === 0) {
      return NextResponse.json(
        { error: 'No redirects provided' },
        { status: 400 }
      );
    }
    
    if (body.redirects.length > 1000) {
      return NextResponse.json(
        { error: 'Too many redirects. Maximum 1000 per batch' },
        { status: 400 }
      );
    }
    
    // Validate all rules
    const validationErrors: { index: number; rule: CreateRedirectRequest; errors: string[] }[] = [];
    
    for (let i = 0; i < body.redirects.length; i++) {
      const rule = body.redirects[i];
      const errors = validateRedirectRule(rule);
      
      if (errors.length > 0) {
        validationErrors.push({ index: i, rule, errors });
      }
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed for some redirects',
          details: validationErrors
        },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const connection = db.getConnection();
    
    // Get existing rules to check for conflicts
    const existingStmt = connection.prepare('SELECT from_path, to_path, status_code, locale, version, created_at FROM redirects');
    const existingRows = existingStmt.all() as RedirectRow[];
    const existingRules: RedirectRule[] = existingRows.map(row => ({
      from_path: row.from_path,
      to_path: row.to_path,
      status_code: row.status_code,
      locale: row.locale || undefined,
      version: row.version || undefined,
      created_at: row.created_at,
    }));
    
    // Check for conflicts
    const conflicts = checkBulkRedirectConflicts(body.redirects, existingRules);
    
    if (conflicts.length > 0 && !body.overwrite) {
      return NextResponse.json(
        { 
          error: 'Redirect conflicts detected',
          details: conflicts,
          message: 'Set overwrite: true to replace existing redirects'
        },
        { status: 409 }
      );
    }
    
    // Prepare statements
    const insertStmt = connection.prepare(`
      INSERT INTO redirects (from_path, to_path, status_code, locale, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const updateStmt = connection.prepare(`
      INSERT INTO redirects (from_path, to_path, status_code, locale, version)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(from_path) DO UPDATE SET
        to_path = excluded.to_path,
        status_code = excluded.status_code,
        locale = excluded.locale,
        version = excluded.version,
        created_at = CURRENT_TIMESTAMP
    `);
    
    const stmt = body.overwrite ? updateStmt : insertStmt;
    
    // Execute bulk insert in a transaction
    const results = {
      created: 0,
      updated: 0,
      errors: [] as { rule: CreateRedirectRequest; error: string }[],
    };
    
    const transaction = connection.transaction(() => {
      for (const rule of body.redirects) {
        try {
          const result = stmt.run(
            rule.from_path,
            rule.to_path,
            rule.status_code || 301,
            rule.locale || null,
            rule.version || null
          );
          
          if (body.overwrite && result.changes === 0) {
            results.updated++;
          } else {
            results.created++;
          }
        } catch (error) {
          results.errors.push({
            rule,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    });
    
    transaction();
    
    const response = {
      message: 'Bulk redirect operation completed',
      results,
      total: body.redirects.length,
    };
    
    // Return appropriate status code
    if (results.errors.length > 0) {
      return NextResponse.json(response, { status: 207 }); // Multi-Status
    } else {
      return NextResponse.json(response, { status: 201 });
    }
  } catch (error) {
    console.error('Error in bulk redirect operation:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk redirects' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/redirects/bulk/export
 * Export all redirects as JSON
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const locale = searchParams.get('locale');
    const version = searchParams.get('version');
    
    const db = getDatabase();
    const connection = db.getConnection();
    
    let query = 'SELECT from_path, to_path, status_code, locale, version, created_at FROM redirects';
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (locale) {
      conditions.push('(locale = ? OR locale IS NULL)');
      params.push(locale);
    }
    
    if (version) {
      conditions.push('(version = ? OR version IS NULL)');
      params.push(version);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY from_path';
    
    const stmt = connection.prepare(query);
    const rows = stmt.all(...params) as RedirectRow[];
    
    const redirects: CreateRedirectRequest[] = rows.map(row => ({
      from_path: row.from_path,
      to_path: row.to_path,
      status_code: row.status_code,
      locale: row.locale || undefined,
      version: row.version || undefined,
    }));
    
    if (format === 'csv') {
      // Export as CSV
      const csvHeader = 'from_path,to_path,status_code,locale,version\n';
      const csvRows = redirects.map(redirect => 
        `"${redirect.from_path}","${redirect.to_path}",${redirect.status_code},"${redirect.locale || ''}","${redirect.version || ''}"`
      ).join('\n');
      
      return new NextResponse(csvHeader + csvRows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="redirects.csv"',
        },
      });
    } else {
      // Export as JSON
      return NextResponse.json({
        redirects,
        total: redirects.length,
        exported_at: new Date().toISOString(),
      }, {
        headers: {
          'Content-Disposition': 'attachment; filename="redirects.json"',
        },
      });
    }
  } catch (error) {
    console.error('Error exporting redirects:', error);
    return NextResponse.json(
      { error: 'Failed to export redirects' },
      { status: 500 }
    );
  }
}