/**
 * Check engines in database
 */
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || '');

async function check() {
  // Count entities by type
  const counts = await sql`
    SELECT entity_type, COUNT(*)::int as count
    FROM truth_ledger_claude.entities
    GROUP BY entity_type
    ORDER BY count DESC
  `;
  console.log('Entity counts by type:');
  console.table(counts);

  // Get engines with their aliases
  const engines = await sql`
    SELECT canonical_name, aliases, array_length(aliases, 1) as alias_count
    FROM truth_ledger_claude.entities
    WHERE entity_type = 'engine'
    ORDER BY canonical_name
  `;

  console.log('\nEngines in database:');
  let totalVariants = 0;
  for (const e of engines) {
    const aliasCount = e.alias_count || 0;
    totalVariants += 1 + aliasCount; // base name + aliases
    console.log(`  ${e.canonical_name} (${aliasCount} aliases): ${(e.aliases as string[])?.join(', ') || 'none'}`);
  }

  console.log(`\nTotal engine entries: ${engines.length}`);
  console.log(`Total including aliases: ${totalVariants}`);

  await sql.end();
}

check().catch(console.error);
