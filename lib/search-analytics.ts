import { getDatabase } from './database';

interface SearchQuery {
  query: string;
  locale: string;
  version: string;
  resultsCount: number;
  clickedResultPath?: string;
}

interface SearchMetadata {
  indexVersion: string;
  locale: string;
  version: string;
  pageCount: number;
  indexSizeBytes: number;
  indexedAt: string;
}

interface PopularSearch {
  query: string;
  count: number;
  locale: string;
  version: string;
  lastSearched: string;
}

interface SearchAnalytics {
  totalSearches: number;
  uniqueQueries: number;
  averageResultsPerQuery: number;
  topQueries: PopularSearch[];
  searchesByLocale: Record<string, number>;
  searchesByVersion: Record<string, number>;
}

export class SearchAnalyticsService {
  private db = getDatabase();

  /**
   * Log a search query
   */
  async logSearch(searchData: SearchQuery): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO search_queries (query, locale, version, results_count, searched_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        searchData.query,
        searchData.locale,
        searchData.version,
        searchData.resultsCount,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Failed to log search query:', error);
    }
  }

  /**
   * Log a search result click
   */
  async logResultClick(searchData: SearchQuery & { clickedResultPath: string }): Promise<void> {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO search_queries (query, locale, version, results_count, clicked_result_path, searched_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        searchData.query,
        searchData.locale,
        searchData.version,
        searchData.resultsCount,
        searchData.clickedResultPath,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Failed to log search result click:', error);
    }
  }

  /**
   * Get popular search queries
   */
  async getPopularSearches(
    locale?: string,
    version?: string,
    limit: number = 10
  ): Promise<PopularSearch[]> {
    try {
      let query = `
        SELECT 
          query,
          COUNT(*) as count,
          locale,
          version,
          MAX(searched_at) as lastSearched
        FROM search_queries
        WHERE query != ''
      `;
      
      const params: any[] = [];
      
      if (locale) {
        query += ' AND locale = ?';
        params.push(locale);
      }
      
      if (version) {
        query += ' AND version = ?';
        params.push(version);
      }
      
      query += `
        GROUP BY query, locale, version
        ORDER BY count DESC, lastSearched DESC
        LIMIT ?
      `;
      params.push(limit);

      const stmt = this.db.prepare(query);
      const results = stmt.all(...params) as any[];

      return results.map(row => ({
        query: row.query,
        count: row.count,
        locale: row.locale,
        version: row.version,
        lastSearched: row.lastSearched
      }));
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Get search analytics summary
   */
  async getSearchAnalytics(
    locale?: string,
    version?: string,
    days: number = 30
  ): Promise<SearchAnalytics> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const dateThresholdISO = dateThreshold.toISOString();

      let baseQuery = `
        FROM search_queries
        WHERE searched_at >= ?
      `;
      const params: any[] = [dateThresholdISO];

      if (locale) {
        baseQuery += ' AND locale = ?';
        params.push(locale);
      }

      if (version) {
        baseQuery += ' AND version = ?';
        params.push(version);
      }

      // Total searches
      const totalSearchesStmt = this.db.prepare(`SELECT COUNT(*) as count ${baseQuery}`);
      const totalSearches = (totalSearchesStmt.get(...params) as any)?.count || 0;

      // Unique queries
      const uniqueQueriesStmt = this.db.prepare(`SELECT COUNT(DISTINCT query) as count ${baseQuery} AND query != ''`);
      const uniqueQueries = (uniqueQueriesStmt.get(...params) as any)?.count || 0;

      // Average results per query
      const avgResultsStmt = this.db.prepare(`SELECT AVG(results_count) as avg ${baseQuery} AND query != ''`);
      const averageResultsPerQuery = Math.round((avgResultsStmt.get(...params) as any)?.avg || 0);

      // Top queries
      const topQueries = await this.getPopularSearches(locale, version, 10);

      // Searches by locale
      const localeStmt = this.db.prepare(`
        SELECT locale, COUNT(*) as count
        ${baseQuery}
        GROUP BY locale
        ORDER BY count DESC
      `);
      const localeResults = localeStmt.all(...params) as any[];
      const searchesByLocale = localeResults.reduce((acc, row) => {
        acc[row.locale] = row.count;
        return acc;
      }, {} as Record<string, number>);

      // Searches by version
      const versionStmt = this.db.prepare(`
        SELECT version, COUNT(*) as count
        ${baseQuery}
        GROUP BY version
        ORDER BY count DESC
      `);
      const versionResults = versionStmt.all(...params) as any[];
      const searchesByVersion = versionResults.reduce((acc, row) => {
        acc[row.version] = row.count;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalSearches,
        uniqueQueries,
        averageResultsPerQuery,
        topQueries,
        searchesByLocale,
        searchesByVersion
      };
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      return {
        totalSearches: 0,
        uniqueQueries: 0,
        averageResultsPerQuery: 0,
        topQueries: [],
        searchesByLocale: {},
        searchesByVersion: {}
      };
    }
  }

  /**
   * Get search metadata for monitoring
   */
  async getSearchMetadata(locale?: string, version?: string): Promise<SearchMetadata[]> {
    try {
      let query = `
        SELECT index_version, locale, version, page_count, index_size_bytes, indexed_at
        FROM search_metadata
      `;
      
      const params: any[] = [];
      const conditions: string[] = [];
      
      if (locale) {
        conditions.push('locale = ?');
        params.push(locale);
      }
      
      if (version) {
        conditions.push('version = ?');
        params.push(version);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY indexed_at DESC';

      const stmt = this.db.prepare(query);
      const results = stmt.all(...params) as any[];

      return results.map(row => ({
        indexVersion: row.index_version,
        locale: row.locale,
        version: row.version,
        pageCount: row.page_count,
        indexSizeBytes: row.index_size_bytes,
        indexedAt: row.indexed_at
      }));
    } catch (error) {
      console.error('Failed to get search metadata:', error);
      return [];
    }
  }

  /**
   * Clean up old search queries (for privacy and performance)
   */
  async cleanupOldSearches(daysToKeep: number = 90): Promise<number> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);
      const dateThresholdISO = dateThreshold.toISOString();

      const stmt = this.db.prepare(`
        DELETE FROM search_queries
        WHERE searched_at < ?
      `);

      const result = stmt.run(dateThresholdISO);
      return result.changes;
    } catch (error) {
      console.error('Failed to cleanup old searches:', error);
      return 0;
    }
  }

  /**
   * Get search trends over time
   */
  async getSearchTrends(
    locale?: string,
    version?: string,
    days: number = 30
  ): Promise<Array<{ date: string; count: number }>> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const dateThresholdISO = dateThreshold.toISOString();

      let query = `
        SELECT 
          DATE(searched_at) as date,
          COUNT(*) as count
        FROM search_queries
        WHERE searched_at >= ?
      `;
      
      const params: any[] = [dateThresholdISO];
      
      if (locale) {
        query += ' AND locale = ?';
        params.push(locale);
      }
      
      if (version) {
        query += ' AND version = ?';
        params.push(version);
      }
      
      query += `
        GROUP BY DATE(searched_at)
        ORDER BY date ASC
      `;

      const stmt = this.db.prepare(query);
      const results = stmt.all(...params) as any[];

      return results.map(row => ({
        date: row.date,
        count: row.count
      }));
    } catch (error) {
      console.error('Failed to get search trends:', error);
      return [];
    }
  }
}

// Export singleton instance
export const searchAnalytics = new SearchAnalyticsService();