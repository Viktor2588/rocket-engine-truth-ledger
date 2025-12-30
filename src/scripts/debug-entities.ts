/**
 * Debug Entity Matching
 */

import 'dotenv/config';
import { EntityMatcher } from '../services/extractor.js';
import { getConnection, closeConnection } from '../db/connection.js';

async function debugEntities() {
  const sql = getConnection();

  console.log('Debugging entity matching...\n');

  // Load entities
  const entityMatcher = new EntityMatcher();
  await entityMatcher.loadEntities();

  // Check loaded entities
  const entities = await sql`
    SELECT canonical_name, aliases FROM truth_ledger_claude.entities
  `;
  console.log('Loaded entities:');
  for (const e of entities) {
    console.log(`  ${e.canonical_name}: ${JSON.stringify(e.aliases)}`);
  }

  // Test some sample text patterns
  const testTexts = [
    'The Falcon 9 rocket has nine Merlin 1D engines',
    'Merlin-1D engine produces 845 kN thrust',
    'SpaceX Raptor 2 engine',
    'The RS-25 engine on SLS',
    'RD-180 produces 4152 kN',
    'Electron rocket uses Rutherford engines',
    'Falcon Heavy uses 27 Merlin engines',
    'New Glenn will use BE-4 engines',
  ];

  console.log('\nTesting entity matching:');
  for (const text of testTexts) {
    const matches = entityMatcher.findEntities({ id: 'test', text } as any);
    console.log(`  "${text}"`);
    console.log(`    → Matched: ${matches.map(m => m.canonicalName).join(', ') || 'none'}`);
  }

  // Find snippets that contain any entity name
  console.log('\nSearching for snippets containing entity names...');
  const entityNames = entities.flatMap(e => [
    e.canonical_name,
    ...(e.aliases || [])
  ]).join('|');

  const matchingSnippets = await sql`
    SELECT id, text
    FROM truth_ledger_claude.snippets
    WHERE text ~* ${entityNames}
    LIMIT 5
  `;

  console.log(`Found ${matchingSnippets.length} snippets containing entity names:`);
  for (const s of matchingSnippets) {
    console.log(`\n  Snippet: ${s.text?.substring(0, 200)}...`);
    const matches = entityMatcher.findEntities({ id: s.id, text: s.text } as any);
    console.log(`  Matched: ${matches.map(m => m.canonicalName).join(', ') || 'none'}`);
  }

  await closeConnection();
}

debugEntities().catch(console.error);
