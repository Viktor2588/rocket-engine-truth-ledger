/**
 * Investigate why only one source has claims
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function investigate() {
  // Check claims by source
  const claimsBySource = await sql`
    SELECT s.name, COUNT(c.id) as claim_count
    FROM truth_ledger_claude.sources s
    LEFT JOIN truth_ledger_claude.snippets sn ON sn.source_id = s.id
    LEFT JOIN truth_ledger_claude.claims c ON c.snippet_id = sn.id
    GROUP BY s.id, s.name
    ORDER BY claim_count DESC
    LIMIT 20
  `;
  console.log("=== Claims by Source ===");
  console.table(claimsBySource);

  // Check what entities claims are linked to
  const claimsByEntity = await sql`
    SELECT e.canonical_name, e.entity_type, COUNT(c.id) as claim_count
    FROM truth_ledger_claude.claims c
    JOIN truth_ledger_claude.entities e ON c.entity_id = e.id
    GROUP BY e.id, e.canonical_name, e.entity_type
    ORDER BY claim_count DESC
    LIMIT 15
  `;
  console.log("\n=== Claims by Entity ===");
  console.table(claimsByEntity);

  // Check if snippets from other sources mention known entities
  const entityMentions = await sql`
    SELECT s.name as source_name, e.canonical_name as entity, COUNT(*) as mention_count
    FROM truth_ledger_claude.snippets sn
    JOIN truth_ledger_claude.sources s ON sn.source_id = s.id
    CROSS JOIN truth_ledger_claude.entities e
    WHERE sn.content ILIKE '%' || e.canonical_name || '%'
    AND s.name NOT LIKE 'Wikipedia%'
    GROUP BY s.name, e.canonical_name
    ORDER BY mention_count DESC
    LIMIT 20
  `;
  console.log("\n=== Entity Mentions in Non-Wikipedia Sources ===");
  console.table(entityMentions);

  // Check snippet types distribution
  const snippetTypes = await sql`
    SELECT s.name, sn.snippet_type, COUNT(*) as cnt
    FROM truth_ledger_claude.snippets sn
    JOIN truth_ledger_claude.sources s ON sn.source_id = s.id
    GROUP BY s.name, sn.snippet_type
    ORDER BY s.name, cnt DESC
    LIMIT 30
  `;
  console.log("\n=== Snippet Types by Source ===");
  console.table(snippetTypes);

  // Sample some snippets that mention engines
  const engineSnippets = await sql`
    SELECT s.name, LEFT(sn.content, 300) as content_preview
    FROM truth_ledger_claude.snippets sn
    JOIN truth_ledger_claude.sources s ON sn.source_id = s.id
    WHERE (
      sn.content ILIKE '%Raptor%'
      OR sn.content ILIKE '%Merlin%'
      OR sn.content ILIKE '%BE-4%'
      OR sn.content ILIKE '%thrust%'
    )
    AND s.name NOT LIKE 'Wikipedia%'
    ORDER BY RANDOM()
    LIMIT 8
  `;
  console.log("\n=== Sample Engine-Related Snippets from Non-Wikipedia Sources ===");
  for (const s of engineSnippets) {
    console.log(`[${s.name}]:`);
    console.log(s.content_preview);
    console.log("---");
  }

  // Check if there are any errors in sync_log related to extraction
  const syncErrors = await sql`
    SELECT sync_type, state, error_message, started_at
    FROM truth_ledger_claude.sync_log
    WHERE sync_type = 'truth_extract'
    ORDER BY started_at DESC
    LIMIT 10
  `;
  console.log("\n=== Recent Extraction Runs ===");
  console.table(syncErrors);

  await sql.end();
}

investigate().catch(console.error);
