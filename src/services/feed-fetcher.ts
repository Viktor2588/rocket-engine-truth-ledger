/**
 * Feed Fetcher Service
 * Handles RSS/Atom/JSON feed ingestion for continuous data updates
 */

import { getConnection } from '../db/connection.js';
import { SyncManager } from './sync-manager.js';
import { Ingestor, HtmlFetcher, SourceManager } from './ingestor.js';
import {
  SOURCE_REGISTRY,
  getSourcesWithFeeds,
  type SourceConfig,
  type FeedType as ConfigFeedType,
} from '../config/sources.js';
import type { Source, DocType, SourceFeed, FeedType } from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface FeedItem {
  title: string;
  url: string;
  publishedAt?: Date;
  description?: string;
  author?: string;
  categories?: string[];
}

export interface FeedResult {
  sourceKey: string;
  sourceName: string;
  feedUrl: string;
  itemsFetched: number;
  documentsCreated: number;
  documentsUpdated: number;
  snippetsCreated: number;
  errors: string[];
  durationMs: number;
}

export interface FeedIngestionSummary {
  syncId: number;
  startedAt: Date;
  completedAt: Date;
  totalFeeds: number;
  totalItemsFetched: number;
  totalDocumentsCreated: number;
  totalDocumentsUpdated: number;
  totalSnippetsCreated: number;
  totalErrors: number;
  results: FeedResult[];
}

// ============================================================================
// FEED PARSER
// ============================================================================

/**
 * Parse RSS/Atom feed XML into structured items
 */
export class FeedParser {
  /**
   * Parse feed content based on type
   */
  parse(content: string, type: FeedType): FeedItem[] {
    switch (type) {
      case 'rss':
        return this.parseRss(content);
      case 'atom':
        return this.parseAtom(content);
      case 'json':
        return this.parseJson(content);
      default:
        throw new Error(`Unsupported feed type: ${type}`);
    }
  }

  private parseRss(content: string): FeedItem[] {
    const items: FeedItem[] = [];

    // Extract items from RSS feed
    const itemMatches = content.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);

    for (const match of itemMatches) {
      const itemXml = match[1];

      const title = this.extractTag(itemXml, 'title');
      const link = this.extractTag(itemXml, 'link') || this.extractTag(itemXml, 'guid');
      const pubDate = this.extractTag(itemXml, 'pubDate');
      const description = this.extractTag(itemXml, 'description');
      const author = this.extractTag(itemXml, 'author') || this.extractTag(itemXml, 'dc:creator');

      // Extract categories
      const categories: string[] = [];
      const catMatches = itemXml.matchAll(/<category[^>]*>([^<]+)<\/category>/gi);
      for (const catMatch of catMatches) {
        categories.push(this.decodeHtml(catMatch[1].trim()));
      }

      if (title && link) {
        items.push({
          title: this.decodeHtml(title),
          url: link,
          publishedAt: pubDate ? new Date(pubDate) : undefined,
          description: description ? this.decodeHtml(this.stripHtml(description)) : undefined,
          author: author ? this.decodeHtml(author) : undefined,
          categories: categories.length > 0 ? categories : undefined,
        });
      }
    }

