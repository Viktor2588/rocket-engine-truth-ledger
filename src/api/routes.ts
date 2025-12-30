/**
 * Truth Ledger API Routes
 * REST endpoints for fact resolution and data management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { FactResolver } from '../services/fact-resolver.js';
import { Scorer } from '../services/scorer.js';
import { ConflictDetector } from '../services/conflict-detector.js';
import { Extractor } from '../services/extractor.js';
import { Deriver } from '../services/deriver.js';
import { FeedFetcher } from '../services/feed-fetcher.js';
import { SourceManager } from '../services/ingestor.js';
import { getConnection } from '../db/connection.js';
import {
  SOURCE_REGISTRY,
  getActiveSources,
  getSourcesWithFeeds,
  getTotalFeedCount,
  getFeedRefreshSchedule,
} from '../config/sources.js';
import type {
  Entity,
  ConflictGroup,
  CreateSourceInput,
  UpdateSourceInput,
  CreateFeedInput,
  UpdateFeedInput,
  CreateUrlInput,
} from '../types/index.js';

const router = Router();
const factResolver = new FactResolver();

// ============================================================================
// ERROR HANDLER
// ============================================================================

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================================
// FACT RESOLUTION ENDPOINTS
// ============================================================================

/**
 * GET /facts/:claimKeyHash
 * Resolve a fact by claim_key_hash
 */
router.get('/facts/:claimKeyHash', asyncHandler(async (req, res) => {
  const { claimKeyHash } = req.params;
  const slider = parseFloat(req.query.truth_slider as string) || 0.5;

  const response = await factResolver.resolve({
    claimKeyHash,
    truthSlider: slider,
  });

  res.json(response);
}));

/**
 * GET /entities/:entityType/:domainId/field/:fieldName
 * Resolve a fact by domain object + field
 * Example: GET /entities/engine/123/field/engines.isp_s
 */
router.get('/entities/:entityType/:domainId/field/:fieldName', asyncHandler(async (req, res) => {
  const { entityType, domainId, fieldName } = req.params;
  const slider = parseFloat(req.query.truth_slider as string) || 0.5;

  const response = await factResolver.resolve({
    entityType: entityType as any,
    domainId: parseInt(domainId, 10),
    fieldName: decodeURIComponent(fieldName),
    truthSlider: slider,
  });

  res.json(response);
}));

/**
 * GET /entities/:entityId/facts
 * Get all facts for an entity
 */
router.get('/entities/:entityId/facts', asyncHandler(async (req, res) => {
  const { entityId } = req.params;
  const slider = parseFloat(req.query.truth_slider as string) || 0.5;

  const response = await factResolver.getEntityFacts(entityId, slider);

  res.json(response);
}));

// ============================================================================
// ENTITY ENDPOINTS
// ============================================================================

// Entity column selection with aliases
const entityColumns = `
  id,
  entity_type as "entityType",
  canonical_name as "canonicalName",
  engine_id as "engineId",
  launch_vehicle_id as "launchVehicleId",
  country_id as "countryId",
  aliases,
  metadata,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

// Conflict group column selection with aliases
const cgColumns = `
  id,
  claim_key_hash as "claimKeyHash",
  entity_id as "entityId",
  attribute_id as "attributeId",
  scope_json as "scopeJson",
  conflict_present as "conflictPresent",
  status_factual as "statusFactual",
  claim_count as "claimCount",
  metadata,
  created_at as "createdAt",
  updated_at as "updatedAt"
`;

/**
 * GET /entities
 * List entities with optional filtering
 */
router.get('/entities', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { type, name, limit = '100', offset = '0' } = req.query;

  let entities: Entity[];

  if (type) {
    entities = await sql<Entity[]>`
      SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities
      WHERE entity_type = ${type as string}
      ORDER BY canonical_name
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else if (name) {
    entities = await sql<Entity[]>`
      SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities
      WHERE canonical_name ILIKE ${'%' + name + '%'}
      ORDER BY canonical_name
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else {
    entities = await sql<Entity[]>`
      SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities
      ORDER BY canonical_name
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  }

  res.json({ entities, count: entities.length });
}));

/**
 * GET /entities/:entityId
 * Get entity by ID
 */
router.get('/entities/:entityId', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { entityId } = req.params;

  const entities = await sql<Entity[]>`
    SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities WHERE id = ${entityId}
  `;

  if (entities.length === 0) {
    res.status(404).json({ error: 'Entity not found' });
    return;
  }

  res.json(entities[0]);
}));

// ============================================================================
// CONFLICT GROUP ENDPOINTS
// ============================================================================

/**
 * GET /conflict-groups
 * List conflict groups with optional filtering
 */
router.get('/conflict-groups', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { entity_id, has_conflict, status, limit = '100', offset = '0' } = req.query;

  let groups: ConflictGroup[];

  if (entity_id) {
    groups = await sql<ConflictGroup[]>`
      SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
      WHERE entity_id = ${entity_id as string}
      ORDER BY updated_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else if (has_conflict === 'true') {
    groups = await sql<ConflictGroup[]>`
      SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
      WHERE conflict_present = true
      ORDER BY updated_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else if (status) {
    groups = await sql<ConflictGroup[]>`
      SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
      WHERE status_factual = ${status as string}
      ORDER BY updated_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else {
    groups = await sql<ConflictGroup[]>`
      SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
      ORDER BY updated_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  }

  res.json({ conflictGroups: groups, count: groups.length });
}));

/**
 * GET /conflict-groups/:id
 * Get conflict group with claims
 */
router.get('/conflict-groups/:id', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { id } = req.params;

  const groups = await sql<ConflictGroup[]>`
    SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups WHERE id = ${id}
  `;

  if (groups.length === 0) {
    res.status(404).json({ error: 'Conflict group not found' });
    return;
  }

  const group = groups[0];

  // Get claims and metrics with proper column aliases
  const claims = await sql`
    SELECT
      c.id,
      c.claim_key_hash as "claimKeyHash",
      c.entity_id as "entityId",
      c.attribute_id as "attributeId",
      c.value_json as "valueJson",
      c.unit,
      c.scope_json as "scopeJson",
      c.valid_from as "validFrom",
      c.valid_to as "validTo",
      c.is_derived as "isDerived",
      c.derived_from_claim_id as "derivedFromClaimId",
      c.parser_notes as "parserNotes",
      c.metadata,
      c.created_at as "createdAt",
      c.updated_at as "updatedAt",
      tm.truth_raw as "truthRaw",
      tm.support_score as "supportScore",
      tm.contradiction_score as "contradictionScore",
      tm.independent_sources as "independentSources"
    FROM truth_ledger_claude.claims c
    LEFT JOIN truth_ledger_claude.truth_metrics tm ON tm.claim_id = c.id
    WHERE c.claim_key_hash = ${group.claimKeyHash}
    ORDER BY tm.truth_raw DESC NULLS LAST
  `;

  res.json({
    conflictGroup: group,
    claims,
  });
}));

