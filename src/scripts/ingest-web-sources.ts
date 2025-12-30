/**
 * Ingest from Industry and News Web Sources
 * Fetches data from manufacturers, agencies, and news outlets
 */

import 'dotenv/config';
import { Ingestor, SourceManager } from '../services/ingestor.js';
import { getConnection, closeConnection } from '../db/connection.js';

// Source configurations with trust levels
const SOURCES_CONFIG = {
  // Official Manufacturers (High Trust)
  manufacturers: [
    {
      name: 'SpaceX Official',
      sourceType: 'manufacturer' as const,
      baseTrust: 0.90,
      baseUrl: 'https://www.spacex.com',
      urls: [
        'https://www.spacex.com/vehicles/falcon-9/',
        'https://www.spacex.com/vehicles/falcon-heavy/',
        'https://www.spacex.com/vehicles/starship/',
        'https://www.spacex.com/updates/',
      ],
    },
    {
      name: 'Blue Origin Official',
      sourceType: 'manufacturer' as const,
      baseTrust: 0.90,
      baseUrl: 'https://www.blueorigin.com',
      urls: [
        'https://www.blueorigin.com/new-glenn',
        'https://www.blueorigin.com/new-shepard',
        'https://www.blueorigin.com/engines',
        'https://www.blueorigin.com/news/',
      ],
    },
    {
      name: 'Rocket Lab Official',
      sourceType: 'manufacturer' as const,
      baseTrust: 0.90,
      baseUrl: 'https://www.rocketlabusa.com',
      urls: [
        'https://www.rocketlabusa.com/launch/electron/',
        'https://www.rocketlabusa.com/launch/neutron/',
        'https://www.rocketlabusa.com/space-systems/spacecraft/',
      ],
    },
    {
      name: 'ULA Official',
      sourceType: 'manufacturer' as const,
      baseTrust: 0.90,
      baseUrl: 'https://www.ulalaunch.com',
      urls: [
        'https://www.ulalaunch.com/rockets/vulcan-centaur',
        'https://www.ulalaunch.com/rockets/atlas-v',
        'https://www.ulalaunch.com/rockets/delta-iv-heavy',
      ],
    },
    {
      name: 'Aerojet Rocketdyne',
      sourceType: 'manufacturer' as const,
      baseTrust: 0.90,
      baseUrl: 'https://www.rocket.com',
      urls: [
        'https://www.rocket.com/space/liquid-engines',
        'https://www.rocket.com/space/liquid-engines/rs-25-engine',
        'https://www.rocket.com/space/liquid-engines/rl10-engine',
      ],
    },
  ],

  // Government Agencies (Highest Trust)
  agencies: [
    {
      name: 'NASA',
      sourceType: 'government_agency' as const,
      baseTrust: 0.95,
      baseUrl: 'https://www.nasa.gov',
      urls: [
        'https://www.nasa.gov/humans-in-space/space-launch-system/',
        'https://www.nasa.gov/exploration-systems-development/',
        'https://www.nasa.gov/exploration-systems-development/rs-25-engines/',
        'https://www.nasa.gov/artemis/',
      ],
    },
    {
      name: 'ESA',
      sourceType: 'government_agency' as const,
      baseTrust: 0.95,
      baseUrl: 'https://www.esa.int',
      urls: [
        'https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Ariane_6',
        'https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Vega-C',
        'https://www.esa.int/Enabling_Support/Space_Transportation',
      ],
    },
  ],

  // News and Research (Medium-High Trust)
  news: [
    {
      name: 'Ars Technica Space',
      sourceType: 'news' as const,
      baseTrust: 0.75,
      baseUrl: 'https://arstechnica.com',
      urls: [
        'https://arstechnica.com/science/2024/10/after-a-series-of-uncrewed-tests-starliner-has-a-decision-to-make/',
        'https://arstechnica.com/space/',
      ],
    },
    {
      name: 'SpaceNews',
      sourceType: 'news' as const,
      baseTrust: 0.80,
      baseUrl: 'https://spacenews.com',
      urls: [
        'https://spacenews.com/section/launch/',
        'https://spacenews.com/tag/spacex/',
        'https://spacenews.com/tag/blue-origin/',
      ],
    },
    {
      name: 'NASASpaceFlight',
      sourceType: 'news' as const,
      baseTrust: 0.80,
      baseUrl: 'https://www.nasaspaceflight.com',
      urls: [
        'https://www.nasaspaceflight.com/tag/spacex/',
        'https://www.nasaspaceflight.com/tag/starship/',
        'https://www.nasaspaceflight.com/tag/raptor/',
      ],
    },
  ],

  // Wikipedia (Community Verified)
  wiki: [
    {
      name: 'Wikipedia Aerospace',
      sourceType: 'wiki' as const,
      baseTrust: 0.70,
      baseUrl: 'https://en.wikipedia.org',
      urls: [
        // More engines
        'https://en.wikipedia.org/wiki/F-1_(rocket_engine)',
        'https://en.wikipedia.org/wiki/J-2_(rocket_engine)',
        'https://en.wikipedia.org/wiki/Rocketdyne_F-1',
        'https://en.wikipedia.org/wiki/NK-33',
        'https://en.wikipedia.org/wiki/RD-170',
        'https://en.wikipedia.org/wiki/RD-191',
        'https://en.wikipedia.org/wiki/Vulcain',
        'https://en.wikipedia.org/wiki/HM7B',
        'https://en.wikipedia.org/wiki/Vinci_(rocket_engine)',
        'https://en.wikipedia.org/wiki/YF-100',
        'https://en.wikipedia.org/wiki/Raptor_(rocket_engine)',
        // More launch vehicles
        'https://en.wikipedia.org/wiki/Ariane_6',
        'https://en.wikipedia.org/wiki/Ariane_5',
        'https://en.wikipedia.org/wiki/Delta_IV_Heavy',
        'https://en.wikipedia.org/wiki/Long_March_5',
        'https://en.wikipedia.org/wiki/Soyuz-2',
        'https://en.wikipedia.org/wiki/Proton-M',
        'https://en.wikipedia.org/wiki/H-IIA',
        'https://en.wikipedia.org/wiki/PSLV',
        'https://en.wikipedia.org/wiki/Vega_(rocket)',
        // Comparison pages
        'https://en.wikipedia.org/wiki/Comparison_of_orbital_launch_systems',
        'https://en.wikipedia.org/wiki/Comparison_of_orbital_rocket_engines',
      ],
    },
  ],
};

