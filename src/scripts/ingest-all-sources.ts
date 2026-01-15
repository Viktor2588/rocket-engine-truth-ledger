/**
 * Ingest from All Active Database Sources
 * Fetches all active sources from the database and ingests their URLs
 */

import 'dotenv/config';
import { Ingestor } from '../services/ingestor.js';
import { getConnection, closeConnection } from '../db/connection.js';

interface Source {
  id: string;
  name: string;
  source_type: string;
  base_trust: number;
  default_doc_type: string | null;
}

interface SourceUrl {
  id: string;
  url: string;
  last_fetched_at: Date | null;
}

async function ingestAllSources() {
  const sql = getConnection();
  const ingestor = new Ingestor();

  console.log('🌐 Ingesting from All Active Database Sources\n');
  console.log('='.repeat(60));

  // Get all active sources
  const sources = await sql<Source[]>`
    SELECT id, name, source_type, base_trust, default_doc_type
    FROM truth_ledger_claude.sources
    WHERE is_active = true
    ORDER BY base_trust DESC, name
  `;

  console.log(`Found ${sources.length} active sources\n`);

  const results = {
    sourcesProcessed: 0,
    documentsCreated: 0,
    documentsUpdated: 0,
    snippetsCreated: 0,
    urlsProcessed: 0,
    errors: [] as string[],
  };

  // Map source_type to doc_type
  const docTypeMap: Record<string, 'company_news' | 'technical_report' | 'news_article' | 'wiki' | 'other'> = {
    manufacturer: 'company_news',
    government_agency: 'technical_report',
    government: 'technical_report',
    research: 'technical_report',
    technical_database: 'technical_report',
    news: 'news_article',
    wiki: 'wiki',
  };

  for (const source of sources) {
    // Get active URLs for this source
    const urls = await sql<SourceUrl[]>`
      SELECT id, url, last_fetched_at
      FROM truth_ledger_claude.source_urls
      WHERE source_id = ${source.id} AND is_active = true
      ORDER BY last_fetched_at ASC NULLS FIRST
    `;

    if (urls.length === 0) {
      console.log(`⏭️  ${source.name}: No active URLs, skipping`);
      continue;
    }

    console.log(`\n📡 ${source.name} (${source.source_type}, trust: ${source.base_trust})`);
    console.log(`   Processing ${urls.length} URLs...`);

    try {
      const docType = docTypeMap[source.source_type] ?? (source.default_doc_type as any) ?? 'other';
      const urlList = urls.map(u => u.url);

      const ingestResult = await ingestor.ingest({
        sourceId: source.id,
        urls: urlList,
        docType,
        fetchTimeout: 45000,
      });

      results.sourcesProcessed++;
      results.documentsCreated += ingestResult.documentsCreated;
      results.documentsUpdated += ingestResult.documentsUpdated;
      results.snippetsCreated += ingestResult.snippetsCreated;
      results.urlsProcessed += urlList.length;

      console.log(`   ✅ Documents: ${ingestResult.documentsCreated} new, ${ingestResult.documentsUpdated} updated`);
      console.log(`   📝 Snippets: ${ingestResult.snippetsCreated}`);

      if (ingestResult.errors.length > 0) {
        for (const error of ingestResult.errors.slice(0, 3)) {
          const errorMsg = typeof error === 'object' ? `${error.url}: ${error.error}` : String(error);
          console.log(`   ⚠️  ${errorMsg}`);
          results.errors.push(`${source.name}: ${errorMsg}`);
        }
        if (ingestResult.errors.length > 3) {
          console.log(`   ... and ${ingestResult.errors.length - 3} more errors`);
        }
      }

      // Update last_fetched_at for processed URLs
      await sql`
        UPDATE truth_ledger_claude.source_urls
        SET last_fetched_at = NOW()
        WHERE source_id = ${source.id} AND is_active = true
      `;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`   ❌ Failed: ${errorMsg}`);
      results.errors.push(`${source.name}: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 INGESTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Sources processed: ${results.sourcesProcessed}`);
  console.log(`  URLs processed: ${results.urlsProcessed}`);
  console.log(`  Documents created: ${results.documentsCreated}`);
  console.log(`  Documents updated: ${results.documentsUpdated}`);
  console.log(`  Snippets created: ${results.snippetsCreated}`);
  console.log(`  Errors: ${results.errors.length}`);

  // Database totals
  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources WHERE is_active = true) as sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.source_urls WHERE is_active = true) as urls,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.documents) as documents,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.snippets) as snippets,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.snippets WHERE processing_status = 'pending') as pending_snippets
  `;

  console.log('\n📋 Database Totals:');
  console.log(`  Active Sources: ${counts[0].sources}`);
  console.log(`  Active URLs: ${counts[0].urls}`);
  console.log(`  Documents: ${counts[0].documents}`);
  console.log(`  Snippets: ${counts[0].snippets} (${counts[0].pending_snippets} pending extraction)`);

  await closeConnection();

  console.log('\n✅ Ingestion complete!');
  console.log('Run `npm run job:extract` to extract claims from the new documents.');
}

ingestAllSources().catch(console.error);