/**
 * GET /conflict-groups/:entityId/summary
 * Get conflict summary for an entity
 */
router.get('/entities/:entityId/conflicts', asyncHandler(async (req, res) => {
  const { entityId } = req.params;
  const detector = new ConflictDetector();

  const summary = await detector.getEntityConflictSummary(entityId);

  res.json(summary);
}));

// ============================================================================
// SOURCE ENDPOINTS
// ============================================================================

/**
 * GET /sources
 * List all sources
 */
router.get('/sources', asyncHandler(async (req, res) => {
  const sources = await SourceManager.getSources();
  res.json({ sources, count: sources.length });
}));

/**
 * GET /sources/:id
 * Get source by ID with feeds and URLs
 */
router.get('/sources/:id', asyncHandler(async (req, res) => {
  const source = await SourceManager.getSource(req.params.id);

  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }

  res.json(source);
}));

/**
 * POST /sources
 * Create a new source
 */
router.post('/sources', asyncHandler(async (req, res) => {
  const input = req.body as CreateSourceInput;

  if (!input.name || !input.sourceType || input.baseTrust === undefined) {
    res.status(400).json({ error: 'Missing required fields: name, sourceType, baseTrust' });
    return;
  }

  try {
    const source = await SourceManager.createSource(input);
    res.status(201).json(source);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      res.status(409).json({ error: 'Source with this name already exists' });
      return;
    }
    throw error;
  }
}));

/**
 * PUT /sources/:id
 * Update a source
 */
router.put('/sources/:id', asyncHandler(async (req, res) => {
  const input = req.body as UpdateSourceInput;
  const source = await SourceManager.updateSource(req.params.id, input);

  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }

  res.json(source);
}));

/**
 * DELETE /sources/:id
 * Delete a source (cascades to all related data)
 */
router.delete('/sources/:id', asyncHandler(async (req, res) => {
  const deleted = await SourceManager.deleteSource(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }

  res.json({ success: true, message: 'Source and all related data deleted' });
}));

/**
 * PATCH /sources/:id/toggle
 * Toggle source active status
 */
router.patch('/sources/:id/toggle', asyncHandler(async (req, res) => {
  const source = await SourceManager.toggleSource(req.params.id);

  if (!source) {
    res.status(404).json({ error: 'Source not found' });
    return;
  }

  res.json(source);
}));

// ============================================================================
// FEED ENDPOINTS
// ============================================================================

/**
 * GET /sources/:sourceId/feeds
 * Get feeds for a source
 */
router.get('/sources/:sourceId/feeds', asyncHandler(async (req, res) => {
  const feeds = await SourceManager.getFeeds(req.params.sourceId);
  res.json({ feeds, count: feeds.length });
}));

/**
 * POST /sources/:sourceId/feeds
 * Add a feed to a source
 */
router.post('/sources/:sourceId/feeds', asyncHandler(async (req, res) => {
  const input = req.body as CreateFeedInput;

  if (!input.feedUrl || !input.feedType) {
    res.status(400).json({ error: 'Missing required fields: feedUrl, feedType' });
    return;
  }

  try {
    const feed = await SourceManager.createFeed(req.params.sourceId, input);
    res.status(201).json(feed);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      res.status(409).json({ error: 'Feed URL already exists for this source' });
      return;
    }
    if (error instanceof Error && error.message.includes('foreign key')) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    throw error;
  }
}));

/**
 * PUT /feeds/:id
 * Update a feed
 */
router.put('/feeds/:id', asyncHandler(async (req, res) => {
  const input = req.body as UpdateFeedInput;
  const feed = await SourceManager.updateFeed(req.params.id, input);

  if (!feed) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }

  res.json(feed);
}));

/**
 * DELETE /feeds/:id
 * Delete a feed
 */
router.delete('/feeds/:id', asyncHandler(async (req, res) => {
  const deleted = await SourceManager.deleteFeed(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }

  res.json({ success: true });
}));

/**
 * PATCH /feeds/:id/toggle
 * Toggle feed active status
 */
router.patch('/feeds/:id/toggle', asyncHandler(async (req, res) => {
  const feed = await SourceManager.toggleFeed(req.params.id);

  if (!feed) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }

  res.json(feed);
}));

// ============================================================================
// URL ENDPOINTS
// ============================================================================

/**
 * GET /sources/:sourceId/urls
 * Get static URLs for a source
 */
router.get('/sources/:sourceId/urls', asyncHandler(async (req, res) => {
  const urls = await SourceManager.getUrls(req.params.sourceId);
  res.json({ urls, count: urls.length });
}));

/**
 * POST /sources/:sourceId/urls
 * Add a static URL to a source
 */
router.post('/sources/:sourceId/urls', asyncHandler(async (req, res) => {
  const input = req.body as CreateUrlInput;

  if (!input.url) {
    res.status(400).json({ error: 'Missing required field: url' });
    return;
  }

  try {
    const url = await SourceManager.createUrl(req.params.sourceId, input);
    res.status(201).json(url);
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      res.status(409).json({ error: 'URL already exists for this source' });
      return;
    }
    if (error instanceof Error && error.message.includes('foreign key')) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    throw error;
  }
}));

/**
 * DELETE /urls/:id
 * Delete a static URL
 */
router.delete('/urls/:id', asyncHandler(async (req, res) => {
  const deleted = await SourceManager.deleteUrl(req.params.id);

  if (!deleted) {
    res.status(404).json({ error: 'URL not found' });
    return;
  }

  res.json({ success: true });
}));

// ============================================================================
// METRICS ENDPOINTS
// ============================================================================

/**
 * GET /metrics/:claimId
 * Get truth metrics for a claim
 */
router.get('/metrics/:claimId', asyncHandler(async (req: Request, res: Response) => {
  const metrics = await Scorer.getMetrics(req.params.claimId);

  if (!metrics) {
    res.status(404).json({ error: 'Metrics not found' });
    return;
  }

  res.json(metrics);
}));

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  try {
    await sql`SELECT 1 as ok`;
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}));

/**
 * GET /stats
 * Get system statistics
 */
router.get('/stats', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  const stats = await sql`
    SELECT
      (SELECT COUNT(*) FROM truth_ledger_claude.sources) as source_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.documents) as document_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.snippets) as snippet_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.entities) as entity_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.attributes) as attribute_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.conflict_groups) as conflict_group_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.claims) as claim_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.evidence) as evidence_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.truth_metrics) as metrics_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.field_links) as field_link_count,
      (SELECT COUNT(*) FROM truth_ledger_claude.conflict_groups WHERE conflict_present = true) as active_conflicts,
      (SELECT COUNT(*) FROM truth_ledger_claude.review_queue WHERE status = 'pending') as pending_reviews
  `;

  res.json(stats[0]);
}));

