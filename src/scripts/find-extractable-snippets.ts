/**
 * Find Extractable Snippets
 * Find snippets that contain both entity names and numeric values
 */

import 'dotenv/config';
import { EntityMatcher, DEFAULT_EXTRACTORS } from '../services/extractor.js';
import { getConnection, closeConnection } from '../db/connection.js';
import type { Snippet, Attribute } from '../types/index.js';

async function findExtractableSnippets() {
  const sql = getConnection();

  console.log('Finding extractable snippets...\n');

  // Load entities and attributes
  const entityMatcher = new EntityMatcher();
  await entityMatcher.loadEntities();

  const attributes = await sql`
    SELECT
      id,
      canonical_name as "canonicalName"
    FROM truth_ledger_claude.attributes
  `;
  const attributeMap = new Map<string, { canonicalName: string; id: string }>();
  for (const attr of attributes as unknown as { canonicalName: string; id: string }[]) {
    attributeMap.set(attr.canonicalName, attr);
  }

  // Get unprocessed snippets in batches
  let found = 0;
  let processed = 0;
  const batchSize = 500;
  let offset = 0;

  while (processed < 5000) {
    const snippets = await sql`
      SELECT s.id, s.text, s.snippet_type as "snippetType"
      FROM truth_ledger_claude.snippets s
      LEFT JOIN truth_ledger_claude.evidence e ON e.snippet_id = s.id
      WHERE e.id IS NULL
      ORDER BY s.created_at
      LIMIT ${batchSize} OFFSET ${offset}
    `;

    if (snippets.length === 0) break;

    for (const snippetRow of snippets as unknown as { id: string; text: string; snippetType: string }[]) {
      const snippet = {
        id: snippetRow.id,
        text: snippetRow.text,
        snippetType: snippetRow.snippetType,
      } as Snippet;

      // Check for entity matches
      const matchedEntities = entityMatcher.findEntities(snippet);
      if (matchedEntities.length === 0) continue;

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
            found++;
            console.log(`\n✅ Found extractable claim #${found}:`);
            console.log(`   Entity: ${entity.canonicalName} (${entity.entityType})`);
            console.log(`   Attribute: ${extractor.attributePattern}`);
            console.log(`   Value: ${claims[0].value} ${claims[0].unit}`);
            console.log(`   Snippet: ${snippet.text?.substring(0, 150)}...`);

            if (found >= 10) {
              console.log(`\nFound ${found} extractable snippets (stopping early for demo)`);
              await closeConnection();
              return;
            }
          }
        }
      }
    }

    offset += batchSize;
    processed += snippets.length;
    process.stdout.write(`\rProcessed ${processed} snippets, found ${found} extractable...`);
  }

  console.log(`\n\nTotal: Found ${found} extractable snippets out of ${processed} processed`);
  await closeConnection();
}

findExtractableSnippets().catch(console.error);
