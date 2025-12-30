import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

// High-quality sources for rocket engine and launch vehicle data
const SOURCES_TO_ADD = [
  // NASA Official Sources
  {
    name: 'NASA Technical Reports Server',
    sourceType: 'government',
    baseTrust: 0.95,
    baseUrl: 'https://ntrs.nasa.gov',
    description: 'NASA STI Repository with technical papers and reports',
    defaultDocType: 'technical_report',
    urls: [
      'https://ntrs.nasa.gov/search.jsp?R=19930019136', // Propulsion database
    ],
  },
  {
    name: 'NASA Reference',
    sourceType: 'government',
    baseTrust: 0.95,
    baseUrl: 'https://www.nasa.gov',
    description: 'Official NASA reference pages for space systems',
    defaultDocType: 'technical_page',
    urls: [
      'https://www.nasa.gov/reference/space-launch-system-rs-25-core-stage-engine/',
      'https://www.grc.nasa.gov/www/k-12/airplane/lrockth.html',
    ],
  },
  // Manufacturer Sources
  {
    name: 'L3Harris Propulsion',
    sourceType: 'manufacturer',
    baseTrust: 0.90,
    baseUrl: 'https://www.l3harris.com',
    description: 'L3Harris (Aerojet Rocketdyne) propulsion systems',
    defaultDocType: 'product_page',
    urls: [
      'https://www.l3harris.com/all-capabilities/rs-25-engine',
    ],
  },
  // News Sources with Technical Detail
  {
    name: 'NASASpaceFlight',
    sourceType: 'news',
    baseTrust: 0.75,
    baseUrl: 'https://www.nasaspaceflight.com',
    description: 'Detailed spaceflight news with technical reporting',
    defaultDocType: 'news_article',
    feeds: [
      { url: 'https://www.nasaspaceflight.com/feed/', type: 'rss' },
    ],
  },
  // More Wikipedia Pages
  {
    name: 'Wikipedia Rocket Engines',
    sourceType: 'wiki',
    baseTrust: 0.50,
    baseUrl: 'https://en.wikipedia.org',
    description: 'Wikipedia articles on specific rocket engines',
    defaultDocType: 'wiki_article',
    urls: [
      'https://en.wikipedia.org/wiki/RS-25',
      'https://en.wikipedia.org/wiki/Merlin_(rocket_engine_family)',
      'https://en.wikipedia.org/wiki/SpaceX_Raptor',
      'https://en.wikipedia.org/wiki/BE-4',
      'https://en.wikipedia.org/wiki/RD-180',
      'https://en.wikipedia.org/wiki/F-1_(rocket_engine)',
      'https://en.wikipedia.org/wiki/RL10',
      'https://en.wikipedia.org/wiki/RD-170',
      'https://en.wikipedia.org/wiki/NK-33',
      'https://en.wikipedia.org/wiki/Rutherford_(rocket_engine)',
      'https://en.wikipedia.org/wiki/Vulcain',
      'https://en.wikipedia.org/wiki/LE-7',
      'https://en.wikipedia.org/wiki/YF-100',
      'https://en.wikipedia.org/wiki/Vikas_(rocket_engine)',
    ],
  },
  {
    name: 'Wikipedia Launch Vehicles',
    sourceType: 'wiki',
    baseTrust: 0.50,
    baseUrl: 'https://en.wikipedia.org',
    description: 'Wikipedia articles on launch vehicles',
    defaultDocType: 'wiki_article',
    urls: [
      'https://en.wikipedia.org/wiki/SpaceX_Starship',
      'https://en.wikipedia.org/wiki/Space_Launch_System',
      'https://en.wikipedia.org/wiki/New_Glenn',
      'https://en.wikipedia.org/wiki/Ariane_6',
      'https://en.wikipedia.org/wiki/Long_March_5',
      'https://en.wikipedia.org/wiki/H3_(rocket)',
      'https://en.wikipedia.org/wiki/Saturn_V',
      'https://en.wikipedia.org/wiki/Space_Shuttle',
      'https://en.wikipedia.org/wiki/Delta_IV',
      'https://en.wikipedia.org/wiki/Soyuz_(rocket_family)',
    ],
  },
  // European Space Agency
  {
    name: 'ESA',
    sourceType: 'government',
    baseTrust: 0.90,
    baseUrl: 'https://www.esa.int',
    description: 'European Space Agency official resources',
    defaultDocType: 'technical_page',
    feeds: [
      { url: 'https://www.esa.int/rssfeed/Our_Activities/Space_Transportation', type: 'rss' },
    ],
  },
  // Space Launch Report (Technical)
  {
    name: 'Space Launch Report',
    sourceType: 'technical_database',
    baseTrust: 0.80,
    baseUrl: 'https://spacelaunchreport.com',
    description: 'Detailed launch vehicle specifications',
    defaultDocType: 'data_sheet',
    urls: [
      'https://spacelaunchreport.com/falcon9.html',
      'https://spacelaunchreport.com/falconH.html',
    ],
  },
  // Gunter's Space Page (Technical Database)
  {
    name: "Gunter's Space Page",
    sourceType: 'technical_database',
    baseTrust: 0.75,
    baseUrl: 'https://space.skyrocket.de',
    description: 'Comprehensive spacecraft and launcher database',
    defaultDocType: 'data_sheet',
    urls: [
      'https://space.skyrocket.de/directories/launcher.htm',
    ],
  },
];

