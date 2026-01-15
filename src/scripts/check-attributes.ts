/**
 * Check attributes table structure
 */
import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

async function main() {
  const sql = getConnection();

  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'truth_ledger' AND table_name = 'attributes'
    ORDER BY ordinal_position
  `;
  console.log('Attributes table columns:', columns.map(c => c.column_name).join(', '));

  const attrs = await sql`
    SELECT * FROM truth_ledger_claude.attributes LIMIT 5
  `;
  console.log('\nSample attributes:');
  for (const attr of attrs) {
    console.log('  ', attr);
  }

  await closeConnection();
}

main().catch(console.error);