// ============================================================================
// REVIEW QUEUE ENDPOINTS
// ============================================================================

// Review queue item type
interface ReviewQueueItem {
  id: string;
  itemType: string;
  itemId: string;
  reason: string;
  priority: number;
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  notes: string | null;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
}

// Review queue columns with aliases
const reviewColumns = `
  id,
  item_type as "itemType",
  item_id as "itemId",
  reason,
  priority,
  status,
  notes,
  resolved_at as "resolvedAt",
  resolved_by as "resolvedBy",
  created_at as "createdAt"
`;

/**
 * GET /review-queue
 * List review queue items with filtering
 */
router.get('/review-queue', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { status = 'pending', item_type, priority, limit = '50', offset = '0' } = req.query;

  let items: ReviewQueueItem[];

  if (item_type) {
    items = await sql<ReviewQueueItem[]>`
      SELECT ${sql.unsafe(reviewColumns)} FROM truth_ledger_claude.review_queue
      WHERE status = ${status as string}
        AND item_type = ${item_type as string}
      ORDER BY priority DESC, created_at ASC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else if (priority) {
    items = await sql<ReviewQueueItem[]>`
      SELECT ${sql.unsafe(reviewColumns)} FROM truth_ledger_claude.review_queue
      WHERE status = ${status as string}
        AND priority >= ${parseInt(priority as string)}
      ORDER BY priority DESC, created_at ASC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else {
    items = await sql<ReviewQueueItem[]>`
      SELECT ${sql.unsafe(reviewColumns)} FROM truth_ledger_claude.review_queue
      WHERE status = ${status as string}
      ORDER BY priority DESC, created_at ASC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  }

  res.json({ items, count: items.length });
}));

/**
 * GET /review-queue/stats
 * Get review queue statistics
 * NOTE: Must be defined before /:id route
 */
router.get('/review-queue/stats', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  const stats = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int as pending_count,
      COUNT(*) FILTER (WHERE status = 'in_review')::int as in_review_count,
      COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved_count,
      COUNT(*) FILTER (WHERE status = 'dismissed')::int as dismissed_count,
      COUNT(*) FILTER (WHERE status = 'pending' AND priority >= 8)::int as high_priority_count,
      ROUND((AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL))::numeric, 2) as avg_resolution_hours
    FROM truth_ledger_claude.review_queue
  `;

  res.json(stats[0]);
}));

/**
 * GET /review-queue/:id
 * Get review queue item with related data
 */
router.get('/review-queue/:id', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { id } = req.params;

  const items = await sql<ReviewQueueItem[]>`
    SELECT ${sql.unsafe(reviewColumns)} FROM truth_ledger_claude.review_queue WHERE id = ${id}
  `;

  if (items.length === 0) {
    res.status(404).json({ error: 'Review item not found' });
    return;
  }

  const item = items[0];
  let relatedData: unknown = null;

  // Fetch related data based on item type
  if (item.itemType === 'conflict_group') {
    const groups = await sql<ConflictGroup[]>`
      SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups WHERE id = ${item.itemId}
    `;
    if (groups.length > 0) {
      const claims = await sql`
        SELECT
          c.id,
          c.claim_key_hash as "claimKeyHash",
          c.value_json as "valueJson",
          c.unit,
          c.scope_json as "scopeJson",
          c.created_at as "createdAt",
          tm.truth_raw as "truthRaw",
          tm.support_score as "supportScore",
          tm.contradiction_score as "contradictionScore",
          tm.independent_sources as "independentSources"
        FROM truth_ledger_claude.claims c
        LEFT JOIN truth_ledger_claude.truth_metrics tm ON tm.claim_id = c.id
        WHERE c.claim_key_hash = ${groups[0].claimKeyHash}
        ORDER BY tm.truth_raw DESC NULLS LAST
      `;
      relatedData = { conflictGroup: groups[0], claims };
    }
  }

  res.json({ item, relatedData });
}));

/**
 * PATCH /review-queue/:id
 * Update review queue item status
 */
router.patch('/review-queue/:id', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { id } = req.params;
  const { status, resolvedBy, notes, resolution } = req.body;

  // Validate status
  const validStatuses = ['pending', 'in_review', 'resolved', 'dismissed'];
  if (status && !validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status. Must be: pending, in_review, resolved, or dismissed' });
    return;
  }

  const updates: string[] = [];
  const values: (string | Date | null)[] = [];
  let paramIndex = 1;

  if (status) {
    updates.push(`status = $${paramIndex++}`);
    values.push(status);

    if (status === 'resolved' || status === 'dismissed') {
      updates.push(`resolved_at = $${paramIndex++}`);
      values.push(new Date().toISOString());
    }
  }

  if (resolvedBy !== undefined) {
    updates.push(`resolved_by = $${paramIndex++}`);
    values.push(resolvedBy);
  }

  if (notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(notes);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No valid fields to update' });
    return;
  }

  values.push(id);

  const query = `
    UPDATE truth_ledger_claude.review_queue
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING ${reviewColumns.split('\n').map(l => l.trim()).filter(l => l).join(', ')}
  `;

  const result = await sql.unsafe<ReviewQueueItem[]>(query, values);

  if (result.length === 0) {
    res.status(404).json({ error: 'Review item not found' });
    return;
  }

  // If resolving a conflict_group, optionally apply the resolution
  if (resolution && result[0].itemType === 'conflict_group') {
    const { winningClaimId, newStatus } = resolution;

    if (winningClaimId) {
      // Mark this claim as the accepted value
      await sql`
        UPDATE truth_ledger_claude.conflict_groups
        SET status_factual = ${newStatus || 'resolved_by_human'},
            metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json({
              resolvedBy: 'human_review',
              winningClaimId,
              resolvedAt: new Date().toISOString(),
            })}::jsonb,
            updated_at = NOW()
        WHERE id = ${result[0].itemId}
      `;
    }
  }

  res.json(result[0]);
}));

/**
 * POST /review-queue
 * Manually add item to review queue
 */
router.post('/review-queue', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { itemType, itemId, reason, priority = 5, notes } = req.body;

  if (!itemType || !itemId) {
    res.status(400).json({ error: 'itemType and itemId are required' });
    return;
  }

  const validTypes = ['conflict_group', 'claim', 'entity', 'document'];
  if (!validTypes.includes(itemType)) {
    res.status(400).json({ error: `Invalid itemType. Must be: ${validTypes.join(', ')}` });
    return;
  }

  const result = await sql<ReviewQueueItem[]>`
    INSERT INTO truth_ledger_claude.review_queue (
      item_type,
      item_id,
      reason,
      priority,
      notes
    ) VALUES (
      ${itemType},
      ${itemId}::uuid,
      ${reason || 'manual_review'},
      ${priority},
      ${notes || null}
    )
    ON CONFLICT DO NOTHING
    RETURNING ${sql.unsafe(reviewColumns)}
  `;

  if (result.length === 0) {
    res.status(409).json({ error: 'Item already in review queue' });
    return;
  }

  res.status(201).json(result[0]);
}));

