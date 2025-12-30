import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function main() {
  // Get all current entities
  const engines = await sql`
    SELECT canonical_name, aliases FROM truth_ledger_claude.entities WHERE entity_type = 'engine'
  `;
  const vehicles = await sql`
    SELECT canonical_name, aliases FROM truth_ledger_claude.entities WHERE entity_type = 'launch_vehicle'
  `;

  console.log("Engines:", engines.length);
  console.log("Launch Vehicles:", vehicles.length);

  // Count snippets by source
  const bySrc = await sql`
    SELECT d.title, COUNT(*)::int as snippets
    FROM truth_ledger_claude.snippets s
    JOIN truth_ledger_claude.documents d ON d.id = s.document_id
    GROUP BY d.title
    ORDER BY snippets DESC
    LIMIT 15
  `;
  console.log("\n=== Snippets by Document ===");
  bySrc.forEach(s => {
    const title = s.title ? s.title.substring(0, 60) : 'untitled';
    console.log(`- ${title}: ${s.snippets}`);
  });

  // Check claim success by entity
  const claimSuccess = await sql`
    SELECT
      e.canonical_name,
      e.entity_type,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.claims WHERE entity_id = e.id) as claims
    FROM truth_ledger_claude.entities e
    ORDER BY claims DESC
    LIMIT 20
  `;
  console.log("\n=== Top Entities by Claims ===");
  claimSuccess.forEach(e => console.log(`- ${e.canonical_name} (${e.entity_type}): ${e.claims}`));

  // List all engines
  console.log("\n=== All Engines ===");
  engines.forEach(e => console.log(`- ${e.canonical_name}`));

  // List all vehicles
  console.log("\n=== All Launch Vehicles ===");
  vehicles.forEach(e => console.log(`- ${e.canonical_name}`));

  await sql.end();
}

main();
