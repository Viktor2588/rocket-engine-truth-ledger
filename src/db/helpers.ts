/**
 * Database Helper Utilities
 * Provides typed helpers for common database operations
 */

import postgres from 'postgres';
import { getConnection } from './connection.js';

// Type alias for JSON values that postgres accepts
type JsonValue = postgres.JSONValue;

/**
 * Helper to properly serialize JSONB values for postgres template strings
 * Casts the value to the correct type for postgres library
 */
export function toJson(value: unknown): JsonValue {
  return value as JsonValue;
}

/**
 * Get a SQL connection with JSON helper attached
 */
export function getSqlWithHelpers() {
  const sql = getConnection();
  return {
    sql,
    json: (value: unknown) => sql.json(value as JsonValue),
  };
}

/**
 * Execute a simple select query
 */
export async function selectAll<T>(table: string, schema = 'truth_ledger'): Promise<T[]> {
  const sql = getConnection();
  return sql.unsafe<T[]>(`SELECT * FROM ${schema}.${table}`);
}

/**
 * Execute a select query with WHERE condition
 */
export async function selectWhere<T>(
  table: string,
  conditions: Record<string, unknown>,
  schema = 'truth_ledger'
): Promise<T[]> {
  const sql = getConnection();
  const keys = Object.keys(conditions);
  const whereClause = keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
  const values = Object.values(conditions) as (string | number | boolean | null)[];
  return sql.unsafe<T[]>(`SELECT * FROM ${schema}.${table} WHERE ${whereClause}`, values);
}