// ============================================================================
// PIPELINE STATUS ENDPOINTS
// ============================================================================

// Pipeline stage type
interface PipelineStage {
  id: string;
  name: string;
  description: string;
  order: number;
  syncType: string;
}

// Pipeline stage definitions (ingestion stages hidden - run separately if needed)
const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'extract',
    name: 'Claim Extraction',
    description: 'Extract claims and evidence from unprocessed snippets using Claude AI',
    order: 1,
    syncType: 'truth_extract',
  },
  {
    id: 'conflicts',
    name: 'Conflict Detection',
    description: 'Analyze conflict groups to detect value conflicts and create review items',
    order: 2,
    syncType: 'conflict_detection',
  },
  {
    id: 'derive',
    name: 'Derive Field Links',
    description: 'Convert high-quality claims into domain-default buckets for entity facts',
    order: 3,
    syncType: 'truth_derive',
  },
  {
    id: 'score',
    name: 'Truth Scoring',
    description: 'Compute truth_raw scores using evidence weighting and independence clusters',
    order: 4,
    syncType: 'truth_score',
  },
];

/**
 * GET /pipeline/stages
 * Get all pipeline stages with their descriptions
 */
router.get('/pipeline/stages', asyncHandler(async (_req, res) => {
  res.json({ stages: PIPELINE_STAGES });
}));

/**
 * GET /pipeline/status
 * Get current pipeline status with recent runs per stage
 */
router.get('/pipeline/status', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  // Get the most recent run for each sync type
  const recentRuns = await sql`
    WITH ranked AS (
      SELECT
        sync_type as "syncType",
        state,
        started_at as "startedAt",
        completed_at as "completedAt",
        records_synced as "recordsSynced",
        error_message as "errorMessage",
        metadata,
        ROW_NUMBER() OVER (PARTITION BY sync_type ORDER BY started_at DESC) as rn
      FROM sync_status
    )
    SELECT *
    FROM ranked
    WHERE rn = 1
  `;

  // Build status map
  const statusByType: Record<string, {
    syncType: string;
    state: string;
    startedAt: Date | null;
    completedAt: Date | null;
    recordsSynced: number | null;
    errorMessage: string | null;
  }> = {};

  for (const run of recentRuns) {
    statusByType[run.syncType] = {
      syncType: run.syncType,
      state: run.state,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      recordsSynced: run.recordsSynced,
      errorMessage: run.errorMessage,
    };
  }

  // Get running job info from in-memory map
  const getRunningInfoForStage = (stageId: string) => {
    // Check if this specific stage job is running
    const stageJob = runningJobs.get(stageId);
    if (stageJob?.status === 'running') {
      return {
        isRunning: true,
        progress: stageJob.progress,
        startedAt: stageJob.startedAt,
      };
    }

    // Check if full_pipeline is running and includes this stage
    const pipelineJob = runningJobs.get('full_pipeline');
    if (pipelineJob?.status === 'running') {
      // Use the currentStage field we set during execution
      const currentStage = pipelineJob.currentStage;

      // If full_pipeline is running this stage, show it
      if (currentStage === stageId) {
        return {
          isRunning: true,
          progress: pipelineJob.progress,
          startedAt: pipelineJob.startedAt,
          asPipeline: true,
        };
      }
    }

    return null;
  };

  // Map stages with their status and running info
  const stagesWithStatus = PIPELINE_STAGES.map(stage => {
    const runningInfo = getRunningInfoForStage(stage.id);
    const lastRun = statusByType[stage.syncType];

    return {
      ...stage,
      lastRun: runningInfo ? {
        ...lastRun,
        state: 'running',
        startedAt: runningInfo.startedAt,
        completedAt: null,
        progress: runningInfo.progress,
      } : lastRun || null,
      isRunning: !!runningInfo,
      runningProgress: runningInfo?.progress || null,
    };
  });

  // Get any currently running jobs from database (for display)
  const dbRunningJobs = await sql<Array<{
    id: number;
    syncType: string;
    startedAt: Date;
    recordsSynced: number | null;
  }>>`
    SELECT
      id,
      sync_type as "syncType",
      started_at as "startedAt",
      records_synced as "recordsSynced"
    FROM sync_status
    WHERE state = 'running'
    ORDER BY started_at DESC
  `;

  // Also include in-memory running jobs
  const memoryRunningJobs = Array.from(runningJobs.values())
    .filter(j => j.status === 'running')
    .map(j => ({
      jobId: j.jobId,
      startedAt: j.startedAt,
      progress: j.progress,
    }));

  res.json({
    stages: stagesWithStatus,
    runningJobs: dbRunningJobs,
    memoryRunningJobs,
    pipelineHealthy: stagesWithStatus.every(s => !s.lastRun || s.lastRun.state !== 'failed'),
  });
}));

/**
 * GET /pipeline/history
 * Get sync history with pagination and filtering
 */
