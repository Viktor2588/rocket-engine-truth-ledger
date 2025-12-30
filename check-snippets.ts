import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

async function check() {
  // Check entity aliases
  const entities = await sql`SELECT id, canonical_name, aliases FROM truth_ledger_claude.entities ORDER BY canonical_name`;
  console.log('Entity aliases:');
  for (const e of entities) {
    console.log(`  ${e.canonical_name}:`, JSON.stringify(e.aliases));
  }
  console.log('');

  // Build alias map like EntityMatcher does
  const entityAliases = new Map<string, {id: string, canonicalName: string}>();
  for (const entity of entities) {
    // Add canonical name
    entityAliases.set(entity.canonical_name.toLowerCase(), { id: entity.id, canonicalName: entity.canonical_name });

    // Add aliases
    if (entity.aliases) {
      for (const alias of entity.aliases) {
        entityAliases.set(alias.toLowerCase(), { id: entity.id, canonicalName: entity.canonical_name });
      }
    }
  }
  console.log('Total alias mappings:', entityAliases.size);
  console.log('Aliases:', [...entityAliases.keys()].join(', '));
  console.log('');

  // Count snippets mentioning known entities
  const withRaptor = await sql`SELECT COUNT(*) as cnt FROM truth_ledger_claude.snippets WHERE LOWER(text) LIKE ${'%raptor%'}`;
  const withMerlin = await sql`SELECT COUNT(*) as cnt FROM truth_ledger_claude.snippets WHERE LOWER(text) LIKE ${'%merlin%'}`;
  const withStarship = await sql`SELECT COUNT(*) as cnt FROM truth_ledger_claude.snippets WHERE LOWER(text) LIKE ${'%starship%'}`;
  const withFalcon = await sql`SELECT COUNT(*) as cnt FROM truth_ledger_claude.snippets WHERE LOWER(text) LIKE ${'%falcon%'}`;

  console.log('Snippets by keyword:');
  console.log('  Raptor:', withRaptor[0].cnt);
  console.log('  Merlin:', withMerlin[0].cnt);
  console.log('  Starship:', withStarship[0].cnt);
  console.log('  Falcon:', withFalcon[0].cnt);

  // Check if any of these have no evidence
  const unprocessedRaptor = await sql`
    SELECT COUNT(*) as cnt
    FROM truth_ledger_claude.snippets s
    LEFT JOIN truth_ledger_claude.evidence e ON e.snippet_id = s.id
    WHERE e.id IS NULL
    AND LOWER(s.text) LIKE ${'%raptor%'}
  `;
  console.log('\nUnprocessed with Raptor:', unprocessedRaptor[0].cnt);

  // Sample one and test entity matching
  const sample = await sql`
    SELECT s.text, src.name as source
    FROM truth_ledger_claude.snippets s
    JOIN truth_ledger_claude.documents d ON d.id = s.document_id
    JOIN truth_ledger_claude.sources src ON src.id = d.source_id
    LEFT JOIN truth_ledger_claude.evidence e ON e.snippet_id = s.id
    WHERE e.id IS NULL AND LOWER(s.text) LIKE ${'%raptor%'}
    LIMIT 3
  `;
  console.log('\nTesting entity matching on sample snippets:');
  for (const s of sample) {
    console.log(`\n[${s.source}]`);
    console.log('Text:', s.text.substring(0, 200));

    // Simulate entity matching
    const textLower = s.text.toLowerCase();
    const foundEntities: string[] = [];
    for (const [alias, entity] of entityAliases) {
      if (textLower.includes(alias)) {
        foundEntities.push(`${entity.canonicalName} (via "${alias}")`);
      }
    }
    console.log('Entities found:', foundEntities.length > 0 ? foundEntities.join(', ') : 'NONE');
  }

  // Test pattern matching
  console.log('\n\n--- Testing Pattern Matching ---');
  const testText = "Raptor will use liquid methane as a fuel, and was stated as having a sea-level thrust of 6,700 kilonewtons (1,500,000 lbf).";
  console.log('Test text:', testText);

  const thrustPatterns = [
    /(?:thrust)[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf|klbf)?/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf|klbf)\s+(?:thrust|of\s+thrust)/i,
    /(?:maximum\s+)?thrust[^:]*:\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf)?/i,
    /(?:total\s+)?thrust\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf)?/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kn|mn)\s*(?:\(|thrust|$)/i,
  ];

  for (let i = 0; i < thrustPatterns.length; i++) {
    const matches = testText.match(new RegExp(thrustPatterns[i], 'gi'));
    console.log(`Pattern ${i+1}:`, matches ? `MATCH: ${JSON.stringify(matches)}` : 'no match');
  }

  // Test with "kilonewtons" pattern
  const kiloPattern = /thrust\s+(?:of\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:kilonewtons?|kn)/i;
  const kiloMatch = testText.match(kiloPattern);
  console.log('kilonewtons pattern:', kiloMatch ? `MATCH: ${JSON.stringify(kiloMatch)}` : 'no match');

  await sql.end();
}

check();
