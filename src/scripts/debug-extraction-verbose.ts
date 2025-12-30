/**
 * Verbose Debug Extraction Pipeline
 */

import 'dotenv/config';
import { Extractor, IspExtractor, ThrustExtractor, MassExtractor, EntityMatcher, DEFAULT_EXTRACTORS } from '../services/extractor.js';
import { getConnection, closeConnection } from '../db/connection.js';
import type { Snippet, Entity, Attribute } from '../types/index.js';

async function debugExtractionVerbose() {
  const sql = getConnection();

  console.log('Verbose extraction debug...\n');

  // Load attributes manually to verify they're correct
  const attributes = await sql`
    SELECT
      id,
      canonical_name as "canonicalName",
      display_name as "displayName",
      value_type as "valueType",
      unit
    FROM truth_ledger_claude.attributes
  `;

  console.log('Loaded attributes:');
  for (const attr of attributes as unknown as { canonicalName: string; displayName: string }[]) {
    console.log(`  ${attr.canonicalName}: ${attr.displayName}`);
  }

  // Check extractor patterns
  console.log('\nExtractor attribute patterns:');
  for (const extractor of DEFAULT_EXTRACTORS) {
    console.log(`  ${extractor.attributePattern}`);
  }

  // Match attributes to extractors
  console.log('\nMatching extractors to attributes:');
  const attributeMap = new Map<string, { canonicalName: string; id: string }>();
  for (const attr of attributes as unknown as { canonicalName: string; id: string }[]) {
    attributeMap.set(attr.canonicalName, attr);
  }

  for (const extractor of DEFAULT_EXTRACTORS) {
    const attr = attributeMap.get(extractor.attributePattern);
    console.log(`  ${extractor.attributePattern}: ${attr ? 'FOUND' : 'NOT FOUND'}`);
  }

  // Load entities
  const entityMatcher = new EntityMatcher();
  await entityMatcher.loadEntities();

  // Get a few snippets that mention entities and have numeric data
  const testSnippets = await sql`
    SELECT id, text, snippet_type as "snippetType"
    FROM truth_ledger_claude.snippets
    WHERE text ~* '(\\d+(?:\\.\\d+)?\\s*(kN|MN|N|kg|tons?|seconds?|s|bar|psi))'
    LIMIT 10
  `;

  console.log(`\nFound ${testSnippets.length} snippets with numeric values`);

  for (const snippetRow of testSnippets as unknown as { id: string; text: string; snippetType: string }[]) {
    const snippet = {
      id: snippetRow.id,
      text: snippetRow.text,
      snippetType: snippetRow.snippetType,
    } as Snippet;

    console.log('\n---');
    console.log(`Snippet: ${snippet.text?.substring(0, 200)}...`);

    // Check entity matching
    const matchedEntities = entityMatcher.findEntities(snippet);
    console.log(`Matched entities: ${matchedEntities.map(e => e.canonicalName).join(', ') || 'none'}`);

    if (matchedEntities.length === 0) {
      continue;
    }

    // Try each extractor
    for (const entity of matchedEntities) {
      for (const extractor of DEFAULT_EXTRACTORS) {
        const attr = attributeMap.get(extractor.attributePattern);
        if (!attr) continue;

        // Check entity type match
        const [tableName] = extractor.attributePattern.split('.');
        if (tableName === 'engines' && entity.entityType !== 'engine') continue;
        if (tableName === 'launch_vehicles' && entity.entityType !== 'launch_vehicle') continue;

        const claims = extractor.extract(snippet, entity, attr as unknown as Attribute);
        if (claims.length > 0) {
          console.log(`  ${entity.canonicalName} - ${extractor.attributePattern}:`);
          for (const claim of claims) {
            console.log(`    Found: ${claim.value} ${claim.unit} (confidence: ${claim.confidence})`);
          }
        }
      }
    }
  }

  await closeConnection();
}

debugExtractionVerbose().catch(console.error);
