import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static';

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'up' | 'down';
    filesystem: 'up' | 'down';
    search: 'up' | 'down';
  };
  details?: {
    database?: {
      connected: boolean;
      size: number;
      path: string;
      responseTime?: number;
    };
    filesystem?: {
      contentDir: boolean;
      writable: boolean;
      responseTime?: number;
    };
    search?: {
      indexExists: boolean;
      locales: string[];
      responseTime?: number;
    };
  };
  responseTime: number;
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<{
  status: 'up' | 'down';
  details: {
    connected: boolean;
    size: number;
    path: string;
    responseTime: number;
  };
}> {
  const startTime = Date.now();
  
  try {
    const db = getDatabase();
    const info = db.getInfo();
    
    // Test database connection with a simple query
    const connection = db.getConnection();
    const stmt = connection.prepare('SELECT 1 as test');
    const result = stmt.get();
    
    const responseTime = Date.now() - startTime;
    
    if (result && (result as any).test === 1) {
      return {
        status: 'up',
        details: {
          connected: info.connected,
          size: info.size,
          path: info.path,
          responseTime,
        },
      };
    } else {
      throw new Error('Database query failed');
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Database health check failed:', error);
    
    return {
      status: 'down',
      details: {
        connected: false,
        size: 0,
        path: '',
        responseTime,
      },
    };
  }
}

/**
 * Check filesystem health
 */
async function checkFilesystemHealth(): Promise<{
  status: 'up' | 'down';
  details: {
    contentDir: boolean;
    writable: boolean;
    responseTime: number;
  };
}> {
  const startTime = Date.now();
  
  try {
    const contentDir = path.join(process.cwd(), 'content');
    const dataDir = path.join(process.cwd(), 'data');
    
    // Check if content directory exists and is readable
    const contentDirExists = fs.existsSync(contentDir);
    let contentDirReadable = false;
    
    if (contentDirExists) {
      try {
        fs.readdirSync(contentDir);
        contentDirReadable = true;
      } catch (error) {
        console.error('Content directory not readable:', error);
      }
    }
    
    // Check if data directory is writable
    let dataWritable = false;
    try {
      // Ensure data directory exists
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Test write access
      const testFile = path.join(dataDir, '.health-check');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      dataWritable = true;
    } catch (error) {
      console.error('Data directory not writable:', error);
    }
    
    const responseTime = Date.now() - startTime;
    
    if (contentDirReadable && dataWritable) {
      return {
        status: 'up',
        details: {
          contentDir: contentDirExists,
          writable: dataWritable,
          responseTime,
        },
      };
    } else {
      return {
        status: 'down',
        details: {
          contentDir: contentDirExists,
          writable: dataWritable,
          responseTime,
        },
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Filesystem health check failed:', error);
    
    return {
      status: 'down',
      details: {
        contentDir: false,
        writable: false,
        responseTime,
      },
    };
  }
}

/**
 * Check search index health
 */
async function checkSearchHealth(): Promise<{
  status: 'up' | 'down';
  details: {
    indexExists: boolean;
    locales: string[];
    responseTime: number;
  };
}> {
  const startTime = Date.now();
  
  try {
    const searchDir = path.join(process.cwd(), 'public', 'search');
    const locales: string[] = [];
    let indexExists = false;
    
    if (fs.existsSync(searchDir)) {
      try {
        const entries = fs.readdirSync(searchDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const localePath = path.join(searchDir, entry.name);
            const versionDirs = fs.readdirSync(localePath, { withFileTypes: true });
            
            for (const versionDir of versionDirs) {
              if (versionDir.isDirectory()) {
                const indexPath = path.join(localePath, versionDir.name, 'pagefind.js');
                if (fs.existsSync(indexPath)) {
                  locales.push(entry.name);
                  indexExists = true;
                  break;
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error reading search directory:', error);
      }
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: indexExists ? 'up' : 'down',
      details: {
        indexExists,
        locales: [...new Set(locales)], // Remove duplicates
        responseTime,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Search health check failed:', error);
    
    return {
      status: 'down',
      details: {
        indexExists: false,
        locales: [],
        responseTime,
      },
    };
  }
}

/**
 * Determine overall health status
 */
function determineOverallStatus(services: {
  database: 'up' | 'down';
  filesystem: 'up' | 'down';
  search: 'up' | 'down';
}): 'healthy' | 'degraded' | 'unhealthy' {
  const upServices = Object.values(services).filter(status => status === 'up').length;
  const totalServices = Object.keys(services).length;
  
  if (upServices === totalServices) {
    return 'healthy';
  } else if (upServices >= totalServices / 2) {
    return 'degraded';
  } else {
    return 'unhealthy';
  }
}

/**
 * GET /api/health
 * Returns health status of all services
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [databaseHealth, filesystemHealth, searchHealth] = await Promise.all([
      checkDatabaseHealth(),
      checkFilesystemHealth(),
      checkSearchHealth(),
    ]);
    
    const services = {
      database: databaseHealth.status,
      filesystem: filesystemHealth.status,
      search: searchHealth.status,
    };
    
    const overallStatus = determineOverallStatus(services);
    const responseTime = Date.now() - startTime;
    
    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      details: {
        database: databaseHealth.details,
        filesystem: filesystemHealth.details,
        search: searchHealth.details,
      },
      responseTime,
    };
    
    // Set appropriate HTTP status code
    let httpStatus = 200;
    if (overallStatus === 'degraded') {
      httpStatus = 207; // Multi-Status
    } else if (overallStatus === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    }
    
    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Health check failed:', error);
    
    const responseTime = Date.now() - startTime;
    
    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'down',
        filesystem: 'down',
        search: 'down',
      },
      responseTime,
    };
    
    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * HEAD /api/health
 * Returns only status code for simple health checks
 */
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    // Quick health check - just test database connection
    const db = getDatabase();
    const connection = db.getConnection();
    const stmt = connection.prepare('SELECT 1');
    stmt.get();
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}