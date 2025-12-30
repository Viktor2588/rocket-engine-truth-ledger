/**
 * Database Status Check Script
 */

import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  // Check migrations
  console.log('=== Migrations Table ===');
  try {
    const migrations = await sql`SELECT * FROM migrations ORDER BY id`;
    console.log(migrations);
  } catch (e) {
    console.log('No migrations table');
  }

  // Check schema tables
  console.log('\n=== Truth Ledger Schema Tables ===');
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'truth_ledger_claude'
    ORDER BY table_name
  `;
  console.log(tables.map(t => t.table_name));

  // Check data counts
  console.log('\n=== Data Counts ===');
  const counts = await sql`
    SELECT 'sources' as tbl, COUNT(*)::int as cnt FROM truth_ledger_claude.sources
    UNION ALL SELECT 'documents', COUNT(*)::int FROM truth_ledger_claude.documents
    UNION ALL SELECT 'snippets', COUNT(*)::int FROM truth_ledger_claude.snippets
    UNION ALL SELECT 'entities', COUNT(*)::int FROM truth_ledger_claude.entities
    UNION ALL SELECT 'claims', COUNT(*)::int FROM truth_ledger_claude.claims
    UNION ALL SELECT 'evidence', COUNT(*)::int FROM truth_ledger_claude.evidence
    UNION ALL SELECT 'conflict_groups', COUNT(*)::int FROM truth_ledger_claude.conflict_groups
    UNION ALL SELECT 'truth_metrics', COUNT(*)::int FROM truth_ledger_claude.truth_metrics
    ORDER BY tbl
  `;
  for (const row of counts) {
    console.log(`  ${row.tbl}: ${row.cnt}`);
  }

  // Check sync_status
  console.log('\n=== Recent Sync Status ===');
  const syncs = await sql`
    SELECT sync_type, state, started_at, completed_at, records_synced, error_message
    FROM truth_ledger_claude.sync_status
    ORDER BY id DESC
    LIMIT 10
  `;
  for (const s of syncs) {
    console.log(`  ${s.sync_type}: ${s.state} (${s.records_synced} records)`);
  }

  await sql.end();
}
check().catch(console.error);
