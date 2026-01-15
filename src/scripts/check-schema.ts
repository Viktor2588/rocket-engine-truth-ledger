/**
 * Check entities table schema
 */
import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

async function main() {
  const sql = getConnection();

  const result = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'truth_ledger_claude' AND table_name = 'entities'
    ORDER BY ordinal_position
  `;

  console.log('Entities table schema:');
  for (const row of result) {
    console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
  }

  const indexes = await sql`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'truth_ledger_claude' AND tablename = 'entities'
  `;

  console.log('\nIndexes:');
  for (const row of indexes) {
    console.log(`  ${row.indexname}: ${row.indexdef}`);
  }

  const constraints = await sql`
    SELECT conname, contype
    FROM pg_constraint
    WHERE conrelid = 'truth_ledger_claude.entities'::regclass
  `;

  console.log('\nConstraints:');
  for (const row of constraints) {
    console.log(`  ${row.conname}: ${row.contype}`);
  }

  await closeConnection();
}

main().catch(console.error);
