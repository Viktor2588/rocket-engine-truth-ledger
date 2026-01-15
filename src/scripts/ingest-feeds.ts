/**
 * Feed Ingestion Script
 * Ingests data from RSS/Atom feeds for continuous updates
 */

import 'dotenv/config';
import { feedFetcher } from '../services/feed-fetcher.js';
import { closeConnection } from '../db/connection.js';
import { getSourcesWithFeeds, getTotalFeedCount, getFeedRefreshSchedule } from '../config/sources.js';

async function main() {
  const args = process.argv.slice(2);
  const showSchedule = args.includes('--schedule');
  const dryRun = args.includes('--dry-run');
  const sourceFilter = args.find(a => a.startsWith('--source='))?.split('=')[1];

  console.log('🌐 Feed Ingestion Pipeline\n');
  console.log('=' .repeat(60));

  // Show feed schedule
  if (showSchedule || dryRun) {
    const schedule = getFeedRefreshSchedule();
    console.log('\n📅 Feed Refresh Schedule:\n');

    const grouped: Record<number, typeof schedule> = {};
    schedule.forEach(s => {
      if (!grouped[s.refreshIntervalMinutes]) {
        grouped[s.refreshIntervalMinutes] = [];
      }
      grouped[s.refreshIntervalMinutes].push(s);
    });

    Object.entries(grouped)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([interval, feeds]) => {
        console.log(`\n  Every ${interval} minutes:`);
        feeds.forEach(f => {
          console.log(`    • ${f.sourceName}`);
          console.log(`      ${f.feedUrl}`);
        });
      });

    console.log(`\n  Total: ${getTotalFeedCount()} feeds from ${getSourcesWithFeeds().length} sources`);

    if (dryRun) {
      console.log('\n📋 Dry run - no actual ingestion performed.');
      await closeConnection();
      return;
    }
  }

  console.log('\n📡 Starting feed ingestion...\n');

  try {
    const result = await feedFetcher.ingestAllFeeds({
      sourceKeys: sourceFilter ? [sourceFilter] : undefined,
      maxItemsPerFeed: 30, // Limit items per feed
    });

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FEED INGESTION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`  Feeds processed: ${result.totalFeeds}`);
    console.log(`  Items fetched: ${result.totalItemsFetched}`);
    console.log(`  Documents created: ${result.totalDocumentsCreated}`);
    console.log(`  Documents updated: ${result.totalDocumentsUpdated}`);
    console.log(`  Snippets created: ${result.totalSnippetsCreated}`);
    console.log(`  Errors: ${result.totalErrors}`);
    console.log(`  Duration: ${((result.completedAt.getTime() - result.startedAt.getTime()) / 1000).toFixed(1)}s`);

    if (result.totalErrors > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.results
        .filter(r => r.errors.length > 0)
        .forEach(r => {
          console.log(`  ${r.sourceName}:`);
          r.errors.forEach(e => console.log(`    • ${e}`));
        });
    }

    console.log('\n✅ Feed ingestion complete!');
    console.log('Run `npm run job:extract` to extract claims from the new documents.');

  } catch (error) {
    console.error('\n❌ Feed ingestion failed:', error);
    process.exitCode = 1;
  } finally {
    await closeConnection();
  }
}

main();
