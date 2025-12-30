/**
 * Run Extraction Pipeline
 * Extracts claims from ingested documents
 */

import 'dotenv/config';
import { Extractor } from '../services/extractor.js';
import { getConnection, closeConnection } from '../db/connection.js';

async function runExtraction() {
  const sql = getConnection();

  console.log('Running extraction pipeline...\n');

  // Show current state
  const snippetCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.snippets
  `;
  const claimCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.claims
  `;

  console.log('Before extraction:');
  console.log(`  Snippets: ${snippetCount[0].count}`);
  console.log(`  Claims: ${claimCount[0].count}`);

  // Run extraction
  const extractor = new Extractor();
  console.log('\n🔍 Extracting claims from snippets...');

  const result = await extractor.extract({
    entityTypes: ['engine', 'launch_vehicle'],
    limit: 5000, // Process all snippets
  });

  console.log(`\n✅ Extraction complete:`);
  console.log(`  Claims created: ${result.claimsCreated}`);
  console.log(`  Evidence created: ${result.evidenceCreated}`);
  console.log(`  Conflict groups: ${result.conflictGroupsCreated}`);

  if (result.errors.length > 0) {
    console.log(`  Errors: ${result.errors.length}`);
    for (const error of result.errors.slice(0, 5)) {
      console.log(`    - ${typeof error === 'object' ? JSON.stringify(error) : error}`);
    }
    if (result.errors.length > 5) {
      console.log(`    ... and ${result.errors.length - 5} more`);
    }
  }

  // Show after state
  const newClaimCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.claims
  `;
  const evidenceCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.evidence
  `;
  const conflictCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.conflict_groups
  `;

  console.log('\n📊 Database counts after extraction:');
  console.log(`  Claims: ${newClaimCount[0].count}`);
  console.log(`  Evidence: ${evidenceCount[0].count}`);
  console.log(`  Conflict groups: ${conflictCount[0].count}`);

  // Show sample claims by entity type
  const sampleClaims = await sql`
    SELECT
      e.canonical_name as entity,
      a.display_name as attribute,
      c.value_json,
      c.unit
    FROM truth_ledger_claude.claims c
    JOIN truth_ledger_claude.entities e ON c.entity_id = e.id
    JOIN truth_ledger_claude.attributes a ON c.attribute_id = a.id
    ORDER BY e.entity_type, e.canonical_name
    LIMIT 20
  `;

  if (sampleClaims.length > 0) {
    console.log('\n📋 Sample claims:');
    for (const claim of sampleClaims) {
      const valueJson = claim.value_json as { type: string; value: number } | null;
      const value = valueJson?.value !== undefined
        ? `${valueJson.value}${claim.unit ? ' ' + claim.unit : ''}`
        : '(no value)';
      console.log(`  ${claim.entity} - ${claim.attribute}: ${value}`);
    }
  }

  await closeConnection();
}

runExtraction().catch(console.error);
