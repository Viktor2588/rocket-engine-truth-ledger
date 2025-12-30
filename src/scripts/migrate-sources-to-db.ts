/**
 * Migrate Sources to Database
 * Populates source_feeds and source_urls tables from SOURCE_REGISTRY
 */

import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';
import { SOURCE_REGISTRY, type SourceConfig } from '../config/sources.js';

interface MigrationStats {
  sourcesCreated: number;
  sourcesUpdated: number;
  feedsCreated: number;
  urlsCreated: number;
  errors: string[];
}

async function migrateSource(
  sql: ReturnType<typeof getConnection>,
  key: string,
  config: SourceConfig,
  stats: MigrationStats
): Promise<void> {
  try {
    // Upsert source with new fields
    const result = await sql`
      INSERT INTO truth_ledger_claude.sources (
        name,
        source_type,
        base_url,
        base_trust,
        independence_cluster_id,
        description,
        default_doc_type,
        is_active,
        tags,
        metadata
      ) VALUES (
        ${config.name},
        ${config.sourceType},
        ${config.baseUrl},
        ${config.baseTrust},
        ${config.independenceCluster},
        ${config.description ?? null},
        ${config.defaultDocType},
        ${config.active},
        ${config.tags ?? []},
        ${JSON.stringify({ registryKey: key })}
      )
      ON CONFLICT (name) DO UPDATE SET
        source_type = EXCLUDED.source_type,
        base_url = EXCLUDED.base_url,
        base_trust = EXCLUDED.base_trust,
        independence_cluster_id = EXCLUDED.independence_cluster_id,
        description = EXCLUDED.description,
        default_doc_type = EXCLUDED.default_doc_type,
        is_active = EXCLUDED.is_active,
        tags = EXCLUDED.tags,
        metadata = truth_ledger_claude.sources.metadata || EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id, (xmax = 0) as inserted
    `;

    const sourceId = result[0].id;
    const wasInserted = result[0].inserted;

    if (wasInserted) {
      stats.sourcesCreated++;
      console.log(`  ✅ Created source: ${config.name}`);
    } else {
      stats.sourcesUpdated++;
      console.log(`  🔄 Updated source: ${config.name}`);
    }

    // Migrate feeds
    if (config.feeds && config.feeds.length > 0) {
      for (const feed of config.feeds) {
        try {
          await sql`
            INSERT INTO truth_ledger_claude.source_feeds (
              source_id,
              feed_url,
              feed_type,
              refresh_interval_minutes,
              max_items,
              is_active
            ) VALUES (
              ${sourceId},
              ${feed.url},
              ${feed.type},
              ${feed.refreshIntervalMinutes},
              ${feed.maxItems ?? 50},
              true
            )
            ON CONFLICT (source_id, feed_url) DO UPDATE SET
              feed_type = EXCLUDED.feed_type,
              refresh_interval_minutes = EXCLUDED.refresh_interval_minutes,
              max_items = EXCLUDED.max_items,
              updated_at = NOW()
          `;
          stats.feedsCreated++;
          console.log(`    📡 Feed: ${feed.url}`);
        } catch (feedError) {
          const msg = feedError instanceof Error ? feedError.message : String(feedError);
          stats.errors.push(`Feed ${feed.url}: ${msg}`);
          console.log(`    ❌ Feed error: ${msg}`);
        }
      }
    }

    // Migrate static URLs
    if (config.urls && config.urls.length > 0) {
      for (const url of config.urls) {
        try {
          await sql`
            INSERT INTO truth_ledger_claude.source_urls (
              source_id,
              url,
              is_active
            ) VALUES (
              ${sourceId},
              ${url},
              true
            )
            ON CONFLICT (source_id, url) DO NOTHING
          `;
          stats.urlsCreated++;
          console.log(`    🔗 URL: ${url.substring(0, 60)}...`);
        } catch (urlError) {
          const msg = urlError instanceof Error ? urlError.message : String(urlError);
          stats.errors.push(`URL ${url}: ${msg}`);
          console.log(`    ❌ URL error: ${msg}`);
        }
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stats.errors.push(`${config.name}: ${msg}`);
    console.error(`  ❌ Error: ${msg}`);
  }
}

async function main() {
  console.log('🚀 Migrating Sources to Database\n');
  console.log('=' .repeat(60));

  const sql = getConnection();
  const stats: MigrationStats = {
    sourcesCreated: 0,
    sourcesUpdated: 0,
    feedsCreated: 0,
    urlsCreated: 0,
    errors: [],
  };

  const entries = Object.entries(SOURCE_REGISTRY);
  console.log(`\nFound ${entries.length} sources in SOURCE_REGISTRY\n`);

  for (const [key, config] of entries) {
    console.log(`\n📦 Processing: ${config.name}`);
    await migrateSource(sql, key, config, stats);
  }

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('=' .repeat(60));
  console.log(`  Sources created: ${stats.sourcesCreated}`);
  console.log(`  Sources updated: ${stats.sourcesUpdated}`);
  console.log(`  Feeds migrated: ${stats.feedsCreated}`);
  console.log(`  URLs migrated: ${stats.urlsCreated}`);
  console.log(`  Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors:');
    for (const error of stats.errors) {
      console.log(`  - ${error}`);
    }
  }

  // Verify counts
  console.log('\n📋 Database Totals:');
  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources) as sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources WHERE is_active = true) as active_sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_feeds) as feeds,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_feeds WHERE is_active = true) as active_feeds,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_urls) as urls
  `;
  console.log(`  Total sources: ${counts[0].sources} (${counts[0].active_sources} active)`);
  console.log(`  Total feeds: ${counts[0].feeds} (${counts[0].active_feeds} active)`);
  console.log(`  Total URLs: ${counts[0].urls}`);

  await closeConnection();
  console.log('\n✅ Migration complete!');
}

main().catch(console.error);