async function main() {
  let sourcesAdded = 0;
  let urlsAdded = 0;
  let feedsAdded = 0;

  for (const source of SOURCES_TO_ADD) {
    try {
      // Check if source exists
      const existing = await sql`
        SELECT id FROM truth_ledger_claude.sources WHERE name = ${source.name}
      `;

      let sourceId: string;

      if (existing.length > 0) {
        sourceId = existing[0].id;
        console.log(`Source exists: ${source.name}`);
      } else {
        // Create source
        const result = await sql`
          INSERT INTO truth_ledger_claude.sources (
            name, source_type, base_trust, base_url, description, default_doc_type, is_active
          ) VALUES (
            ${source.name}, ${source.sourceType}, ${source.baseTrust},
            ${source.baseUrl}, ${source.description}, ${source.defaultDocType}, true
          )
          RETURNING id
        `;
        sourceId = result[0].id;
        sourcesAdded++;
        console.log(`Added source: ${source.name}`);
      }

      // Add URLs
      if (source.urls) {
        for (const url of source.urls) {
          try {
            const existingUrl = await sql`
              SELECT id FROM truth_ledger_claude.source_urls
              WHERE source_id = ${sourceId} AND url = ${url}
            `;
            if (existingUrl.length === 0) {
              await sql`
                INSERT INTO truth_ledger_claude.source_urls (source_id, url, is_active)
                VALUES (${sourceId}, ${url}, true)
              `;
              urlsAdded++;
            }
          } catch (e: any) {
            console.log(`  URL exists: ${url.substring(0, 50)}...`);
          }
        }
      }

      // Add feeds
      if (source.feeds) {
        for (const feed of source.feeds) {
          try {
            const existingFeed = await sql`
              SELECT id FROM truth_ledger_claude.source_feeds
              WHERE source_id = ${sourceId} AND feed_url = ${feed.url}
            `;
            if (existingFeed.length === 0) {
              await sql`
                INSERT INTO truth_ledger_claude.source_feeds (
                  source_id, feed_url, feed_type, refresh_interval_minutes, is_active
                ) VALUES (${sourceId}, ${feed.url}, ${feed.type}, 60, true)
              `;
              feedsAdded++;
            }
          } catch (e: any) {
            console.log(`  Feed exists: ${feed.url.substring(0, 50)}...`);
          }
        }
      }
    } catch (e: any) {
      console.error(`Error with ${source.name}:`, e.message);
    }
  }

  // Summary
  const stats = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources) as sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources WHERE is_active = true) as active_sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_urls) as urls,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_feeds WHERE is_active = true) as feeds
  `;

  console.log(`\n=== Summary ===`);
  console.log(`Added: ${sourcesAdded} sources, ${urlsAdded} URLs, ${feedsAdded} feeds`);
  console.log(`\nTotal in database:`);
  console.log(`  Sources: ${stats[0].sources} (${stats[0].active_sources} active)`);
  console.log(`  URLs: ${stats[0].urls}`);
  console.log(`  Feeds: ${stats[0].feeds}`);

  await sql.end();
}

main();
