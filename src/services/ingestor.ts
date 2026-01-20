/**
 * Ingestor Service
 * Stage A of the Truth Ledger pipeline
 *
 * Responsibilities:
 * - Fetch documents from configured sources (HTML/PDF)
 * - Normalize and hash content
 * - Store documents with version tracking (supersedes_document_id)
 * - Split documents into snippets (evidence units)
 * - Record sync runs in sync_status
 */

import postgres from 'postgres';
import { getConnection, transaction } from '../db/connection.js';
import { SyncManager } from './sync-manager.js';
import { computeContentHash, computeSnippetHash } from '../utils/crypto.js';
import type {
  Document,
  Snippet,
  Source,
  SourceFeed,
  SourceUrl,
  DocType,
  SnippetType,
  CreateSourceInput,
  UpdateSourceInput,
  CreateFeedInput,
  UpdateFeedInput,
  CreateUrlInput,
} from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface IngestConfig {
  sourceId: string;
  urls: string[];
  docType?: DocType;
  fetchTimeout?: number;
  feedUrl?: string; // Track which feed this document came from
}

export interface IngestResult {
  syncId: number;
  documentsCreated: number;
  documentsUpdated: number;
  snippetsCreated: number;
  errors: Array<{ url: string; error: string }>;
}

export interface FetchedDocument {
  url: string;
  title: string;
  content: string;
  publishedAt?: Date;
  versionLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface SnippetCandidate {
  locator: string;
  text: string;
  snippetType: SnippetType;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DOCUMENT FETCHER
// ============================================================================

/**
 * Base class for document fetchers.
 * Extend this for specific source types (HTML, PDF, API, etc.)
 */
export abstract class DocumentFetcher {
  abstract fetch(url: string, timeout?: number): Promise<FetchedDocument>;
}

/**
 * Simple HTML fetcher that extracts main content
 */
export class HtmlFetcher extends DocumentFetcher {
  async fetch(url: string, timeout = 30000): Promise<FetchedDocument> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TruthLedger/1.0 (Aerospace Data Verification)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const { title, content } = this.extractMainContent(html);

      return {
        url,
        title: title || this.extractTitleFromUrl(url),
        content,
        publishedAt: this.extractPublishedDate(html),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Extract main content from HTML.
   * This is a simplified version - in production, use a library like @mozilla/readability
   */
  private extractMainContent(html: string): { title: string; content: string } {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Remove scripts, styles, and navigation
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

    // Try to find main content area
    const mainMatch = content.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                      content.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                      content.match(/<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    if (mainMatch) {
      content = mainMatch[1];
    }

    // Strip remaining HTML tags and normalize whitespace
    content = content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
      .replace(/\s+/g, ' ')
      .trim();

    return { title, content };
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/').filter(Boolean).pop() || '';
      return path.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
    } catch {
      return url;
    }
  }

  private extractPublishedDate(html: string): Date | undefined {
    // Try common date meta tags
    const datePatterns = [
      /<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="date"[^>]*content="([^"]+)"/i,
      /<meta[^>]*name="DC\.date"[^>]*content="([^"]+)"/i,
      /<time[^>]*datetime="([^"]+)"/i,
    ];

    for (const pattern of datePatterns) {
      const match = html.match(pattern);
      if (match) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }
}

// ============================================================================
// SNIPPETIZER
// ============================================================================

/**
 * Split document content into evidence units (snippets)
 */
export class Snippetizer {
  private minSnippetLength = 50;
  private maxSnippetLength = 2000;

  /**
   * Split content into snippets based on structure
   */
  snippetize(content: string, documentUrl: string): SnippetCandidate[] {
    const snippets: SnippetCandidate[] = [];

    // Split by paragraphs (double newlines or period followed by capital)
    const paragraphs = this.splitIntoParagraphs(content);

    let paragraphIndex = 0;
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();

      if (trimmed.length < this.minSnippetLength) {
        continue;
      }

      // Detect snippet type
      const snippetType = this.detectSnippetType(trimmed);

      // Create locator (stable reference)
      const locator = this.createLocator(documentUrl, paragraphIndex, trimmed);

      // Split long paragraphs if needed
      if (trimmed.length > this.maxSnippetLength) {
        const subSnippets = this.splitLongParagraph(trimmed, locator);
        snippets.push(...subSnippets.map((s, i) => ({
          locator: `${locator}:${i}`,
          text: s,
          snippetType,
        })));
      } else {
        snippets.push({
          locator,
          text: trimmed,
          snippetType,
        });
      }

      paragraphIndex++;
    }