    return items;
  }

  private parseAtom(content: string): FeedItem[] {
    const items: FeedItem[] = [];

    // Extract entries from Atom feed
    const entryMatches = content.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);

    for (const match of entryMatches) {
      const entryXml = match[1];

      const title = this.extractTag(entryXml, 'title');
      const link = this.extractAtomLink(entryXml);
      const updated = this.extractTag(entryXml, 'updated') || this.extractTag(entryXml, 'published');
      const summary = this.extractTag(entryXml, 'summary') || this.extractTag(entryXml, 'content');
      const author = this.extractTag(entryXml, 'name'); // nested in <author>

      // Extract categories
      const categories: string[] = [];
      const catMatches = entryXml.matchAll(/<category[^>]*term="([^"]+)"/gi);
      for (const catMatch of catMatches) {
        categories.push(this.decodeHtml(catMatch[1]));
      }

      if (title && link) {
        items.push({
          title: this.decodeHtml(title),
          url: link,
          publishedAt: updated ? new Date(updated) : undefined,
          description: summary ? this.decodeHtml(this.stripHtml(summary)) : undefined,
          author: author ? this.decodeHtml(author) : undefined,
          categories: categories.length > 0 ? categories : undefined,
        });
      }
    }

    return items;
  }

  private parseJson(content: string): FeedItem[] {
    try {
      const data = JSON.parse(content);

      // Handle JSON Feed format
      if (data.items && Array.isArray(data.items)) {
        return data.items.map((item: Record<string, unknown>) => ({
          title: String(item.title || ''),
          url: String(item.url || item.id || ''),
          publishedAt: item.date_published ? new Date(String(item.date_published)) : undefined,
          description: item.content_text ? String(item.content_text) : undefined,
          author: item.author && typeof item.author === 'object'
            ? String((item.author as Record<string, unknown>).name || '')
            : undefined,
        })).filter((item: FeedItem) => item.title && item.url);
      }

      // Handle array of items directly
      if (Array.isArray(data)) {
        return data.map((item: Record<string, unknown>) => ({
          title: String(item.title || item.name || ''),
          url: String(item.url || item.link || ''),
          publishedAt: item.date || item.published_at || item.created_at
            ? new Date(String(item.date || item.published_at || item.created_at))
            : undefined,
          description: item.description || item.summary
            ? String(item.description || item.summary)
            : undefined,
        })).filter((item: FeedItem) => item.title && item.url);
      }

      return [];
    } catch {
      return [];
    }
  }

  private extractTag(xml: string, tag: string): string | undefined {
    // Try CDATA first
    const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
    if (cdataMatch) {
      return cdataMatch[1].trim();
    }

    // Try regular tag content
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].trim() : undefined;
  }

  private extractAtomLink(xml: string): string | undefined {
    // Look for alternate link first, then any link with href
    const altMatch = xml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i) ||
                     xml.match(/<link[^>]*href="([^"]+)"[^>]*rel="alternate"/i);
    if (altMatch) return altMatch[1];

    const hrefMatch = xml.match(/<link[^>]*href="([^"]+)"/i);
    return hrefMatch ? hrefMatch[1] : undefined;
  }

  private decodeHtml(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  }

  private stripHtml(text: string): string {
    return text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// ============================================================================
// FEED FETCHER SERVICE
// ============================================================================

export class FeedFetcher {
  private parser: FeedParser;
  private ingestor: Ingestor;
  private fetcher: HtmlFetcher;

  constructor() {
    this.parser = new FeedParser();
    this.ingestor = new Ingestor();
    this.fetcher = new HtmlFetcher();
  }

  /**
   * Fetch a single feed and return parsed items
   */
  async fetchFeed(feedUrl: string, type: FeedType, timeout = 30000): Promise<FeedItem[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TruthLedger/1.0 (Aerospace Data Verification)',
          Accept: type === 'json'
            ? 'application/json,application/feed+json'
            : 'application/rss+xml,application/atom+xml,application/xml,text/xml',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      return this.parser.parse(content, type);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Ingest all feeds from a single source
   */
  async ingestSource(
    sourceKey: string,
    sourceConfig: SourceConfig,
    maxItemsPerFeed?: number
  ): Promise<FeedResult[]> {
    const results: FeedResult[] = [];

    if (!sourceConfig.feeds || sourceConfig.feeds.length === 0) {
      return results;
    }

    const sql = getConnection();

    // Get or create source in database
    let dbSource: Source;
    const existingSources = await sql<Source[]>`
      SELECT * FROM truth_ledger_claude.sources WHERE name = ${sourceConfig.name}
    `;

    if (existingSources.length > 0) {
      dbSource = existingSources[0];
    } else {
      dbSource = await SourceManager.upsertSource({
        name: sourceConfig.name,
        sourceType: sourceConfig.sourceType,
        baseUrl: sourceConfig.baseUrl,
        baseTrust: sourceConfig.baseTrust,
        independenceClusterId: sourceConfig.independenceCluster,
        description: sourceConfig.description ?? null,
        defaultDocType: sourceConfig.defaultDocType,
        isActive: sourceConfig.active,
        tags: sourceConfig.tags ?? [],
        metadata: null,
      });
    }

    for (const feed of sourceConfig.feeds) {
      const startTime = Date.now();
      const result: FeedResult = {
        sourceKey,
        sourceName: sourceConfig.name,
        feedUrl: feed.url,
        itemsFetched: 0,
        documentsCreated: 0,
        documentsUpdated: 0,
        snippetsCreated: 0,
        errors: [],
        durationMs: 0,
      };

      try {
        // Fetch feed items
        const items = await this.fetchFeed(feed.url, feed.type);
        const maxItems = maxItemsPerFeed ?? feed.maxItems ?? 50;
        const itemsToProcess = items.slice(0, maxItems);
        result.itemsFetched = itemsToProcess.length;

        // Filter items to only new URLs
        const urls = itemsToProcess.map(item => item.url).filter(Boolean);

        if (urls.length > 0) {
          // Ingest the URLs
          const ingestResult = await this.ingestor.ingest({
            sourceId: dbSource.id,
            urls,
            docType: sourceConfig.defaultDocType,
            fetchTimeout: 30000,
            feedUrl: feed.url,
          });

          result.documentsCreated = ingestResult.documentsCreated;
          result.documentsUpdated = ingestResult.documentsUpdated;
          result.snippetsCreated = ingestResult.snippetsCreated;

          for (const error of ingestResult.errors) {
            result.errors.push(`${error.url}: ${error.error}`);
          }
        }
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : String(error));
      }

      result.durationMs = Date.now() - startTime;
      results.push(result);
    }

    return results;
  }

  /**
   * Ingest a single feed from database record
   */
  async ingestDbFeed(
    feed: SourceFeed & { sourceName: string; sourceId: string },
    maxItems?: number
  ): Promise<FeedResult> {
    const startTime = Date.now();
    const result: FeedResult = {
      sourceKey: feed.sourceId,
      sourceName: feed.sourceName,
      feedUrl: feed.feedUrl,
      itemsFetched: 0,
      documentsCreated: 0,
      documentsUpdated: 0,
      snippetsCreated: 0,
      errors: [],
      durationMs: 0,
    };

    try {
      // Fetch feed items
      const items = await this.fetchFeed(feed.feedUrl, feed.feedType as FeedType);
      const maxItemsToProcess = maxItems ?? feed.maxItems ?? 50;
      const itemsToProcess = items.slice(0, maxItemsToProcess);
      result.itemsFetched = itemsToProcess.length;

      // Filter items to only new URLs
      const urls = itemsToProcess.map(item => item.url).filter(Boolean);

      if (urls.length > 0) {
        // Ingest the URLs
        const ingestResult = await this.ingestor.ingest({
          sourceId: feed.sourceId,
          urls,
          docType: undefined, // Will use source default
          feedUrl: feed.feedUrl,
        });

        result.documentsCreated = ingestResult.documentsCreated;
        result.documentsUpdated = ingestResult.documentsUpdated;
        result.snippetsCreated = ingestResult.snippetsCreated;
        result.errors = ingestResult.errors.map(e => `${e.url}: ${e.error}`);
      }

      // Update feed status in database
      await SourceManager.updateFeedStatus(feed.id, true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      await SourceManager.updateFeedStatus(feed.id, false, errorMsg);
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }

  /**
   * Ingest all active feeds from database (primary method)
   */
  async ingestAllFeedsFromDb(options?: {
    sourceIds?: string[];
    maxItemsPerFeed?: number;
  }): Promise<FeedIngestionSummary> {
    const startedAt = new Date();
    const syncId = await SyncManager.start('feed_ingest', {
      sourceIds: options?.sourceIds,
      maxItemsPerFeed: options?.maxItemsPerFeed,
    });

    const allResults: FeedResult[] = [];

    try {
      // Get active feeds from database
      const activeFeeds = await SourceManager.getAllActiveFeeds();

      // Filter by source IDs if specified
      const feedsToProcess = options?.sourceIds
        ? activeFeeds.filter(f => options.sourceIds!.includes(f.sourceId))
        : activeFeeds;

      console.log(`\n📡 Found ${feedsToProcess.length} active feeds to process`);

      // Group feeds by source for logging
      const feedsBySource = new Map<string, typeof feedsToProcess>();
      for (const feed of feedsToProcess) {
        const existing = feedsBySource.get(feed.sourceName) ?? [];
        existing.push(feed);
        feedsBySource.set(feed.sourceName, existing);
      }

      for (const [sourceName, feeds] of feedsBySource) {
        console.log(`\n📡 Processing ${feeds.length} feeds for ${sourceName}...`);

        for (const feed of feeds) {
          const result = await this.ingestDbFeed(feed, options?.maxItemsPerFeed);
          allResults.push(result);

          if (result.errors.length > 0) {
            console.log(`  ⚠️ ${feed.feedUrl}: ${result.errors.length} errors`);
          } else {
            console.log(`  ✅ ${feed.feedUrl}: ${result.itemsFetched} items, ${result.documentsCreated} new docs`);
          }
        }
      }

      const completedAt = new Date();
      const totalRecords = allResults.reduce(
        (sum, r) => sum + r.documentsCreated + r.documentsUpdated + r.snippetsCreated,
        0
      );

      await SyncManager.complete(syncId, totalRecords);

      return {
        syncId,
        startedAt,
        completedAt,
        totalFeeds: allResults.length,
        totalItemsFetched: allResults.reduce((sum, r) => sum + r.itemsFetched, 0),
        totalDocumentsCreated: allResults.reduce((sum, r) => sum + r.documentsCreated, 0),
        totalDocumentsUpdated: allResults.reduce((sum, r) => sum + r.documentsUpdated, 0),
        totalSnippetsCreated: allResults.reduce((sum, r) => sum + r.snippetsCreated, 0),
        totalErrors: allResults.reduce((sum, r) => sum + r.errors.length, 0),
        results: allResults,
      };
    } catch (error) {
      await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Ingest all active feeds from all sources
   * @deprecated Use ingestAllFeedsFromDb() instead - this uses static SOURCE_REGISTRY
   */
  async ingestAllFeeds(options?: {
    sourceKeys?: string[];
    maxItemsPerFeed?: number;
  }): Promise<FeedIngestionSummary> {
    const startedAt = new Date();
    const syncId = await SyncManager.start('feed_ingest', {
      sourceKeys: options?.sourceKeys,
      maxItemsPerFeed: options?.maxItemsPerFeed,
    });

    const allResults: FeedResult[] = [];

    try {
      const sourcesWithFeeds = getSourcesWithFeeds();
      const sourcesToProcess = options?.sourceKeys
        ? sourcesWithFeeds.filter(s => options.sourceKeys!.includes(s.name))
        : sourcesWithFeeds;

      // Find source keys
      const sourceEntries = Object.entries(SOURCE_REGISTRY)
        .filter(([_, config]) => sourcesToProcess.some(s => s.name === config.name));

      for (const [key, config] of sourceEntries) {
        console.log(`\n📡 Processing feeds for ${config.name}...`);

        const results = await this.ingestSource(key, config, options?.maxItemsPerFeed);
        allResults.push(...results);

        for (const result of results) {
          if (result.errors.length > 0) {
            console.log(`  ⚠️ ${result.feedUrl}: ${result.errors.length} errors`);
          } else {
            console.log(`  ✅ ${result.feedUrl}: ${result.itemsFetched} items, ${result.documentsCreated} new docs`);
          }
        }
      }

      const completedAt = new Date();
      const totalRecords = allResults.reduce(
        (sum, r) => sum + r.documentsCreated + r.documentsUpdated + r.snippetsCreated,
        0
      );

      await SyncManager.complete(syncId, totalRecords);

      return {
        syncId,
        startedAt,
        completedAt,
        totalFeeds: allResults.length,
        totalItemsFetched: allResults.reduce((sum, r) => sum + r.itemsFetched, 0),
        totalDocumentsCreated: allResults.reduce((sum, r) => sum + r.documentsCreated, 0),
        totalDocumentsUpdated: allResults.reduce((sum, r) => sum + r.documentsUpdated, 0),
        totalSnippetsCreated: allResults.reduce((sum, r) => sum + r.snippetsCreated, 0),
        totalErrors: allResults.reduce((sum, r) => sum + r.errors.length, 0),
        results: allResults,
      };
    } catch (error) {
      await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
      throw error;
    }
  }

  /**
   * Get feeds that are due for refresh based on their interval (from database)
   */
  async getFeedsDueForRefreshFromDb(): Promise<Array<SourceFeed & {
    sourceName: string;
    sourceId: string;
    lastFetched?: Date;
  }>> {
    const sql = getConnection();

    // Query feeds that are due for refresh based on last_fetched_at and interval
    const dueFeeds = await sql<Array<SourceFeed & { sourceName: string; sourceId: string }>>`
      SELECT
        f.id,
        f.source_id as "sourceId",
        f.feed_url as "feedUrl",
        f.feed_type as "feedType",
        f.refresh_interval_minutes as "refreshIntervalMinutes",
        f.max_items as "maxItems",
        f.is_active as "isActive",
        f.last_fetched_at as "lastFetchedAt",
        f.last_error as "lastError",
        f.error_count as "errorCount",
        f.metadata,
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        s.name as "sourceName"
      FROM truth_ledger_claude.source_feeds f
      JOIN truth_ledger_claude.sources s ON s.id = f.source_id
      WHERE f.is_active = true
        AND s.is_active = true
        AND (
          f.last_fetched_at IS NULL
          OR f.last_fetched_at < NOW() - (f.refresh_interval_minutes * INTERVAL '1 minute')
        )
      ORDER BY f.refresh_interval_minutes ASC, f.last_fetched_at ASC NULLS FIRST
    `;

    return dueFeeds.map(feed => ({
      ...feed,
      lastFetched: feed.lastFetchedAt ?? undefined,
    }));
  }

  /**
   * Get feeds that are due for refresh based on their interval
   * @deprecated Use getFeedsDueForRefreshFromDb() instead - this uses static SOURCE_REGISTRY
   */
  async getFeedsDueForRefresh(): Promise<Array<{
    sourceKey: string;
    sourceConfig: SourceConfig;
    feedUrl: string;
    feedType: FeedType;
    lastFetched?: Date;
    intervalMinutes: number;
  }>> {
    const sql = getConnection();
    const dueFeeds: Array<{
      sourceKey: string;
      sourceConfig: SourceConfig;
      feedUrl: string;
      feedType: FeedType;
      lastFetched?: Date;
      intervalMinutes: number;
    }> = [];

    const sourcesWithFeeds = getSourcesWithFeeds();

    for (const [key, config] of Object.entries(SOURCE_REGISTRY)) {
      if (!config.active || !config.feeds) continue;

      for (const feed of config.feeds) {
        // Check last sync for this feed
        const lastSync = await sql<Array<{ completedAt: Date }>>`
          SELECT completed_at as "completedAt"
          FROM sync_status
          WHERE sync_type = 'feed_ingest'
            AND metadata->>'feedUrl' = ${feed.url}
            AND state = 'success'
          ORDER BY completed_at DESC
          LIMIT 1
        `;

        const lastFetched = lastSync.length > 0 ? lastSync[0].completedAt : undefined;
        const intervalMs = feed.refreshIntervalMinutes * 60 * 1000;
        const isDue = !lastFetched || Date.now() - lastFetched.getTime() > intervalMs;

        if (isDue) {
          dueFeeds.push({
            sourceKey: key,
            sourceConfig: config,
            feedUrl: feed.url,
            feedType: feed.type,
            lastFetched,
            intervalMinutes: feed.refreshIntervalMinutes,
          });
        }
      }
    }

    // Sort by priority (shorter intervals first)
    return dueFeeds.sort((a, b) => a.intervalMinutes - b.intervalMinutes);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const feedFetcher = new FeedFetcher();
