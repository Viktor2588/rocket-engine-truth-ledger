/**
 * Ingest Real Aerospace Documents
 * Fetches Wikipedia articles about rocket engines for the vertical slice
 */

import 'dotenv/config';
import { Ingestor } from '../services/ingestor.js';
import { getConnection, closeConnection } from '../db/connection.js';

// Wikipedia URLs for rocket engine articles
const WIKIPEDIA_ENGINE_URLS = [
  'https://en.wikipedia.org/wiki/SpaceX_Merlin',
  'https://en.wikipedia.org/wiki/SpaceX_Raptor',
  'https://en.wikipedia.org/wiki/RS-25',
  'https://en.wikipedia.org/wiki/RD-180',
  'https://en.wikipedia.org/wiki/BE-4',
  'https://en.wikipedia.org/wiki/Rutherford_(rocket_engine)',
  'https://en.wikipedia.org/wiki/RL10',
];

// Wikipedia URLs for launch vehicle articles
const WIKIPEDIA_LV_URLS = [
  'https://en.wikipedia.org/wiki/Falcon_9',
  'https://en.wikipedia.org/wiki/Falcon_Heavy',
  'https://en.wikipedia.org/wiki/SpaceX_Starship',
  'https://en.wikipedia.org/wiki/Atlas_V',
  'https://en.wikipedia.org/wiki/Vulcan_Centaur',
  'https://en.wikipedia.org/wiki/Electron_(rocket)',
  'https://en.wikipedia.org/wiki/New_Glenn',
  'https://en.wikipedia.org/wiki/Space_Launch_System',
];

async function ingestDocuments() {
  const sql = getConnection();

  console.log('Ingesting aerospace documents...\n');

  // Find Wikipedia source
  const sources = await sql`
    SELECT id, name FROM truth_ledger_claude.sources
    WHERE name LIKE 'Wikipedia%'
    ORDER BY name
    LIMIT 1
  `;

  if (sources.length === 0) {
    console.error('Wikipedia source not found in database!');
    await closeConnection();
    return;
  }

  const wikiSource = sources[0];
  console.log(`Using source: ${wikiSource.name} (${wikiSource.id})\n`);

  const ingestor = new Ingestor();

  // Ingest engine articles
  console.log('📚 Ingesting rocket engine articles...');
  const engineResult = await ingestor.ingest({
    sourceId: wikiSource.id,
    urls: WIKIPEDIA_ENGINE_URLS,
    docType: 'wiki',
    fetchTimeout: 30000,
  });

  console.log(`  Documents created: ${engineResult.documentsCreated}`);
  console.log(`  Documents updated: ${engineResult.documentsUpdated}`);
  console.log(`  Snippets created: ${engineResult.snippetsCreated}`);
  if (engineResult.errors.length > 0) {
    console.log(`  Errors: ${engineResult.errors.length}`);
    for (const error of engineResult.errors) {
      console.log(`    - ${typeof error === 'object' ? JSON.stringify(error) : error}`);
    }
  }

  // Ingest launch vehicle articles
  console.log('\n🚀 Ingesting launch vehicle articles...');
  const lvResult = await ingestor.ingest({
    sourceId: wikiSource.id,
    urls: WIKIPEDIA_LV_URLS,
    docType: 'wiki',
    fetchTimeout: 30000,
  });

  console.log(`  Documents created: ${lvResult.documentsCreated}`);
  console.log(`  Documents updated: ${lvResult.documentsUpdated}`);
  console.log(`  Snippets created: ${lvResult.snippetsCreated}`);
  if (lvResult.errors.length > 0) {
    console.log(`  Errors: ${lvResult.errors.length}`);
    for (const error of lvResult.errors) {
      console.log(`    - ${typeof error === 'object' ? JSON.stringify(error) : error}`);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  const totals = {
    documents: engineResult.documentsCreated + lvResult.documentsCreated +
               engineResult.documentsUpdated + lvResult.documentsUpdated,
    snippets: engineResult.snippetsCreated + lvResult.snippetsCreated,
    errors: engineResult.errors.length + lvResult.errors.length,
  };
  console.log(`  Total documents: ${totals.documents}`);
  console.log(`  Total snippets: ${totals.snippets}`);
  console.log(`  Total errors: ${totals.errors}`);

  // Show document and snippet counts
  const docCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.documents
  `;
  const snippetCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.snippets
  `;

  console.log('\n📋 Database counts:');
  console.log(`  Documents: ${docCount[0].count}`);
  console.log(`  Snippets: ${snippetCount[0].count}`);

  await closeConnection();
}

ingestDocuments().catch(console.error);
