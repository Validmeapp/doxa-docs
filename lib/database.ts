import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
  verbose?: boolean;
}

class DatabaseClient {
  private db: Database.Database | null = null;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  /**
   * Initialize database connection and ensure database file exists
   */
  connect(): Database.Database {
    if (this.db) {
      return this.db;
    }

    try {
      // Ensure database directory exists
      const dbDir = path.dirname(this.config.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Create database connection
      this.db = new Database(this.config.path, {
        readonly: this.config.readonly || false,
        verbose: this.config.verbose ? console.log : undefined,
      });

      // Enable WAL mode for better concurrent access
      if (!this.config.readonly) {
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('cache_size = 1000');
        this.db.pragma('temp_store = memory');
      }

      return this.db;
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * Get database connection, creating it if it doesn't exist
   */
  getConnection(): Database.Database {
    if (!this.db) {
      return this.connect();
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Check if database connection is active
   */
  isConnected(): boolean {
    return this.db !== null && this.db.open;
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  transaction<T>(fn: (db: Database.Database) => T): T {
    const db = this.getConnection();
    const transaction = db.transaction(fn);
    return transaction(db);
  }

  /**
   * Prepare a statement for reuse
   */
  prepare(sql: string): Database.Statement {
    const db = this.getConnection();
    return db.prepare(sql);
  }

  /**
   * Execute a single SQL statement
   */
  exec(sql: string): void {
    const db = this.getConnection();
    db.exec(sql);
  }

  /**
   * Get database info for health checks
   */
  getInfo(): {
    path: string;
    size: number;
    readonly: boolean;
    connected: boolean;
  } {
    const stats = fs.existsSync(this.config.path) 
      ? fs.statSync(this.config.path) 
      : null;

    return {
      path: this.config.path,
      size: stats?.size || 0,
      readonly: this.config.readonly || false,
      connected: this.isConnected(),
    };
  }
}

// Default database configuration
const defaultConfig: DatabaseConfig = {
  path: path.join(process.cwd(), 'data', 'docs.db'),
  readonly: false,
  verbose: process.env.NODE_ENV === 'development',
};

// Singleton database client instance
let dbClient: DatabaseClient | null = null;

/**
 * Get the singleton database client instance
 */
export function getDatabase(config?: Partial<DatabaseConfig>): DatabaseClient {
  if (!dbClient) {
    dbClient = new DatabaseClient({ ...defaultConfig, ...config });
  }
  return dbClient;
}

/**
 * Initialize database with connection
 */
export function initializeDatabase(config?: Partial<DatabaseConfig>): DatabaseClient {
  const client = getDatabase(config);
  client.connect();
  return client;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbClient) {
    dbClient.close();
    dbClient = null;
  }
}

export default DatabaseClient;