/**
 * Check claims and conflict groups relationship
 */
import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

async function main() {
  const sql = getConnection();

  // Check claims table structure
  const claimCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'truth_ledger' AND table_name = 'claims'
    ORDER BY ordinal_position
  `;
  console.log('Claims columns:', claimCols.map(c => c.column_name).join(', '));

  // Check conflict_groups table structure
  const cgCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'truth_ledger' AND table_name = 'conflict_groups'
    ORDER BY ordinal_position
  `;
  console.log('Conflict_groups columns:', cgCols.map(c => c.column_name).join(', '));

  // Check truth_metrics table structure
  const tmCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'truth_ledger' AND table_name = 'truth_metrics'
    ORDER BY ordinal_position
  `;
  console.log('Truth_metrics columns:', tmCols.map(c => c.column_name).join(', '));

  // Sample conflict groups
  const cgs = await sql`
    SELECT * FROM truth_ledger_claude.conflict_groups LIMIT 3
  `;
  console.log('\nSample conflict groups:');
  for (const cg of cgs) {
    console.log('  ', cg);
  }

  // Sample claims with their conflict groups
  const claimsWithCg = await sql`
    SELECT c.id, c.claim_key_hash, c.entity_id, c.attribute_id,
           cg.id as conflict_group_id
    FROM truth_ledger_claude.claims c
    LEFT JOIN truth_ledger_claude.conflict_groups cg ON c.claim_key_hash = cg.claim_key_hash
    LIMIT 5
  `;
  console.log('\nClaims with conflict groups:');
  for (const c of claimsWithCg) {
    console.log(`  Claim ${c.id}: CG = ${c.conflict_group_id || 'NULL'}`);
  }

  // Count claims without conflict groups
  const missing = await sql`
    SELECT COUNT(*)::int as count
    FROM truth_ledger_claude.claims c
    LEFT JOIN truth_ledger_claude.conflict_groups cg ON c.claim_key_hash = cg.claim_key_hash
    WHERE cg.id IS NULL
  `;
  console.log(`\nClaims without conflict groups: ${missing[0].count}`);

  await closeConnection();
}

main().catch(console.error);
