/**
 * List all sources in the database
 */
import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

async function main() {
  const sql = getConnection();

  // First check the schema
  const columns = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'truth_ledger' AND table_name = 'sources'
    ORDER BY ordinal_position
  `;
  console.log('Sources table columns:', columns.map(c => c.column_name).join(', '));
  console.log('');

  const sources = await sql`
    SELECT *
    FROM truth_ledger_claude.sources
    ORDER BY source_type
  `;

  console.log('Sources in database:\n');
  let currentType = '';
  for (const row of sources) {
    if (row.source_type !== currentType) {
      currentType = row.source_type;
      console.log(`\n${currentType.toUpperCase()}:`);
    }
    const name = row.display_name || row.name || row.id;
    console.log(`  ${row.id}: ${name}`);
    console.log(`    URL: ${row.url || row.base_url || 'N/A'}`);
    console.log(`    Trust: ${row.trust_min || '?'}-${row.trust_max || '?'}`);
  }

  console.log(`\nTotal: ${sources.length} sources`);
  await closeConnection();
}

main().catch(console.error);
