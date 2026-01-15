/**
 * Populate Field Links
 * Creates field_links entries to connect entities to their claims
 */

import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

async function populateFieldLinks() {
  const sql = getConnection();

  console.log('Populating field_links table...\n');

  // Get current count
  const beforeCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.field_links
  `;
  console.log(`Before: ${beforeCount[0].count} field links`);

  // Get all conflict groups with their entity and attribute info
  const conflictGroups = await sql`
    SELECT
      cg.id as conflict_group_id,
      cg.claim_key_hash,
      cg.entity_id,
      a.canonical_name as attribute_name
    FROM truth_ledger_claude.conflict_groups cg
    JOIN truth_ledger_claude.attributes a ON a.id = cg.attribute_id
    ORDER BY cg.entity_id, a.canonical_name
  `;

  console.log(`Found ${conflictGroups.length} conflict groups to process`);

  let created = 0;
  let skipped = 0;

  for (const cg of conflictGroups) {
    const fieldName = cg.attribute_name;

    // Check if link already exists
    const existing = await sql`
      SELECT id FROM truth_ledger_claude.field_links
      WHERE entity_id = ${cg.entity_id}
        AND field_name = ${fieldName}
    `;

    if (existing.length > 0) {
      // Update existing link
      await sql`
        UPDATE truth_ledger_claude.field_links
        SET claim_key_hash = ${cg.claim_key_hash},
            updated_at = NOW()
        WHERE entity_id = ${cg.entity_id}
          AND field_name = ${fieldName}
      `;
      skipped++;
    } else {
      // Create new link
      await sql`
        INSERT INTO truth_ledger_claude.field_links (
          entity_id,
          field_name,
          claim_key_hash
        ) VALUES (
          ${cg.entity_id},
          ${fieldName},
          ${cg.claim_key_hash}
        )
      `;
      created++;
    }
  }

  console.log(`\n✅ Field links populated:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${skipped}`);

  // Show after count
  const afterCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.field_links
  `;
  console.log(`\nAfter: ${afterCount[0].count} field links`);

  // Show sample field links
  const sampleLinks = await sql`
    SELECT
      fl.field_name,
      e.canonical_name as entity_name,
      fl.claim_key_hash
    FROM truth_ledger_claude.field_links fl
    JOIN truth_ledger_claude.entities e ON e.id = fl.entity_id
    ORDER BY e.canonical_name, fl.field_name
    LIMIT 15
  `;

  if (sampleLinks.length > 0) {
    console.log('\n📋 Sample field links:');
    for (const link of sampleLinks) {
      console.log(`  ${link.entity_name}.${link.field_name} → ${link.claim_key_hash.substring(0, 16)}...`);
    }
  }

  await closeConnection();
}

populateFieldLinks().catch(console.error);