    return snippets;
  }

  private splitIntoParagraphs(content: string): string[] {
    // Split on double newlines, or sentences that look like paragraph breaks
    return content
      .split(/\n\n+|\r\n\r\n+/)
      .flatMap(p => {
        // Further split very long blocks that might be concatenated paragraphs
        if (p.length > 1000) {
          return p.split(/(?<=[.!?])\s+(?=[A-Z])/);
        }
        return [p];
      })
      .filter(p => p.trim().length > 0);
  }

  private detectSnippetType(text: string): SnippetType {
    // Check for table-like patterns
    if (/\|.*\|/.test(text) || /\t.*\t.*\t/.test(text)) {
      return 'table';
    }

    // Check for list patterns
    if (/^[\s]*[-•*]\s/.test(text) || /^[\s]*\d+[.)]\s/.test(text)) {
      return 'list';
    }

    // Check for equations (very basic)
    if (/[=<>]\s*\d+.*[=<>]/.test(text) || /\b(sin|cos|tan|log|ln|sqrt)\b/.test(text)) {
      return 'equation';
    }

    return 'text';
  }

  private createLocator(url: string, index: number, text: string): string {
    // Create a stable locator using content fingerprint
    const fingerprint = text.substring(0, 50).replace(/\s+/g, ' ').trim();
    return `${new URL(url).pathname}#p${index}:${fingerprint.substring(0, 20)}`;
  }

  private splitLongParagraph(text: string, baseLocator: string): string[] {
    const sentences: string[] = [];
    let current = '';

    // Split by sentence boundaries
    const parts = text.split(/(?<=[.!?])\s+/);

    for (const part of parts) {
      if ((current + ' ' + part).length > this.maxSnippetLength && current.length > 0) {
        sentences.push(current.trim());
        current = part;
      } else {
        current = current ? `${current} ${part}` : part;
      }
    }

    if (current.length >= this.minSnippetLength) {
      sentences.push(current.trim());
    }

    return sentences;
  }
}

// ============================================================================
// INGESTOR SERVICE
// ============================================================================

export class Ingestor {
  private fetcher: DocumentFetcher;
  private snippetizer: Snippetizer;

  constructor(fetcher?: DocumentFetcher) {
    this.fetcher = fetcher || new HtmlFetcher();
    this.snippetizer = new Snippetizer();
  }

