/**
 * Check claims distribution across sources after fix
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  // Total claims now
  const total = await sql`SELECT COUNT(*) as cnt FROM truth_ledger_claude.claims`;
  console.log('\n=== Total Claims ===');
  console.log('Total:', total[0].cnt);

  // Claims by source (through document join)
  const claimsBySource = await sql`
    SELECT
      s.name as source_name,
      s.source_type,
      COUNT(c.id) as claim_count
    FROM truth_ledger_claude.claims c
    JOIN truth_ledger_claude.evidence e ON e.claim_id = c.id
    JOIN truth_ledger_claude.snippets sn ON e.snippet_id = sn.id
    JOIN truth_ledger_claude.documents d ON sn.document_id = d.id
    JOIN truth_ledger_claude.sources s ON d.source_id = s.id
    GROUP BY s.id, s.name, s.source_type
    ORDER BY claim_count DESC
  `;
  console.log('\n=== Claims by Source ===');
  console.table(claimsBySource);

  // Claims by entity type
  const claimsByType = await sql`
    SELECT
      e.entity_type,
      COUNT(c.id) as claim_count
    FROM truth_ledger_claude.claims c
    JOIN truth_ledger_claude.entities e ON c.entity_id = e.id
    GROUP BY e.entity_type
    ORDER BY claim_count DESC
  `;
  console.log('\n=== Claims by Entity Type ===');
  console.table(claimsByType);

  // Sample recent claims from different sources
  const recentClaims = await sql`
    SELECT
      s.name as source_name,
      ent.canonical_name as entity,
      c.attribute_key,
      c.value,
      c.created_at
    FROM truth_ledger_claude.claims c
    JOIN truth_ledger_claude.evidence e ON e.claim_id = c.id
    JOIN truth_ledger_claude.snippets sn ON e.snippet_id = sn.id
    JOIN truth_ledger_claude.documents d ON sn.document_id = d.id
    JOIN truth_ledger_claude.sources s ON d.source_id = s.id
    JOIN truth_ledger_claude.entities ent ON c.entity_id = ent.id
    ORDER BY c.created_at DESC
    LIMIT 20
  `;
  console.log('\n=== Recent Claims (latest 20) ===');
  console.table(recentClaims);

  await sql.end();
}

check().catch(console.error);
