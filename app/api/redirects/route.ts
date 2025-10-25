import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export const dynamic = 'force-static';

export interface RedirectRule {
  from_path: string;
  to_path: string;
  status_code: number;
  locale?: string;
  version?: string;
  created_at: string;
}

export interface CreateRedirectRequest {
  from_path: string;
  to_path: string;
  status_code?: number;
  locale?: string;
  version?: string;
}

export interface BulkRedirectRequest {
  redirects: CreateRedirectRequest[];
  overwrite?: boolean;
}

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
 * Check for redirect conflicts
 */
function checkRedirectConflicts(
  newRule: CreateRedirectRequest,
  existingRules: RedirectRule[]
): string[] {
  const conflicts: string[] = [];
  
  for (const existing of existingRules) {
    // Check for exact path conflicts
    if (existing.from_path === newRule.from_path) {
      if (existing.locale === newRule.locale && existing.version === newRule.version) {
        conflicts.push(`Redirect already exists for path: ${newRule.from_path}`);
      }
    }
    
    // Check for circular redirects
    if (existing.from_path === newRule.to_path && existing.to_path === newRule.from_path) {
      conflicts.push(`Circular redirect detected: ${newRule.from_path} <-> ${newRule.to_path}`);
    }
    
    // Check for redirect chains (A -> B -> C)
    if (existing.from_path === newRule.to_path) {
      conflicts.push(`Redirect chain detected: ${newRule.from_path} -> ${newRule.to_path} -> ${existing.to_path}`);
    }
  }
  
  return conflicts;
}

/**
 * GET /api/redirects
 * Get all redirect rules with optional filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale');
    const version = searchParams.get('version');
    const from_path = searchParams.get('from_path');
    
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
    
    if (from_path) {
      conditions.push('from_path LIKE ?');
      params.push(`%${from_path}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = connection.prepare(query);
    const rows = stmt.all(...params) as RedirectRow[];
    
    const redirects: RedirectRule[] = rows.map(row => ({
      from_path: row.from_path,
      to_path: row.to_path,
      status_code: row.status_code,
      locale: row.locale || undefined,
      version: row.version || undefined,
      created_at: row.created_at,
    }));
    
    return NextResponse.json({
      redirects,
      total: redirects.length,
    });
  } catch (error) {
    console.error('Error fetching redirects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch redirects' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/redirects
 * Create a new redirect rule
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const rule: CreateRedirectRequest = {
      from_path: body.from_path,
      to_path: body.to_path,
      status_code: body.status_code || 301,
      locale: body.locale,
      version: body.version,
    };
    
    // Validate the rule
    const validationErrors = validateRedirectRule(rule);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const connection = db.getConnection();
    
    // Get existing rules to check for conflicts
    const existingStmt = connection.prepare('SELECT from_path, to_path, status_code, locale, version, created_at FROM redirects');
    const existingRules = existingStmt.all() as RedirectRow[];
    
    const conflicts = checkRedirectConflicts(rule, existingRules.map(row => ({
      from_path: row.from_path,
      to_path: row.to_path,
      status_code: row.status_code,
      locale: row.locale || undefined,
      version: row.version || undefined,
      created_at: row.created_at,
    })));
    
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Redirect conflicts detected', details: conflicts },
        { status: 409 }
      );
    }
    
    // Insert the new redirect
    const insertStmt = connection.prepare(`
      INSERT INTO redirects (from_path, to_path, status_code, locale, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = insertStmt.run(
      rule.from_path,
      rule.to_path,
      rule.status_code,
      rule.locale || null,
      rule.version || null
    );
    
    return NextResponse.json(
      { 
        message: 'Redirect created successfully',
        redirect: {
          ...rule,
          created_at: new Date().toISOString(),
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating redirect:', error);
    return NextResponse.json(
      { error: 'Failed to create redirect' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/redirects
 * Delete redirect rules
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const from_path = searchParams.get('from_path');
    const locale = searchParams.get('locale');
    const version = searchParams.get('version');
    
    if (!from_path) {
      return NextResponse.json(
        { error: 'from_path parameter is required' },
        { status: 400 }
      );
    }
    
    const db = getDatabase();
    const connection = db.getConnection();
    
    let query = 'DELETE FROM redirects WHERE from_path = ?';
    const params: any[] = [from_path];
    
    if (locale) {
      query += ' AND (locale = ? OR locale IS NULL)';
      params.push(locale);
    }
    
    if (version) {
      query += ' AND (version = ? OR version IS NULL)';
      params.push(version);
    }
    
    const stmt = connection.prepare(query);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Redirect not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Redirect deleted successfully',
      deleted: result.changes,
    });
  } catch (error) {
    console.error('Error deleting redirect:', error);
    return NextResponse.json(
      { error: 'Failed to delete redirect' },
      { status: 500 }
    );
  }
}