  /**
   * Ingest documents from a source
   */
  async ingest(config: IngestConfig): Promise<IngestResult> {
    const sql = getConnection();
    const syncId = await SyncManager.start('truth_ingest', {
      sourceId: config.sourceId,
      urlCount: config.urls.length,
    });

    const result: IngestResult = {
      syncId,
      documentsCreated: 0,
      documentsUpdated: 0,
      snippetsCreated: 0,
      errors: [],
    };

    try {
      // Verify source exists
      const sources = await sql<Source[]>`
        SELECT * FROM truth_ledger_claude.sources WHERE id = ${config.sourceId}
      `;

      if (sources.length === 0) {
        throw new Error(`Source not found: ${config.sourceId}`);
      }

      const source = sources[0];

      // Process each URL
      for (const url of config.urls) {
        try {
          const docResult = await this.ingestUrl(
            url,
            source,
            config.docType || 'other',
            config.fetchTimeout,
            config.feedUrl
          );

          if (docResult.created) {
            result.documentsCreated++;
          } else if (docResult.updated) {
            result.documentsUpdated++;
          }
          result.snippetsCreated += docResult.snippetsCreated;
        } catch (error) {
          result.errors.push({
            url,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const totalRecords = result.documentsCreated + result.documentsUpdated + result.snippetsCreated;
      await SyncManager.complete(syncId, totalRecords);

    } catch (error) {
      await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
      throw error;
    }

    return result;
  }

  /**
   * Ingest a single URL
   */
  private async ingestUrl(
    url: string,
    source: Source,
    docType: DocType,
    timeout?: number,
    feedUrl?: string
  ): Promise<{ created: boolean; updated: boolean; snippetsCreated: number }> {
    // Fetch the document
    const fetched = await this.fetcher.fetch(url, timeout);

    // Merge feedUrl into metadata if provided
    const metadata = feedUrl
      ? { ...(fetched.metadata || {}), feedUrl }
      : fetched.metadata;

    // Compute content hash
    const contentHash = computeContentHash(fetched.content);

    return await transaction(async (sql) => {
      // Check if document with same source and hash already exists
      const existing = await sql<Document[]>`
        SELECT id, content_hash FROM truth_ledger_claude.documents
        WHERE source_id = ${source.id} AND content_hash = ${contentHash}
      `;

      if (existing.length > 0) {
        // Document already exists with same content - no update needed
        return { created: false, updated: false, snippetsCreated: 0 };
      }

      // Check if there's a previous version (same URL, different hash)
      const previousVersions = await sql<Document[]>`
        SELECT id FROM truth_ledger_claude.documents
        WHERE source_id = ${source.id} AND url = ${url}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const supersedesId = previousVersions.length > 0 ? previousVersions[0].id : null;

      // Insert new document
      const insertedDocs = await sql<Document[]>`
        INSERT INTO truth_ledger_claude.documents (
          source_id,
          title,
          url,
          version_label,
          doc_type,
          published_at,
          retrieved_at,
          content_hash,
          raw_content,
          supersedes_document_id,
          metadata
        ) VALUES (
          ${source.id},
          ${fetched.title},
          ${url},
          ${fetched.versionLabel || null},
          ${docType},
          ${fetched.publishedAt || null},
          NOW(),
          ${contentHash},
          ${fetched.content},
          ${supersedesId},
          ${metadata ? sql.json(metadata as postgres.JSONValue) : null}
        )
        RETURNING *
      `;

      const document = insertedDocs[0];
      const isUpdate = supersedesId !== null;

      // Snippetize the content
      const snippetCandidates = this.snippetizer.snippetize(fetched.content, url);
      let snippetsCreated = 0;

      for (const candidate of snippetCandidates) {
        const snippetHash = computeSnippetHash(candidate.locator, candidate.text);

        // Insert snippet (ignore duplicates)
        const inserted = await sql<Snippet[]>`
          INSERT INTO truth_ledger_claude.snippets (
            document_id,
            locator,
            text,
            snippet_hash,
            snippet_type,
            metadata
          ) VALUES (
            ${document.id},
            ${candidate.locator},
            ${candidate.text},
            ${snippetHash},
            ${candidate.snippetType},
            ${candidate.metadata ? sql.json(candidate.metadata as postgres.JSONValue) : null}
          )
          ON CONFLICT (document_id, snippet_hash) DO NOTHING
          RETURNING id
        `;

        if (inserted.length > 0) {
          snippetsCreated++;
        }
      }

      return {
        created: !isUpdate,
        updated: isUpdate,
        snippetsCreated,
      };
    });
  }

  /**
   * Get pending documents that need processing
   */
  async getPendingDocuments(limit = 100): Promise<Document[]> {
    const sql = getConnection();

    // Documents that have snippets but no claims yet
    return await sql<Document[]>`
      SELECT DISTINCT d.*
      FROM truth_ledger_claude.documents d
      JOIN truth_ledger_claude.snippets s ON s.document_id = d.id
      LEFT JOIN truth_ledger_claude.evidence e ON e.snippet_id = s.id
      WHERE e.id IS NULL
      ORDER BY d.created_at ASC
      LIMIT ${limit}
    `;
  }
}

// ============================================================================
// SOURCE MANAGEMENT
// ============================================================================

export class SourceManager {
  /**
   * Create or update a source
   */
  static async upsertSource(source: Omit<Source, 'id' | 'createdAt' | 'updatedAt' | 'feeds' | 'urls'>): Promise<Source> {
    const sql = getConnection();

    const result = await sql<Source[]>`
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
        ${source.name},
        ${source.sourceType},
        ${source.baseUrl || null},
        ${source.baseTrust},
        ${source.independenceClusterId || null},
        ${source.description || null},
        ${source.defaultDocType || null},
        ${source.isActive ?? true},
        ${source.tags || []},
        ${source.metadata ? sql.json(source.metadata as postgres.JSONValue) : null}
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
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Create a new source
   */
  static async createSource(input: CreateSourceInput): Promise<Source> {
    const sql = getConnection();
    const result = await sql<Source[]>`
      INSERT INTO truth_ledger_claude.sources (
        name, source_type, base_url, base_trust, independence_cluster_id,
        description, default_doc_type, is_active, tags
      ) VALUES (
        ${input.name},
        ${input.sourceType},
        ${input.baseUrl || null},
        ${input.baseTrust},
        ${input.independenceClusterId || null},
        ${input.description || null},
        ${input.defaultDocType || null},
        ${input.isActive ?? true},
        ${input.tags || []}
      )
      RETURNING *
    `;
    return result[0];
  }

  /**
   * Update a source
   */
  static async updateSource(id: string, input: UpdateSourceInput): Promise<Source | null> {
    const sql = getConnection();
    const result = await sql<Source[]>`
      UPDATE truth_ledger_claude.sources SET
        name = COALESCE(${input.name ?? null}, name),
        source_type = COALESCE(${input.sourceType ?? null}, source_type),
        base_url = CASE WHEN ${input.baseUrl !== undefined} THEN ${input.baseUrl ?? null} ELSE base_url END,
        base_trust = COALESCE(${input.baseTrust ?? null}, base_trust),
        independence_cluster_id = CASE WHEN ${input.independenceClusterId !== undefined} THEN ${input.independenceClusterId ?? null} ELSE independence_cluster_id END,
        description = CASE WHEN ${input.description !== undefined} THEN ${input.description ?? null} ELSE description END,
        default_doc_type = CASE WHEN ${input.defaultDocType !== undefined} THEN ${input.defaultDocType ?? null} ELSE default_doc_type END,
        is_active = COALESCE(${input.isActive ?? null}, is_active),
        tags = COALESCE(${input.tags ?? null}, tags),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] || null;
  }

  /**
   * Delete a source (cascades to feeds, urls, documents, etc.)
   */
  static async deleteSource(id: string): Promise<boolean> {
    const sql = getConnection();
    const result = await sql`
      DELETE FROM truth_ledger_claude.sources WHERE id = ${id}
    `;
    return result.count > 0;
  }

  /**
   * Toggle source active status
   */
  static async toggleSource(id: string): Promise<Source | null> {
    const sql = getConnection();
    const result = await sql<Source[]>`
      UPDATE truth_ledger_claude.sources SET
        is_active = NOT is_active,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] || null;
  }

  /**
   * Get all sources with optional filters (includes feeds and URLs)
   */
  static async getSources(filters?: { isActive?: boolean; type?: string }): Promise<Source[]> {
    const sql = getConnection();
    const sources = await sql<Source[]>`
      SELECT * FROM truth_ledger_claude.sources
      WHERE (${filters?.isActive ?? null}::boolean IS NULL OR is_active = ${filters?.isActive ?? null})
        AND (${filters?.type ?? null}::text IS NULL OR source_type = ${filters?.type ?? null})
      ORDER BY name
    `;

    // Fetch feeds and URLs for each source
    for (const source of sources) {
      source.feeds = await this.getFeeds(source.id);
      source.urls = await this.getUrls(source.id);
    }

    return sources;
  }

  /**
   * Get source by ID with feeds and URLs
   */
  static async getSource(id: string): Promise<Source | null> {
    const sql = getConnection();
    const result = await sql<Source[]>`
      SELECT * FROM truth_ledger_claude.sources WHERE id = ${id}
    `;
    if (!result[0]) return null;

    const source = result[0];
    source.feeds = await this.getFeeds(id);
    source.urls = await this.getUrls(id);
    return source;
  }

  // ============================================================================
  // FEED MANAGEMENT
  // ============================================================================

  /**
   * Get feeds for a source
   */
  static async getFeeds(sourceId: string): Promise<SourceFeed[]> {
    const sql = getConnection();
    return await sql<SourceFeed[]>`
      SELECT * FROM truth_ledger_claude.source_feeds
      WHERE source_id = ${sourceId}
      ORDER BY created_at
    `;
  }

  /**
   * Create a feed
   */
  static async createFeed(sourceId: string, input: CreateFeedInput): Promise<SourceFeed> {
    const sql = getConnection();
    const result = await sql<SourceFeed[]>`
      INSERT INTO truth_ledger_claude.source_feeds (
        source_id, feed_url, feed_type, refresh_interval_minutes, max_items, is_active
      ) VALUES (
        ${sourceId},
        ${input.feedUrl},
        ${input.feedType},
        ${input.refreshIntervalMinutes ?? 60},
        ${input.maxItems ?? 50},
        ${input.isActive ?? true}
      )
      RETURNING *
    `;
    return result[0];
  }

  /**
   * Update a feed
   */
  static async updateFeed(id: string, input: UpdateFeedInput): Promise<SourceFeed | null> {
    const sql = getConnection();
    const result = await sql<SourceFeed[]>`
      UPDATE truth_ledger_claude.source_feeds SET
        feed_url = COALESCE(${input.feedUrl ?? null}, feed_url),
        feed_type = COALESCE(${input.feedType ?? null}, feed_type),
        refresh_interval_minutes = COALESCE(${input.refreshIntervalMinutes ?? null}, refresh_interval_minutes),
        max_items = COALESCE(${input.maxItems ?? null}, max_items),
        is_active = COALESCE(${input.isActive ?? null}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] || null;
  }

  /**
   * Delete a feed
   */
  static async deleteFeed(id: string): Promise<boolean> {
    const sql = getConnection();
    const result = await sql`
      DELETE FROM truth_ledger_claude.source_feeds WHERE id = ${id}
    `;
    return result.count > 0;
  }

  /**
   * Toggle feed active status
   */
  static async toggleFeed(id: string): Promise<SourceFeed | null> {
    const sql = getConnection();
    const result = await sql<SourceFeed[]>`
      UPDATE truth_ledger_claude.source_feeds SET
        is_active = NOT is_active,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result[0] || null;
  }

  /**
   * Get all active feeds (for FeedFetcher)
   */
  static async getAllActiveFeeds(): Promise<Array<SourceFeed & { sourceName: string; sourceId: string; baseTrust: number; defaultDocType: string | null }>> {
    const sql = getConnection();
    return await sql`
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
        s.name as "sourceName",
        s.base_trust as "baseTrust",
        s.default_doc_type as "defaultDocType"
      FROM truth_ledger_claude.source_feeds f
      JOIN truth_ledger_claude.sources s ON s.id = f.source_id
      WHERE f.is_active = true AND s.is_active = true
      ORDER BY f.refresh_interval_minutes, f.last_fetched_at NULLS FIRST
    `;
  }

  /**
   * Update feed fetch status
   */
  static async updateFeedStatus(id: string, success: boolean, error?: string): Promise<void> {
    const sql = getConnection();
    if (success) {
      await sql`
        UPDATE truth_ledger_claude.source_feeds SET
          last_fetched_at = NOW(),
          last_error = NULL,
          error_count = 0,
          updated_at = NOW()
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE truth_ledger_claude.source_feeds SET
          last_error = ${error ?? 'Unknown error'},
          error_count = error_count + 1,
          updated_at = NOW()
        WHERE id = ${id}
      `;
    }
  }

  // ============================================================================
  // URL MANAGEMENT
  // ============================================================================

  /**
   * Get URLs for a source
   */
  static async getUrls(sourceId: string): Promise<SourceUrl[]> {
    const sql = getConnection();
    return await sql<SourceUrl[]>`
      SELECT * FROM truth_ledger_claude.source_urls
      WHERE source_id = ${sourceId}
      ORDER BY created_at
    `;
  }

  /**
   * Create a URL
   */
  static async createUrl(sourceId: string, input: CreateUrlInput): Promise<SourceUrl> {
    const sql = getConnection();
    const result = await sql<SourceUrl[]>`
      INSERT INTO truth_ledger_claude.source_urls (source_id, url, is_active)
      VALUES (${sourceId}, ${input.url}, ${input.isActive ?? true})
      RETURNING *
    `;
    return result[0];
  }

  /**
   * Delete a URL
   */
  static async deleteUrl(id: string): Promise<boolean> {
    const sql = getConnection();
    const result = await sql`
      DELETE FROM truth_ledger_claude.source_urls WHERE id = ${id}
    `;
    return result.count > 0;
  }

  /**
   * Get all active URLs (for Ingestor)
   */
  static async getAllActiveUrls(): Promise<Array<SourceUrl & { sourceName: string; baseTrust: number; defaultDocType: string | null }>> {
    const sql = getConnection();
    return await sql`
      SELECT u.*, s.name as source_name, s.base_trust, s.default_doc_type
      FROM truth_ledger_claude.source_urls u
      JOIN truth_ledger_claude.sources s ON s.id = u.source_id
      WHERE u.is_active = true AND s.is_active = true
      ORDER BY u.created_at
    `;
  }
}
