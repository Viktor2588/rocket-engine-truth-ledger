/**
 * Database Configuration
 * PostgreSQL connection settings
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  poolSize: number;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvIntOrDefault(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolOrDefault(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const databaseConfig: DatabaseConfig = {
  host: getEnvOrDefault('DB_HOST', 'localhost'),
  port: getEnvIntOrDefault('DB_PORT', 5432),
  database: getEnvOrDefault('DB_NAME', 'rocket_engine_truth_ledger'),
  user: getEnvOrDefault('DB_USER', 'postgres'),
  password: getEnvOrDefault('DB_PASSWORD', ''),
  ssl: getEnvBoolOrDefault('DB_SSL', false),
  poolSize: getEnvIntOrDefault('DB_POOL_SIZE', 10),
};

export function getDatabaseUrl(): string {
  // Use DATABASE_URL if provided (e.g., for Neon, Supabase, etc.)
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const { host, port, database, user, password, ssl } = databaseConfig;
  const sslParam = ssl ? '?sslmode=require' : '';
  return `postgres://${user}:${password}@${host}:${port}/${database}${sslParam}`;
}
