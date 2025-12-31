import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  // Check extractor patterns
  const patterns = await sql`
    SELECT name, attribute_pattern, entity_type, patterns, is_active
    FROM truth_ledger_claude.extractor_patterns
    ORDER BY priority DESC
  `;
  console.log('=== Extractor Patterns in Database ===');
  for (const p of patterns) {
    console.log(`\n${p.name} (${p.attribute_pattern}):`);
    console.log('  Entity type:', p.entity_type || 'any');
    console.log('  Active:', p.is_active);
    console.log('  Patterns:', JSON.stringify(p.patterns, null, 2));
  }

  await sql.end();
}

check().catch(console.error);
