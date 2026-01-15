/**
 * Check claims table structure
 */
import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

async function main() {
  const sql = getConnection();

  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'truth_ledger' AND table_name = 'claims'
    ORDER BY ordinal_position
  `;
  console.log('Claims table columns:', columns.map(c => c.column_name).join(', '));

  const claims = await sql`
    SELECT * FROM truth_ledger_claude.claims LIMIT 3
  `;
  console.log('\nSample claims:');
  for (const claim of claims) {
    console.log('  ', claim);
  }

  await closeConnection();
}

main().catch(console.error);
