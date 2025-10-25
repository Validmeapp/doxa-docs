import { getDatabase } from './database';
import { runMigrations } from './migrations';

/**
 * Initialize database with schema and run migrations
 */
export async function initializeDatabaseWithSchema(): Promise<void> {
  try {
    const db = getDatabase();
    
    // Connect to database
    db.connect();
    
    // Run migrations to set up schema
    await runMigrations();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Health check for database connectivity
 */
export function checkDatabaseHealth(): {
  status: 'healthy' | 'unhealthy';
  info: {
    path: string;
    size: number;
    readonly: boolean;
    connected: boolean;
  };
  error?: string;
} {
  try {
    const db = getDatabase();
    const info = db.getInfo();
    
    // Try a simple query to verify connection
    if (db.isConnected()) {
      const connection = db.getConnection();
      connection.prepare('SELECT 1').get();
    }
    
    return {
      status: 'healthy',
      info,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      info: {
        path: '',
        size: 0,
        readonly: false,
        connected: false,
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}