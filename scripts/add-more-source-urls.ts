import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

// More URLs from the quality sources
const SOURCE_URLS = {
  'NASA Technical Reports Server': [
    // Propulsion technical papers
    'https://ntrs.nasa.gov/citations/19930019136', // Propulsion database
    'https://ntrs.nasa.gov/citations/20140002716', // Rocket Propulsion Fundamentals
    'https://ntrs.nasa.gov/citations/19920004056', // Overview of Rocket Propulsion
    'https://ntrs.nasa.gov/citations/19690026469', // Engine specifications
  ],
  'Space Launch Report': [
    // Detailed vehicle data sheets
    'https://spacelaunchreport.com/falcon9.html',
    'https://spacelaunchreport.com/falconH.html',
    'https://spacelaunchreport.com/starship.html',
    'https://spacelaunchreport.com/atlas5.html',
    'https://spacelaunchreport.com/vulcan.html',
    'https://spacelaunchreport.com/delta4.html',
    'https://spacelaunchreport.com/electron.html',
    'https://spacelaunchreport.com/sls.html',
    'https://spacelaunchreport.com/ariane6.html',
    'https://spacelaunchreport.com/ariane5.html',
    'https://spacelaunchreport.com/soyuz.html',
    'https://spacelaunchreport.com/proton.html',
    'https://spacelaunchreport.com/h3.html',
    'https://spacelaunchreport.com/lm5.html',
    'https://spacelaunchreport.com/lm7.html',
  ],
  "Gunter's Space Page": [
    // Launcher pages
    'https://space.skyrocket.de/doc_lau/falcon-9_v1-2.htm',
    'https://space.skyrocket.de/doc_lau/falcon-heavy.htm',
    'https://space.skyrocket.de/doc_lau/starship.htm',
    'https://space.skyrocket.de/doc_lau/atlas-5.htm',
    'https://space.skyrocket.de/doc_lau/vulcan.htm',
    'https://space.skyrocket.de/doc_lau/delta-4h.htm',
    'https://space.skyrocket.de/doc_lau/electron.htm',
    'https://space.skyrocket.de/doc_lau/new-glenn.htm',
    'https://space.skyrocket.de/doc_lau/sls.htm',
    'https://space.skyrocket.de/doc_lau/ariane-6.htm',
    'https://space.skyrocket.de/doc_lau/soyuz-2.htm',
    'https://space.skyrocket.de/doc_lau/h-3.htm',
    'https://space.skyrocket.de/doc_lau/cz-5.htm',
    'https://space.skyrocket.de/doc_lau/terran-r.htm',
    'https://space.skyrocket.de/doc_lau/neutron.htm',
    // Engine pages
    'https://space.skyrocket.de/doc_eng/merlin-1d.htm',
    'https://space.skyrocket.de/doc_eng/raptor.htm',
    'https://space.skyrocket.de/doc_eng/be-4.htm',
    'https://space.skyrocket.de/doc_eng/rs-25.htm',
    'https://space.skyrocket.de/doc_eng/rd-180.htm',
    'https://space.skyrocket.de/doc_eng/rl-10.htm',
  ],
};

async function main() {
  let added = 0;
  let skipped = 0;

  for (const [sourceName, urls] of Object.entries(SOURCE_URLS)) {
    // Get source ID
    const source = await sql`
      SELECT id FROM truth_ledger_claude.sources WHERE name = ${sourceName}
    `;

    if (source.length === 0) {
      console.log(`Source not found: ${sourceName}`);
      continue;
    }

    const sourceId = source[0].id;
    console.log(`\n${sourceName}:`);

    for (const url of urls) {
      try {
        // Check if exists
        const existing = await sql`
          SELECT id FROM truth_ledger_claude.source_urls
          WHERE source_id = ${sourceId} AND url = ${url}
        `;

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        await sql`
          INSERT INTO truth_ledger_claude.source_urls (source_id, url, is_active)
          VALUES (${sourceId}, ${url}, true)
        `;
        added++;
        console.log(`  + ${url.substring(url.lastIndexOf('/') + 1)}`);
      } catch (e: any) {
        console.log(`  ! Error: ${e.message?.substring(0, 50)}`);
      }
    }
  }

  // Stats
  const stats = await sql`
    SELECT s.name, COUNT(u.id)::int as url_count
    FROM truth_ledger_claude.sources s
    LEFT JOIN truth_ledger_claude.source_urls u ON u.source_id = s.id
    WHERE s.name IN ('NASA Technical Reports Server', 'Space Launch Report', 'Gunter''s Space Page', 'NASASpaceFlight')
    GROUP BY s.name
    ORDER BY url_count DESC
  `;

  console.log(`\n=== Summary ===`);
  console.log(`Added ${added} URLs (${skipped} already existed)`);
  console.log(`\nURLs per source:`);
  stats.forEach(s => console.log(`  ${s.name}: ${s.url_count}`));

  // Total stats
  const total = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources WHERE is_active = true) as sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_urls WHERE is_active = true) as urls,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_feeds WHERE is_active = true) as feeds
  `;
  console.log(`\nTotal active: ${total[0].sources} sources, ${total[0].urls} URLs, ${total[0].feeds} feeds`);

  await sql.end();
}

main();