// Additional entities to seed
const ADDITIONAL_ENTITIES = [
  // Classic engines
  { entityType: 'engine', canonicalName: 'F-1', aliases: ['Rocketdyne F-1', 'F1'] },
  { entityType: 'engine', canonicalName: 'J-2', aliases: ['Rocketdyne J-2', 'J2'] },
  { entityType: 'engine', canonicalName: 'NK-33', aliases: ['NK33', 'Aerojet AJ26'] },
  { entityType: 'engine', canonicalName: 'RD-170', aliases: ['RD170'] },
  { entityType: 'engine', canonicalName: 'RD-191', aliases: ['RD191'] },
  // European engines
  { entityType: 'engine', canonicalName: 'Vulcain', aliases: ['Vulcain 2', 'Vulcain 2.1'] },
  { entityType: 'engine', canonicalName: 'HM7B', aliases: ['HM7-B', 'HM7'] },
  { entityType: 'engine', canonicalName: 'Vinci', aliases: ['Vinci Engine'] },
  // Chinese engines
  { entityType: 'engine', canonicalName: 'YF-100', aliases: ['YF100'] },
  { entityType: 'engine', canonicalName: 'YF-77', aliases: ['YF77'] },
  // Launch vehicles
  { entityType: 'launch_vehicle', canonicalName: 'Ariane 6', aliases: ['Ariane 6.2', 'Ariane 6.4', 'A6'] },
  { entityType: 'launch_vehicle', canonicalName: 'Ariane 5', aliases: ['Ariane 5 ECA', 'A5'] },
  { entityType: 'launch_vehicle', canonicalName: 'Delta IV Heavy', aliases: ['D4H', 'Delta IV-H'] },
  { entityType: 'launch_vehicle', canonicalName: 'Long March 5', aliases: ['CZ-5', 'LM-5'] },
  { entityType: 'launch_vehicle', canonicalName: 'Soyuz-2', aliases: ['Soyuz 2.1a', 'Soyuz 2.1b'] },
  { entityType: 'launch_vehicle', canonicalName: 'Proton-M', aliases: ['Proton M', 'Proton'] },
  { entityType: 'launch_vehicle', canonicalName: 'H-IIA', aliases: ['H-2A', 'H2A'] },
  { entityType: 'launch_vehicle', canonicalName: 'PSLV', aliases: ['Polar Satellite Launch Vehicle'] },
  { entityType: 'launch_vehicle', canonicalName: 'Vega', aliases: ['Vega-C', 'Vega C'] },
  { entityType: 'launch_vehicle', canonicalName: 'New Shepard', aliases: ['NS', 'Blue Origin New Shepard'] },
  { entityType: 'launch_vehicle', canonicalName: 'Neutron', aliases: ['Rocket Lab Neutron'] },
];