router.get('/pipeline/history', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const {
    sync_type,
    state,
    limit = '50',
    offset = '0',
    since,
  } = req.query;

  let history;

  if (sync_type && state) {
    history = await sql`
      SELECT
        id,
        sync_type as "syncType",
        state,
        started_at as "startedAt",
        completed_at as "completedAt",
        records_synced as "recordsSynced",
        error_message as "errorMessage",
        metadata
      FROM sync_status
      WHERE sync_type = ${sync_type as string}
        AND state = ${state as string}
        ${since ? sql`AND started_at >= ${new Date(since as string)}` : sql``}
      ORDER BY started_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else if (sync_type) {
    history = await sql`
      SELECT
        id,
        sync_type as "syncType",
        state,
        started_at as "startedAt",
        completed_at as "completedAt",
        records_synced as "recordsSynced",
        error_message as "errorMessage",
        metadata
      FROM sync_status
      WHERE sync_type = ${sync_type as string}
        ${since ? sql`AND started_at >= ${new Date(since as string)}` : sql``}
      ORDER BY started_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else if (state) {
    history = await sql`
      SELECT
        id,
        sync_type as "syncType",
        state,
        started_at as "startedAt",
        completed_at as "completedAt",
        records_synced as "recordsSynced",
        error_message as "errorMessage",
        metadata
      FROM sync_status
      WHERE state = ${state as string}
        ${since ? sql`AND started_at >= ${new Date(since as string)}` : sql``}
      ORDER BY started_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  } else {
    history = await sql`
      SELECT
        id,
        sync_type as "syncType",
        state,
        started_at as "startedAt",
        completed_at as "completedAt",
        records_synced as "recordsSynced",
        error_message as "errorMessage",
        metadata
      FROM sync_status
      ${since ? sql`WHERE started_at >= ${new Date(since as string)}` : sql``}
      ORDER BY started_at DESC
      LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
    `;
  }

  res.json({ history, count: history.length });
}));

/**
 * GET /pipeline/stats
 * Get pipeline statistics and throughput metrics
 */
router.get('/pipeline/stats', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  // Get stats for last 24 hours, 7 days, and all time
  const stats = await sql`
    SELECT
      -- Last 24 hours
      COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours')::int as runs_24h,
      COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours' AND state = 'success')::int as success_24h,
      COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours' AND state = 'failed')::int as failed_24h,
      COALESCE(SUM(records_synced) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours'), 0)::int as records_24h,
      -- Last 7 days
      COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days')::int as runs_7d,
      COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days' AND state = 'success')::int as success_7d,
      COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days' AND state = 'failed')::int as failed_7d,
      COALESCE(SUM(records_synced) FILTER (WHERE started_at > NOW() - INTERVAL '7 days'), 0)::int as records_7d,
      -- All time
      COUNT(*)::int as runs_total,
      COUNT(*) FILTER (WHERE state = 'success')::int as success_total,
      COUNT(*) FILTER (WHERE state = 'failed')::int as failed_total,
      COALESCE(SUM(records_synced), 0)::int as records_total,
      -- Average duration (with null handling)
      COALESCE(
        ROUND(
          (AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE completed_at IS NOT NULL))::numeric,
          2
        ),
        0
      ) as avg_duration_seconds
    FROM public.sync_status
  `;

  // Get breakdown by sync type
  const breakdown = await sql`
    SELECT
      sync_type as "syncType",
      COUNT(*)::int as total_runs,
      COUNT(*) FILTER (WHERE state = 'success')::int as success_count,
      COUNT(*) FILTER (WHERE state = 'failed')::int as failed_count,
      COALESCE(SUM(records_synced), 0)::int as total_records,
      MAX(completed_at) as last_completed,
      COALESCE(
        ROUND(
          (AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE completed_at IS NOT NULL))::numeric,
          2
        ),
        0
      ) as avg_duration_seconds
    FROM public.sync_status
    GROUP BY sync_type
    ORDER BY MAX(started_at) DESC
  `;

  res.json({
    summary: stats[0],
    byStage: breakdown,
  });
}));

// ============================================================================
// JOB EXECUTION ENDPOINTS
// ============================================================================

// Track running jobs in memory (in production, use Redis or similar)
const runningJobs = new Map<string, {
  jobId: string;
  jobType: string;
  startedAt: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: { current: number; total: number; message: string };
  currentStage?: string; // For full_pipeline: which stage is currently running
  result?: unknown;
  error?: string;
  abortController?: AbortController;
}>();

// Helper to check if job was cancelled
function isJobCancelled(jobId: string): boolean {
  const job = runningJobs.get(jobId);
  return job?.status === 'cancelled' || job?.abortController?.signal.aborted === true;
}

// Job timeout configuration (2 hours default)
const JOB_TIMEOUT_HOURS = 2;

/**
 * Clean up stuck jobs that have been running longer than the timeout threshold.
 * This handles cases where:
 * - Server restarted while jobs were running
 * - Jobs hung indefinitely
 * - Network issues caused jobs to stall
 */
async function cleanupStuckJobs(): Promise<{ cleaned: number; jobs: string[] }> {
  const sql = getConnection();

  const result = await sql`
    UPDATE sync_status
    SET
      state = 'timeout',
      completed_at = NOW(),
      error_message = ${'Job timed out after ' + JOB_TIMEOUT_HOURS + ' hours of running'}
    WHERE state = 'running'
      AND started_at < NOW() - INTERVAL '${sql.unsafe(String(JOB_TIMEOUT_HOURS))} hours'
    RETURNING sync_type, started_at
  `;

  const cleanedJobs = result.map(r => r.sync_type as string);

  if (cleanedJobs.length > 0) {
    console.log(`[Job Cleanup] Marked ${cleanedJobs.length} stuck jobs as timed out:`, cleanedJobs);
  }

  return { cleaned: cleanedJobs.length, jobs: cleanedJobs };
}

// Run cleanup on startup and every 30 minutes
let cleanupInitialized = false;
function initializeJobCleanup() {
  if (cleanupInitialized) return;
  cleanupInitialized = true;

  // Run immediately on startup
  cleanupStuckJobs().catch(err => {
    console.error('[Job Cleanup] Error during initial cleanup:', err);
  });

  // Run every 30 minutes
  setInterval(() => {
    cleanupStuckJobs().catch(err => {
      console.error('[Job Cleanup] Error during scheduled cleanup:', err);
    });
  }, 30 * 60 * 1000);

  console.log(`[Job Cleanup] Initialized with ${JOB_TIMEOUT_HOURS}h timeout threshold`);
}

// Job definitions with full metadata
const JOB_DEFINITIONS = [
  {
    id: 'feed_ingest',
    name: 'Feed Ingest',
    description: 'Fetch and ingest content from all active RSS/Atom feeds',
    category: 'ingestion',
    estimatedDuration: '2-10 minutes',
    affects: ['documents', 'snippets'],
  },
  {
    id: 'extract',
    name: 'Claim Extraction',
    description: 'Extract claims and evidence from unprocessed snippets using Claude AI',
    category: 'processing',
    estimatedDuration: '5-30 minutes',
    affects: ['claims', 'evidence', 'conflict_groups'],
  },
  {
    id: 'conflicts',
    name: 'Conflict Detection',
    description: 'Analyze conflict groups to detect value conflicts and create review items',
    category: 'processing',
    estimatedDuration: '1-5 minutes',
    affects: ['conflict_groups', 'review_queue'],
  },
  {
    id: 'derive',
    name: 'Derive Field Links',
    description: 'Convert high-quality claims into domain-default buckets for entity facts',
    category: 'processing',
    estimatedDuration: '1-3 minutes',
    affects: ['field_links'],
  },
  {
    id: 'score',
    name: 'Truth Scoring',
    description: 'Compute truth_raw scores using evidence weighting and independence clusters',
    category: 'scoring',
    estimatedDuration: '2-5 minutes',
    affects: ['truth_metrics'],
  },
  {
    id: 'full_pipeline',
    name: 'Full Pipeline',
    description: 'Run all processing stages: extract → conflicts → derive → score',
    category: 'orchestration',
    estimatedDuration: '5-40 minutes',
    affects: ['claims', 'evidence', 'conflict_groups', 'field_links', 'truth_metrics'],
  },
];

// Initialize job cleanup on module load
initializeJobCleanup();

/**
 * POST /pipeline/jobs/cleanup
 * Manually trigger cleanup of stuck jobs (admin action)
 */
router.post('/pipeline/jobs/cleanup', asyncHandler(async (_req, res) => {
  const result = await cleanupStuckJobs();
  res.json({
    message: result.cleaned > 0
      ? `Cleaned up ${result.cleaned} stuck job(s)`
      : 'No stuck jobs found',
    cleaned: result.cleaned,
    jobs: result.jobs,
    timeoutThreshold: `${JOB_TIMEOUT_HOURS} hours`,
  });
}));

/**
 * GET /pipeline/jobs
 * Get all available jobs with their descriptions and status
 */
router.get('/pipeline/jobs', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  // Get last run info for each job type
  const lastRuns = await sql`
    SELECT DISTINCT ON (sync_type)
      sync_type as "syncType",
      state,
      started_at as "startedAt",
      completed_at as "completedAt",
      records_synced as "recordsSynced",
      error_message as "errorMessage"
    FROM sync_status
    ORDER BY sync_type, started_at DESC
  `;

  const lastRunMap = new Map(lastRuns.map(r => [r.syncType, r]));

  const jobs = JOB_DEFINITIONS.map(job => {
    const syncType = job.id === 'full_pipeline' ? 'truth_score' :
                     job.id === 'feed_ingest' ? 'feed_ingest' :
                     job.id === 'conflicts' ? 'conflict_detection' :
                     `truth_${job.id}`;
    const lastRun = lastRunMap.get(syncType);
    const running = runningJobs.get(job.id);

    return {
      ...job,
      syncType,
      isRunning: running?.status === 'running',
      runningInfo: running?.status === 'running' ? {
        startedAt: running.startedAt,
        progress: running.progress,
      } : null,
      lastRun: lastRun ? {
        state: lastRun.state,
        startedAt: lastRun.startedAt,
        completedAt: lastRun.completedAt,
        recordsSynced: lastRun.recordsSynced,
        errorMessage: lastRun.errorMessage,
      } : null,
    };
  });

  res.json({ jobs });
}));

/**
 * GET /pipeline/jobs/running
 * Get currently running jobs
 */
router.get('/pipeline/jobs/running', asyncHandler(async (_req, res) => {
  const running = Array.from(runningJobs.values())
    .filter(j => j.status === 'running')
    .map(j => ({
      jobId: j.jobId,
      jobType: j.jobType,
      startedAt: j.startedAt,
      progress: j.progress,
    }));

  res.json({ running, count: running.length });
}));

/**
 * POST /pipeline/jobs/:jobId/run
 * Execute a job
 */
router.post('/pipeline/jobs/:jobId/run', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const sql = getConnection();

  // Validate job exists
  const jobDef = JOB_DEFINITIONS.find(j => j.id === jobId);
  if (!jobDef) {
    res.status(404).json({ error: `Job '${jobId}' not found` });
    return;
  }

  // Check if already running (in-memory)
  const existing = runningJobs.get(jobId);
  if (existing?.status === 'running') {
    res.status(409).json({
      error: 'Job is already running',
      startedAt: existing.startedAt,
    });
    return;
  }

  // Also check database for running jobs (handles server restart case)
  const syncType = jobId === 'full_pipeline' ? 'full_pipeline' :
                   jobId === 'feed_ingest' ? 'feed_ingest' :
                   jobId === 'conflicts' ? 'conflict_detection' :
                   `truth_${jobId}`;

  const dbRunning = await sql`
    SELECT id, started_at as "startedAt"
    FROM sync_status
    WHERE sync_type = ${syncType} AND state = 'running'
    ORDER BY started_at DESC
    LIMIT 1
  `;

  if (dbRunning.length > 0) {
    res.status(409).json({
      error: 'Job is already running (check database)',
      startedAt: dbRunning[0].startedAt,
      hint: 'If this job is stuck, use POST /pipeline/jobs/cleanup to clear it',
    });
    return;
  }

  // Create run ID and track start
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const abortController = new AbortController();

  runningJobs.set(jobId, {
    jobId: runId,
    jobType: jobId,
    startedAt,
    status: 'running',
    progress: { current: 0, total: 100, message: 'Starting...' },
    abortController,
  });

  // Record in sync_status (syncType already defined above)
  await sql`
    INSERT INTO sync_status (sync_type, state, started_at, metadata)
    VALUES (${syncType}, 'running', ${startedAt}, ${JSON.stringify({ runId, triggeredBy: 'api' })}::jsonb)
  `;

  // Return immediately - job runs in background
  res.json({
    runId,
    jobId,
    jobType: jobDef.name,
    status: 'started',
    startedAt,
    message: `Job '${jobDef.name}' started`,
  });

  // Execute job asynchronously
  executeJob(jobId, runId, sql).catch(err => {
    console.error(`Job ${jobId} failed:`, err);
  });
}));

/**
 * POST /pipeline/jobs/:jobId/cancel
 * Cancel a running job
 */
router.post('/pipeline/jobs/:jobId/cancel', asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const sql = getConnection();

  const job = runningJobs.get(jobId);
  if (!job) {
    res.status(404).json({ error: `No job '${jobId}' found` });
    return;
  }

  if (job.status !== 'running') {
    res.status(400).json({
      error: `Job is not running (current status: ${job.status})`,
      status: job.status,
    });
    return;
  }

  // Trigger cancellation
  job.status = 'cancelled';
  job.abortController?.abort();
  job.progress = { current: 0, total: 100, message: 'Cancelling...' };

  // Update sync_status
  const syncType = jobId === 'full_pipeline' ? 'full_pipeline' :
                   jobId === 'feed_ingest' ? 'feed_ingest' :
                   jobId === 'conflicts' ? 'conflict_detection' :
                   `truth_${jobId}`;

  await sql`
    UPDATE sync_status
    SET state = 'cancelled',
        completed_at = NOW(),
        error_message = 'Cancelled by user'
    WHERE sync_type = ${syncType}
      AND state = 'running'
  `;

  res.json({
    jobId,
    status: 'cancelled',
    message: `Job '${jobId}' has been cancelled`,
  });
}));

/**
 * Execute a job (runs in background)
 */
async function executeJob(jobId: string, runId: string, sql: ReturnType<typeof getConnection>, parentJobId?: string) {
  const log = (message: string) => {
    console.log(`[Job ${jobId}:${runId}] ${new Date().toISOString()} - ${message}`);
  };

  const updateProgress = (current: number, total: number, message: string) => {
    log(`Progress: ${current}/${total} - ${message}`);
    // Update own entry if exists, or parent's entry if running as sub-stage
    const targetJobId = runningJobs.has(jobId) ? jobId : parentJobId;
    if (targetJobId) {
      const job = runningJobs.get(targetJobId);
      if (job && job.status === 'running') {
        job.progress = { current, total, message };
      }
    }
  };

  // Check if cancelled before starting (check both own job and parent if exists)
  const checkCancelled = () => {
    if (isJobCancelled(jobId) || (parentJobId && isJobCancelled(parentJobId))) {
      log('Job cancelled by user');
      throw new Error('Job was cancelled');
    }
  };

  const syncType = jobId === 'full_pipeline' ? 'full_pipeline' :
                   jobId === 'feed_ingest' ? 'feed_ingest' :
                   jobId === 'conflicts' ? 'conflict_detection' :
                   `truth_${jobId}`;

  log(`Starting job execution (syncType: ${syncType})`);

  try {
    checkCancelled();
    let recordsSynced = 0;

    switch (jobId) {
      case 'feed_ingest': {
        updateProgress(10, 100, 'Fetching feeds from database...');
        const fetcher = new FeedFetcher();
        updateProgress(30, 100, 'Ingesting feed content...');
        log('Starting feed ingestion...');
        const result = await fetcher.ingestAllFeedsFromDb();
        recordsSynced = result.totalDocumentsCreated + result.totalSnippetsCreated;
        log(`Feed ingestion complete: ${recordsSynced} records`);
        updateProgress(100, 100, `Ingested ${recordsSynced} records`);
        break;
      }

      case 'extract': {
        updateProgress(10, 100, 'Finding unprocessed snippets...');
        const extractor = new Extractor();
        log('Starting claim extraction...');
        const result = await extractor.extract({
          checkCancelled,
          onProgress: (current, total, message) => {
            // Scale progress from 10-100 (10% for init)
            const scaledProgress = 10 + Math.floor((current / total) * 90);
            updateProgress(scaledProgress, 100, message);
          },
        });
        recordsSynced = result.claimsCreated + result.evidenceCreated;
        log(`Extraction complete: ${result.claimsCreated} claims, ${result.evidenceCreated} evidence`);
        updateProgress(100, 100, `Extracted ${result.claimsCreated} claims, ${result.evidenceCreated} evidence`);
        break;
      }

      case 'conflicts': {
        updateProgress(10, 100, 'Analyzing conflict groups...');
        const detector = new ConflictDetector();
        log('Starting conflict detection...');
        const result = await detector.detectConflicts({
          checkCancelled,
          onProgress: (current, total, message) => {
            const scaledProgress = 10 + Math.floor((current / total) * 90);
            updateProgress(scaledProgress, 100, message);
          },
        });
        recordsSynced = result.groupsAnalyzed;
        log(`Conflict detection complete: ${result.groupsAnalyzed} groups, ${result.conflictsFound} conflicts`);
        updateProgress(100, 100, `Analyzed ${result.groupsAnalyzed} groups, found ${result.conflictsFound} conflicts`);
        break;
      }

      case 'derive': {
        updateProgress(10, 100, 'Finding high-quality claims...');
        const deriver = new Deriver();
        log('Starting derivation...');
        const result = await deriver.derive({
          checkCancelled,
          onProgress: (current, total, message) => {
            const scaledProgress = 10 + Math.floor((current / total) * 90);
            updateProgress(scaledProgress, 100, message);
          },
        });
        recordsSynced = result.derivedClaimsCreated + result.fieldLinksCreated;
        log(`Derivation complete: ${result.fieldLinksCreated} field links`);
        updateProgress(100, 100, `Created ${result.fieldLinksCreated} field links`);
        break;
      }

      case 'score': {
        updateProgress(10, 100, 'Computing truth metrics...');
        const scorer = new Scorer();
        log('Starting scoring...');
        const result = await scorer.score({
          checkCancelled,
          onProgress: (current, total, message) => {
            const scaledProgress = 10 + Math.floor((current / total) * 90);
            updateProgress(scaledProgress, 100, message);
          },
        });
        recordsSynced = result.metricsCreated + result.metricsUpdated;
        log(`Scoring complete: ${result.claimsScored} claims`);
        updateProgress(100, 100, `Scored ${result.claimsScored} claims`);
        break;
      }

      case 'full_pipeline': {
        // Run all processing stages sequentially (feed_ingest excluded - run separately if needed)
        const stages = ['extract', 'conflicts', 'derive', 'score'];
        log(`Starting full pipeline with ${stages.length} stages: ${stages.join(', ')}`);

        // Helper to update current stage
        const setCurrentStage = (stage: string | undefined) => {
          const pipelineJob = runningJobs.get('full_pipeline');
          if (pipelineJob) {
            pipelineJob.currentStage = stage;
          }
        };

        for (let i = 0; i < stages.length; i++) {
          checkCancelled(); // Check before each stage
          const stage = stages[i];
          const progress = Math.floor((i / stages.length) * 100);

          // Set the current stage so status endpoint can detect it
          setCurrentStage(stage);
          updateProgress(progress, 100, `Running ${stage}...`);
          log(`Starting stage ${i + 1}/${stages.length}: ${stage}`);

          // Execute each stage (reuse the switch logic), passing 'full_pipeline' as parent
          try {
            await executeJob(stage, `${runId}-${stage}`, sql, 'full_pipeline');
            log(`Completed stage ${i + 1}/${stages.length}: ${stage}`);
          } catch (stageError) {
            log(`Stage ${stage} failed: ${stageError instanceof Error ? stageError.message : String(stageError)}`);
            throw stageError; // Re-throw to fail the whole pipeline
          }
          checkCancelled(); // Check after each stage
        }
        setCurrentStage(undefined); // Clear when done
        log('Full pipeline completed successfully');
        updateProgress(100, 100, 'Full pipeline completed');
        break;
      }
    }

    // Mark as completed
    log(`Job completed successfully with ${recordsSynced} records synced`);
    const job = runningJobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = { recordsSynced };
    }

    await sql`
      UPDATE sync_status
      SET state = 'success', completed_at = NOW(), records_synced = ${recordsSynced}
      WHERE sync_type = ${syncType} AND state = 'running'
      ORDER BY started_at DESC
      LIMIT 1
    `;
    log('Database sync_status updated to success');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const wasCancelled = errorMessage === 'Job was cancelled' || isJobCancelled(jobId);

    log(`Job ${wasCancelled ? 'cancelled' : 'failed'}: ${errorMessage}`);

    const job = runningJobs.get(jobId);
    if (job) {
      job.status = wasCancelled ? 'cancelled' : 'failed';
      job.error = errorMessage;
    }

    // Only update if not already cancelled (cancel endpoint handles that)
    if (!wasCancelled) {
      await sql`
        UPDATE sync_status
        SET state = 'failed', completed_at = NOW(), error_message = ${errorMessage}
        WHERE id = (
          SELECT id FROM sync_status
          WHERE sync_type = ${syncType} AND state = 'running'
          ORDER BY started_at DESC
          LIMIT 1
        )
      `;
      log('Database sync_status updated to failed');
    }
  } finally {
    log('Job execution finished, scheduling cleanup');
    // Clean up after a delay
    setTimeout(() => {
      const job = runningJobs.get(jobId);
      if (job && job.status !== 'running') {
        runningJobs.delete(jobId);
        console.log(`[Job ${jobId}] Removed from memory after cleanup delay`);
      }
    }, 60000); // Keep for 1 minute after completion
  }
}

/**
 * GET /pipeline/feeds/status
 * Get status of all feeds with last fetch times and errors
 */
router.get('/pipeline/feeds/status', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  const feeds = await sql`
    SELECT
      sf.id,
      sf.source_id as "sourceId",
      s.name as "sourceName",
      sf.feed_url as "feedUrl",
      sf.feed_type as "feedType",
      sf.refresh_interval_minutes as "refreshIntervalMinutes",
      sf.is_active as "isActive",
      sf.last_fetched_at as "lastFetchedAt",
      sf.last_error as "lastError",
      sf.error_count as "errorCount",
      sf.created_at as "createdAt",
      -- Calculate if due for refresh
      CASE
        WHEN sf.last_fetched_at IS NULL THEN true
        WHEN sf.last_fetched_at + (sf.refresh_interval_minutes || ' minutes')::interval < NOW() THEN true
        ELSE false
      END as "isDue",
      -- Calculate next fetch time
      CASE
        WHEN sf.last_fetched_at IS NULL THEN NOW()
        ELSE sf.last_fetched_at + (sf.refresh_interval_minutes || ' minutes')::interval
      END as "nextFetchAt",
      -- Get document count from this feed
      (SELECT COUNT(*)::int FROM truth_ledger_claude.documents d
       WHERE d.source_id = sf.source_id
       AND d.metadata->>'feedUrl' = sf.feed_url) as "documentCount"
    FROM truth_ledger_claude.source_feeds sf
    JOIN truth_ledger_claude.sources s ON s.id = sf.source_id
    ORDER BY
      sf.is_active DESC,
      sf.error_count DESC,
      sf.last_fetched_at ASC NULLS FIRST
  `;

  // Calculate summary stats
  const activeCount = feeds.filter(f => f.isActive).length;
  const dueCount = feeds.filter(f => f.isActive && f.isDue).length;
  const errorCount = feeds.filter(f => f.errorCount > 0).length;
  const neverFetched = feeds.filter(f => !f.lastFetchedAt).length;

  res.json({
    feeds,
    summary: {
      total: feeds.length,
      active: activeCount,
      inactive: feeds.length - activeCount,
      dueForRefresh: dueCount,
      withErrors: errorCount,
      neverFetched,
    },
  });
}));

// ============================================================================
// SOURCE CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /sources/config
 * Get all configured sources from the registry
 */
router.get('/sources/config', asyncHandler(async (_req, res) => {
  const sources = Object.entries(SOURCE_REGISTRY).map(([key, config]) => ({
    key,
    ...config,
    feedCount: config.feeds?.length ?? 0,
    urlCount: config.urls?.length ?? 0,
  }));

  res.json({
    sources,
    totalSources: sources.length,
    activeSources: sources.filter(s => s.active).length,
    totalFeeds: getTotalFeedCount(),
    totalUrls: sources.reduce((sum, s) => sum + (s.urls?.length ?? 0), 0),
  });
}));

/**
 * GET /sources/feeds
 * Get all RSS/Atom feeds with their refresh schedule
 */
router.get('/sources/feeds', asyncHandler(async (_req, res) => {
  const schedule = getFeedRefreshSchedule();
  const sourcesWithFeeds = getSourcesWithFeeds();

  res.json({
    feeds: schedule,
    totalFeeds: schedule.length,
    sourcesWithFeeds: sourcesWithFeeds.map(s => ({
      name: s.name,
      sourceType: s.sourceType,
      baseTrust: s.baseTrust,
      feedCount: s.feeds?.length ?? 0,
    })),
  });
}));

/**
 * GET /sources/:sourceId/documents
 * Get documents from a specific source
 */
router.get('/sources/:sourceId/documents', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { sourceId } = req.params;
  const { limit = '50', offset = '0' } = req.query;

  const documents = await sql`
    SELECT
      d.id,
      d.title,
      d.url,
      d.doc_type as "docType",
      d.published_at as "publishedAt",
      d.retrieved_at as "retrievedAt",
      d.content_hash as "contentHash",
      d.supersedes_document_id as "supersedesDocumentId",
      (SELECT COUNT(*)::int FROM truth_ledger_claude.snippets WHERE document_id = d.id) as snippet_count
    FROM truth_ledger_claude.documents d
    WHERE d.source_id = ${sourceId}
    ORDER BY d.retrieved_at DESC
    LIMIT ${parseInt(limit as string)} OFFSET ${parseInt(offset as string)}
  `;

  const total = await sql`
    SELECT COUNT(*)::int as count
    FROM truth_ledger_claude.documents
    WHERE source_id = ${sourceId}
  `;

  res.json({
    documents,
    count: documents.length,
    total: total[0].count,
  });
}));

/**
 * GET /sources/:sourceId/stats
 * Get statistics for a specific source
 */
router.get('/sources/:sourceId/stats', asyncHandler(async (req, res) => {
  const sql = getConnection();
  const { sourceId } = req.params;

  const stats = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM truth_ledger_claude.documents WHERE source_id = ${sourceId}) as document_count,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.snippets s
       JOIN truth_ledger_claude.documents d ON s.document_id = d.id
       WHERE d.source_id = ${sourceId}) as snippet_count,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.evidence e
       JOIN truth_ledger_claude.snippets s ON e.snippet_id = s.id
       JOIN truth_ledger_claude.documents d ON s.document_id = d.id
       WHERE d.source_id = ${sourceId}) as evidence_count,
      (SELECT MIN(retrieved_at) FROM truth_ledger_claude.documents WHERE source_id = ${sourceId}) as first_retrieved,
      (SELECT MAX(retrieved_at) FROM truth_ledger_claude.documents WHERE source_id = ${sourceId}) as last_retrieved
  `;

  res.json(stats[0]);
}));

/**
 * GET /pipeline/data-flow
 * Get data flow statistics showing records at each stage
 */
router.get('/pipeline/data-flow', asyncHandler(async (_req, res) => {
  const sql = getConnection();

  const flow = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM truth_ledger_claude.sources) as sources,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.documents) as documents,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.snippets) as snippets,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.entities) as entities,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.claims) as claims,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.evidence) as evidence,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.conflict_groups) as conflict_groups,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.conflict_groups WHERE conflict_present = true) as active_conflicts,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.truth_metrics) as truth_metrics,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.field_links) as field_links,
      (SELECT COUNT(*)::int FROM truth_ledger_claude.review_queue WHERE status = 'pending') as pending_reviews
  `;

  // Get growth over time (last 7 days)
  const growth = await sql`
    SELECT
      DATE_TRUNC('day', created_at)::date as date,
      COUNT(*)::int as documents_created
    FROM truth_ledger_claude.documents
    WHERE created_at > NOW() - INTERVAL '7 days'
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY date
  `;

  res.json({
    current: flow[0],
    growth: growth,
  });
}));

export default router;
