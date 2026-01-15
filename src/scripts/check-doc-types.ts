/**
 * Check valid doc types in database
 */
import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

async function main() {
  const sql = getConnection();

  const result = await sql`
    SELECT pg_get_constraintdef(oid) as constraint_def
    FROM pg_constraint
    WHERE conname = 'chk_doc_type'
  `;

  console.log('Document type constraint:', result[0]?.constraint_def || 'Not found');

  // Also check what's in the documents table
  const docs = await sql`
    SELECT doc_type, COUNT(*)::int as count
    FROM truth_ledger_claude.documents
    GROUP BY doc_type
  `;

  console.log('\nExisting document types:');
  for (const row of docs) {
    console.log(`  ${row.doc_type}: ${row.count}`);
  }

  await closeConnection();
}

main().catch(console.error);