async function seedAdditionalEntities(sql: ReturnType<typeof getConnection>) {
  console.log('\n🌱 Seeding additional entities...');
  let created = 0;
  let skipped = 0;

  for (const entity of ADDITIONAL_ENTITIES) {
    try {
      const existing = await sql`
        SELECT id FROM truth_ledger_claude.entities
        WHERE canonical_name = ${entity.canonicalName}
        LIMIT 1
      `;

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await sql`
        INSERT INTO truth_ledger_claude.entities (entity_type, canonical_name, aliases)
        VALUES (${entity.entityType}, ${entity.canonicalName}, ${entity.aliases})
      `;
      console.log(`  ✅ Created: ${entity.canonicalName}`);
      created++;
    } catch (error) {
      console.error(`  ❌ Error creating ${entity.canonicalName}:`, error);
    }
  }

  console.log(`  📊 Entities: ${created} created, ${skipped} skipped`);
}

async function createOrGetSource(
  sql: ReturnType<typeof getConnection>,
  config: { name: string; sourceType: string; baseTrust: number; baseUrl: string }
) {
  // Check if source exists
  const existing = await sql`
    SELECT id, name FROM truth_ledger_claude.sources
    WHERE name = ${config.name}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new source
  const result = await sql`
    INSERT INTO truth_ledger_claude.sources (name, source_type, base_trust, base_url)
    VALUES (${config.name}, ${config.sourceType}, ${config.baseTrust}, ${config.baseUrl})
    RETURNING id, name
  `;

  console.log(`  ✅ Created source: ${config.name} (trust: ${config.baseTrust})`);
  return result[0];
}

async function ingestFromSources() {
  const sql = getConnection();
  const ingestor = new Ingestor();

  console.log('🌐 Ingesting from Web Sources\n');
  console.log('=' .repeat(50));

  // Seed additional entities first
  await seedAdditionalEntities(sql);

  const results = {
    sources: 0,
    documents: 0,
    snippets: 0,
    errors: [] as string[],
  };

  // Process each source category
  for (const [category, sources] of Object.entries(SOURCES_CONFIG)) {
    console.log(`\n📂 Processing ${category.toUpperCase()} sources...`);

    for (const sourceConfig of sources) {
      console.log(`\n  📡 ${sourceConfig.name}`);

      try {
        // Create or get source
        const source = await createOrGetSource(sql, sourceConfig);
        results.sources++;

        // Map source type to valid doc_type
        const docTypeMap: Record<string, 'company_news' | 'technical_report' | 'news_article' | 'wiki' | 'other'> = {
          manufacturer: 'company_news',
          government_agency: 'technical_report',
          news: 'news_article',
          wiki: 'wiki',
        };
        const docType = docTypeMap[sourceConfig.sourceType] ?? 'other';

        // Ingest documents
        const ingestResult = await ingestor.ingest({
          sourceId: source.id,
          urls: sourceConfig.urls,
          docType,
          fetchTimeout: 45000, // 45 seconds for potentially slow sites
        });

        results.documents += ingestResult.documentsCreated + ingestResult.documentsUpdated;
        results.snippets += ingestResult.snippetsCreated;

        console.log(`    📄 Documents: ${ingestResult.documentsCreated} new, ${ingestResult.documentsUpdated} updated`);
        console.log(`    📝 Snippets: ${ingestResult.snippetsCreated}`);

        if (ingestResult.errors.length > 0) {
          for (const error of ingestResult.errors) {
            const errorMsg = typeof error === 'object' ? JSON.stringify(error) : String(error);
            console.log(`    ⚠️  ${errorMsg}`);
            results.errors.push(`${sourceConfig.name}: ${errorMsg}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`    ❌ Failed: ${errorMsg}`);
        results.errors.push(`${sourceConfig.name}: ${errorMsg}`);
      }
    }
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 INGESTION SUMMARY');
  console.log('=' .repeat(50));
  console.log(`  Sources processed: ${results.sources}`);
  console.log(`  Documents ingested: ${results.documents}`);
  console.log(`  Snippets created: ${results.snippets}`);
  console.log(`  Errors: ${results.errors.length}`);

  // Database counts
  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources) as sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.documents) as documents,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.snippets) as snippets,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.entities) as entities
  `;

  console.log('\n📋 Database Totals:');
  console.log(`  Sources: ${counts[0].sources}`);
  console.log(`  Documents: ${counts[0].documents}`);
  console.log(`  Snippets: ${counts[0].snippets}`);
  console.log(`  Entities: ${counts[0].entities}`);

  await closeConnection();

  console.log('\n✅ Ingestion complete!');
  console.log('Run `npm run job:extract` to extract claims from the new documents.');
}

ingestFromSources().catch(console.error);
