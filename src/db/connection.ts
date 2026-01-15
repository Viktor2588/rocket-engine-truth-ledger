/**
 * Database Connection Module
 * Provides PostgreSQL connection pool using 'postgres' driver
 */

import postgres from 'postgres';
import { databaseConfig, getDatabaseUrl } from '../config/database.js';

// Singleton connection instance
let sql: postgres.Sql | null = null;

/**
 * Get or create the database connection
 */
export function getConnection(): postgres.Sql {
  if (!sql) {
    sql = postgres(getDatabaseUrl(), {
      max: databaseConfig.poolSize,
      idle_timeout: 30,
      connect_timeout: 10,
      transform: {
        undefined: null,
      },
    });
  }
  return sql;
}

/**
 * Close the database connection
 */
export async function closeConnection(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

/**
 * Execute a raw SQL query
 */
export async function query<T extends object = Record<string, unknown>>(
  queryText: string,
  params: (string | number | boolean | null | Date)[] = []
): Promise<T[]> {
  const conn = getConnection();
  return conn.unsafe<T[]>(queryText, params as postgres.ParameterOrJSON<string>[]);
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  fn: (sql: postgres.Sql) => Promise<T>
): Promise<T> {
  const conn = getConnection();
  return conn.begin(fn) as Promise<T>;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const conn = getConnection();
    const result = await conn`SELECT 1 as ok`;
    return result.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export { sql, postgres };
