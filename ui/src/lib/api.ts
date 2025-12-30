import axios from 'axios';
import type {
  Entity,
  Fact,
  ConflictGroup,
  ConflictGroupWithClaims,
  ReviewQueueItem,
  ReviewQueueStats,
  LedgerStats,
  EntityFilters,
  ConflictFilters,
  ReviewQueueFilters,
  Source,
  SourceFeed,
  SourceUrl,
  CreateSourceInput,
  UpdateSourceInput,
  CreateFeedInput,
  UpdateFeedInput,
  CreateUrlInput,
  SourcePipelineStats,
  StageDetails,
  SourceDocuments,
  DocumentSnippets,
  SnippetClaims,
  ClaimEvidence,
  ExtractorPattern,
  CreateExtractorPatternInput,
  UpdateExtractorPatternInput,
  PatternTestResult,
  CreateEntityInput,
  UpdateEntityInput,
} from './types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Stats API
export const statsApi = {
  get: async (): Promise<LedgerStats> => {
    const response = await api.get('/stats');
    const raw = response.data;
    return {
      entityCount: parseInt(raw.entity_count || raw.entityCount || '0', 10),
      claimCount: parseInt(raw.claim_count || raw.claimCount || '0', 10),
      sourceCount: parseInt(raw.source_count || raw.sourceCount || '0', 10),
      attributeCount: parseInt(raw.attribute_count || raw.attributeCount || '0', 10),
      factCount: parseInt(raw.metrics_count || raw.fact_count || raw.factCount || '0', 10),
      conflictCount: parseInt(raw.active_conflicts || raw.conflict_count || raw.conflictCount || '0', 10),
    };
  },
};

// Entity API
export const entityApi = {
  list: async (filters?: EntityFilters): Promise<Entity[]> => {
    const response = await api.get('/entities', { params: filters });
    // Handle wrapped response {entities: [], count: N}
    const entities = response.data.entities || response.data;
    return (entities as unknown[]).map((e: unknown) => {
      const raw = e as Record<string, unknown>;
      return {
        id: raw.id as string,
        type: (raw.entityType || raw.entity_type || raw.type) as string,
        name: (raw.canonicalName || raw.canonical_name || raw.name) as string,
        aliases: (raw.aliases || []) as string[],
        description: (raw.description || null) as string | null,
        metadata: (raw.metadata || {}) as Record<string, unknown>,
        createdAt: (raw.createdAt || raw.created_at) as string,
        updatedAt: (raw.updatedAt || raw.updated_at) as string,
      };
    });
  },

  get: async (id: string): Promise<Entity> => {
    const response = await api.get(`/entities/${id}`);
    const raw = response.data as Record<string, unknown>;
    return {
      id: raw.id as string,
      type: (raw.entityType || raw.entity_type || raw.type) as string,
      name: (raw.canonicalName || raw.canonical_name || raw.name) as string,
      aliases: (raw.aliases || []) as string[],
      description: (raw.description || null) as string | null,
      metadata: (raw.metadata || {}) as Record<string, unknown>,
      createdAt: (raw.createdAt || raw.created_at) as string,
      updatedAt: (raw.updatedAt || raw.updated_at) as string,
    };
  },

  getFacts: async (id: string, truthMin?: number): Promise<Fact[]> => {
    const response = await api.get(`/entities/${id}/facts`, {
      params: { truth_min: truthMin },
    });

    // Handle the nested response structure: {entityName, facts: [{fieldName, response: {...}}]}
    const data = response.data as Record<string, unknown>;
    const factsArray = (data.facts || data || []) as unknown[];

    return factsArray.map((f: unknown) => {
      const raw = f as Record<string, unknown>;
      const resp = (raw.response || raw) as Record<string, unknown>;
      const alternatives = (resp.alternatives || []) as Array<Record<string, unknown>>;
      const bestAlt = alternatives[0] || {};
      const metadata = (resp.metadata || {}) as Record<string, unknown>;

      // Get the best value - either from bestAnswer or first alternative
      const bestAnswer = resp.bestAnswer as Record<string, unknown> | null;
      const value = bestAnswer?.value ?? bestAlt.value;
      const unit = (bestAnswer?.unit ?? bestAlt.unit ?? null) as string | null;
      const truth = parseFloat(String(bestAnswer?.truthRaw ?? bestAlt.truthRaw ?? bestAlt.truthDisplay ?? 0));

      // Extract source from evidence if available
      const evidence = (bestAlt.evidence || []) as Array<Record<string, unknown>>;
      const firstEvidence = evidence[0] || {};

      return {
        entityId: id,
        attributeId: (resp.claimKey || '') as string,
        scopeJson: (metadata.scope || null) as Record<string, unknown> | null,
        bestClaimId: (bestAlt.claimId || '') as string,
        aggregatedTruth: truth,
        claimCount: alternatives.length || 1,
        updatedAt: (metadata.computedAt || new Date().toISOString()) as string,
        attributeName: (raw.fieldName || metadata.attributeName || 'Unknown') as string,
        bestValue: value,
        bestUnit: unit,
        sourceName: (firstEvidence.sourceName || 'Unknown') as string,
      };
    }).filter(fact => {
      // Filter by truth threshold if specified
      if (truthMin !== undefined && fact.aggregatedTruth < truthMin) {
        return false;
      }
      // Filter out facts with no value
      return fact.bestValue !== null && fact.bestValue !== undefined;
    });
  },

  create: async (input: CreateEntityInput): Promise<Entity> => {
    const response = await api.post('/entities', input);
    const raw = response.data as Record<string, unknown>;
    return {
      id: raw.id as string,
      type: (raw.entityType || raw.entity_type || raw.type) as string,
      name: (raw.canonicalName || raw.canonical_name || raw.name) as string,
      aliases: (raw.aliases || []) as string[],
      description: (raw.description || null) as string | null,
      metadata: (raw.metadata || {}) as Record<string, unknown>,
      createdAt: (raw.createdAt || raw.created_at) as string,
      updatedAt: (raw.updatedAt || raw.updated_at) as string,
    };
  },

  update: async (id: string, input: UpdateEntityInput): Promise<Entity> => {
    const response = await api.put(`/entities/${id}`, input);
    const raw = response.data as Record<string, unknown>;
    return {
      id: raw.id as string,
      type: (raw.entityType || raw.entity_type || raw.type) as string,
      name: (raw.canonicalName || raw.canonical_name || raw.name) as string,
      aliases: (raw.aliases || []) as string[],
      description: (raw.description || null) as string | null,
      metadata: (raw.metadata || {}) as Record<string, unknown>,
      createdAt: (raw.createdAt || raw.created_at) as string,
      updatedAt: (raw.updatedAt || raw.updated_at) as string,
    };
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/entities/${id}`);
  },
};

// Extractor Pattern API
export const extractorPatternApi = {
  list: async (params?: { active?: boolean; entityType?: string }): Promise<{ patterns: ExtractorPattern[]; count: number }> => {
    const response = await api.get('/extractor-patterns', {
      params: {
        active: params?.active,
        entity_type: params?.entityType,
      },
    });
    return response.data;
  },

  get: async (id: string): Promise<ExtractorPattern> => {
    const response = await api.get(`/extractor-patterns/${id}`);
    return response.data;
  },

  create: async (input: CreateExtractorPatternInput): Promise<ExtractorPattern> => {
    const response = await api.post('/extractor-patterns', input);
    return response.data;
  },

  update: async (id: string, input: UpdateExtractorPatternInput): Promise<ExtractorPattern> => {
    const response = await api.put(`/extractor-patterns/${id}`, input);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/extractor-patterns/${id}`);
  },

  test: async (id: string, text: string): Promise<PatternTestResult> => {
    const response = await api.post(`/extractor-patterns/${id}/test`, { text });
    return response.data;
  },
};

// Conflict API
export const conflictApi = {
  list: async (filters?: ConflictFilters): Promise<ConflictGroup[]> => {
    const response = await api.get('/conflict-groups', {
      params: {
        entity_id: filters?.entityId,
        has_conflict: filters?.hasConflict,
        limit: filters?.limit,
        offset: filters?.offset,
      },
    });
    const conflicts = response.data as unknown[];
    return conflicts.map((c: unknown) => {
      const raw = c as Record<string, unknown>;
      return {
        id: raw.id as string,
        claimKeyHash: (raw.claimKeyHash || raw.claim_key_hash) as string,
        entityId: (raw.entityId || raw.entity_id) as string,
        attributeId: (raw.attributeId || raw.attribute_id) as string,
        scopeJson: (raw.scopeJson || raw.scope_json || null) as Record<string, unknown> | null,
        conflictPresent: Boolean(raw.conflictPresent ?? raw.conflict_present ?? true),
        statusFactual: (raw.statusFactual || raw.status_factual || 'unknown') as string,
        claimCount: parseInt(String(raw.claimCount || raw.claim_count || 0), 10),
        metadata: (raw.metadata || {}) as Record<string, unknown>,
        createdAt: (raw.createdAt || raw.created_at) as string,
        updatedAt: (raw.updatedAt || raw.updated_at) as string,
        entityName: (raw.entityName || raw.entity_name) as string | undefined,
        attributeName: (raw.attributeName || raw.attribute_name) as string | undefined,
      };
    });
  },

  get: async (id: string): Promise<ConflictGroupWithClaims> => {
    const response = await api.get(`/conflict-groups/${id}`);
    const raw = response.data as Record<string, unknown>;
    const claims = ((raw.claims || []) as unknown[]).map((c: unknown) => {
      const claim = c as Record<string, unknown>;
      return {
        id: claim.id as string,
        entityId: (claim.entityId || claim.entity_id) as string,
        attributeId: (claim.attributeId || claim.attribute_id) as string,
        sourceId: (claim.sourceId || claim.source_id) as string,
        value: claim.value,
        unit: (claim.unit || null) as string | null,
        confidence: claim.confidence ? parseFloat(String(claim.confidence)) : null,
        extractedAt: (claim.extractedAt || claim.extracted_at) as string,
        validFrom: (claim.validFrom || claim.valid_from || null) as string | null,
        validTo: (claim.validTo || claim.valid_to || null) as string | null,
        scopeJson: (claim.scopeJson || claim.scope_json || null) as Record<string, unknown> | null,
        provenanceChain: (claim.provenanceChain || claim.provenance_chain || null) as Record<string, unknown> | null,
        rawText: (claim.rawText || claim.raw_text || null) as string | null,
        metadata: (claim.metadata || {}) as Record<string, unknown>,
        createdAt: (claim.createdAt || claim.created_at) as string,
        attributeName: (claim.attributeName || claim.attribute_name || 'Unknown') as string,
        sourceName: (claim.sourceName || claim.source_name || 'Unknown') as string,
        sourceDefaultTrust: parseFloat(String(claim.sourceDefaultTrust || claim.source_default_trust || claim.defaultTrust || claim.default_trust || 0.5)),
        truthRaw: claim.truthRaw || claim.truth_raw ? parseFloat(String(claim.truthRaw || claim.truth_raw)) : null,
      };
    });

    return {
      id: raw.id as string,
      claimKeyHash: (raw.claimKeyHash || raw.claim_key_hash) as string,
      entityId: (raw.entityId || raw.entity_id) as string,
      attributeId: (raw.attributeId || raw.attribute_id) as string,
      scopeJson: (raw.scopeJson || raw.scope_json || null) as Record<string, unknown> | null,
      conflictPresent: Boolean(raw.conflictPresent ?? raw.conflict_present ?? true),
      statusFactual: (raw.statusFactual || raw.status_factual || 'unknown') as string,
      claimCount: parseInt(String(raw.claimCount || raw.claim_count || 0), 10),
      metadata: (raw.metadata || {}) as Record<string, unknown>,
      createdAt: (raw.createdAt || raw.created_at) as string,
      updatedAt: (raw.updatedAt || raw.updated_at) as string,
      entityName: (raw.entityName || raw.entity_name) as string | undefined,
      attributeName: (raw.attributeName || raw.attribute_name) as string | undefined,
      claims,
    };
  },
};

// Review Queue API
export const reviewApi = {
  list: async (filters?: ReviewQueueFilters): Promise<ReviewQueueItem[]> => {
    const response = await api.get('/review-queue', { params: filters });
    const items = response.data as unknown[];
    return items.map((item: unknown) => {
      const raw = item as Record<string, unknown>;
      return {
        id: raw.id as string,
        itemType: (raw.itemType || raw.item_type) as string,
        itemId: (raw.itemId || raw.item_id) as string,
        reason: raw.reason as string,
        priority: parseInt(String(raw.priority || 0), 10),
        status: (raw.status || 'pending') as ReviewQueueItem['status'],
        notes: (raw.notes || null) as string | null,
        resolvedAt: (raw.resolvedAt || raw.resolved_at || null) as string | null,
        resolvedBy: (raw.resolvedBy || raw.resolved_by || null) as string | null,
        createdAt: (raw.createdAt || raw.created_at) as string,
      };
    });
  },

  getStats: async (): Promise<ReviewQueueStats> => {
    const response = await api.get('/review-queue/stats');
    const raw = response.data as Record<string, unknown>;
    return {
      pendingCount: parseInt(String(raw.pendingCount || raw.pending_count || 0), 10),
      inReviewCount: parseInt(String(raw.inReviewCount || raw.in_review_count || 0), 10),
      resolvedCount: parseInt(String(raw.resolvedCount || raw.resolved_count || 0), 10),
      dismissedCount: parseInt(String(raw.dismissedCount || raw.dismissed_count || 0), 10),
      highPriorityCount: parseInt(String(raw.highPriorityCount || raw.high_priority_count || 0), 10),
      avgResolutionHours: raw.avgResolutionHours || raw.avg_resolution_hours
        ? parseFloat(String(raw.avgResolutionHours || raw.avg_resolution_hours))
        : null,
    };
  },

  get: async (id: string): Promise<ReviewQueueItem> => {
    const response = await api.get(`/review-queue/${id}`);
    const raw = response.data as Record<string, unknown>;
    return {
      id: raw.id as string,
      itemType: (raw.itemType || raw.item_type) as string,
      itemId: (raw.itemId || raw.item_id) as string,
      reason: raw.reason as string,
      priority: parseInt(String(raw.priority || 0), 10),
      status: (raw.status || 'pending') as ReviewQueueItem['status'],
      notes: (raw.notes || null) as string | null,
      resolvedAt: (raw.resolvedAt || raw.resolved_at || null) as string | null,
      resolvedBy: (raw.resolvedBy || raw.resolved_by || null) as string | null,
      createdAt: (raw.createdAt || raw.created_at) as string,
    };
  },

  update: async (
    id: string,
    data: Partial<Pick<ReviewQueueItem, 'status' | 'notes'>>
  ): Promise<ReviewQueueItem> => {
    const response = await api.patch(`/review-queue/${id}`, data);
    const raw = response.data as Record<string, unknown>;
    return {
      id: raw.id as string,
      itemType: (raw.itemType || raw.item_type) as string,
      itemId: (raw.itemId || raw.item_id) as string,
      reason: raw.reason as string,
      priority: parseInt(String(raw.priority || 0), 10),
      status: (raw.status || 'pending') as ReviewQueueItem['status'],
      notes: (raw.notes || null) as string | null,
      resolvedAt: (raw.resolvedAt || raw.resolved_at || null) as string | null,
      resolvedBy: (raw.resolvedBy || raw.resolved_by || null) as string | null,
      createdAt: (raw.createdAt || raw.created_at) as string,
    };
  },
};

// Pipeline API
export interface JobProgress {
  current: number;
  total: number;
  message?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  order: number;
  syncType: string;
  isRunning?: boolean;
  runningProgress?: JobProgress | null;
  lastRun?: {
    syncType: string;
    state: string;
    startedAt: string | null;
    completedAt: string | null;
    recordsSynced: number | null;
    errorMessage: string | null;
    progress?: JobProgress | null;
  } | null;
}

export interface RunningJob {
  id: number;
  syncType: string;
  startedAt: string;
  recordsSynced: number | null;
}

export interface PipelineStatus {
  stages: PipelineStage[];
  runningJobs: RunningJob[];
  pipelineHealthy: boolean;
}

export interface SyncHistoryItem {
  id: number;
  syncType: string;
  state: string;
  startedAt: string;
  completedAt: string | null;
  recordsSynced: number | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
}

export interface PipelineStats {
  summary: {
    runs_24h: number;
    success_24h: number;
    failed_24h: number;
    records_24h: number;
    runs_7d: number;
    success_7d: number;
    failed_7d: number;
    records_7d: number;
    runs_total: number;
    success_total: number;
    failed_total: number;
    records_total: number;
    avg_duration_seconds: number | null;
  };
  byStage: Array<{
    syncType: string;
    total_runs: number;
    success_count: number;
    failed_count: number;
    total_records: number;
    last_completed: string | null;
    avg_duration_seconds: number | null;
  }>;
}

export interface DataFlow {
  current: {
    sources: number;
    documents: number;
    snippets: number;
    entities: number;
    claims: number;
    evidence: number;
    conflict_groups: number;
    active_conflicts: number;
    truth_metrics: number;
    field_links: number;
    pending_reviews: number;
  };
  growth: Array<{
    date: string;
    documents_created: number;
  }>;
}

export interface SourceConfig {
  key: string;
  name: string;
  sourceType: string;
  baseTrust: number;
  baseUrl: string;
  independenceCluster: string;
  description?: string;
  defaultDocType: string;
  active: boolean;
  tags?: string[];
  feedCount: number;
  urlCount: number;
}

export interface SourcesConfig {
  sources: SourceConfig[];
  totalSources: number;
  activeSources: number;
  totalFeeds: number;
  totalUrls: number;
}

export interface FeedSchedule {
  sourceKey: string;
  sourceName: string;
  feedUrl: string;
  refreshIntervalMinutes: number;
}

export interface SourcesFeeds {
  feeds: FeedSchedule[];
  totalFeeds: number;
  sourcesWithFeeds: Array<{
    name: string;
    sourceType: string;
    baseTrust: number;
    feedCount: number;
  }>;
}

// Job types
export interface PipelineJob {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: string;
  affects: string[];
  syncType: string;
  isRunning: boolean;
  runningInfo: {
    startedAt: string;
    progress: { current: number; total: number; message: string };
  } | null;
  lastRun: {
    state: string;
    startedAt: string;
    completedAt: string | null;
    recordsSynced: number | null;
    errorMessage: string | null;
  } | null;
}

export interface FeedStatus {
  id: string;
  sourceId: string;
  sourceName: string;
  feedUrl: string;
  feedType: string;
  refreshIntervalMinutes: number;
  isActive: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  errorCount: number;
  createdAt: string;
  isDue: boolean;
  nextFetchAt: string;
  documentCount: number;
}

export interface FeedStatusSummary {
  total: number;
  active: number;
  inactive: number;
  dueForRefresh: number;
  withErrors: number;
  neverFetched: number;
}

export interface JobRunResult {
  runId: string;
  jobId: string;
  jobType: string;
  status: string;
  startedAt: string;
  message: string;
}

export const pipelineApi = {
  getStatus: async (): Promise<PipelineStatus> => {
    const response = await api.get('/pipeline/status');
    return response.data;
  },

  getStages: async (): Promise<{ stages: PipelineStage[] }> => {
    const response = await api.get('/pipeline/stages');
    return response.data;
  },

  getHistory: async (params?: {
    sync_type?: string;
    state?: string;
    limit?: number;
    offset?: number;
    since?: string;
  }): Promise<{ history: SyncHistoryItem[]; count: number }> => {
    const response = await api.get('/pipeline/history', { params });
    return response.data;
  },

  getStats: async (): Promise<PipelineStats> => {
    const response = await api.get('/pipeline/stats');
    return response.data;
  },

  getDataFlow: async (): Promise<DataFlow> => {
    const response = await api.get('/pipeline/data-flow');
    return response.data;
  },

  // Job management
  getJobs: async (): Promise<{ jobs: PipelineJob[] }> => {
    const response = await api.get('/pipeline/jobs');
    return response.data;
  },

  getRunningJobs: async (): Promise<{ running: Array<{ jobId: string; jobType: string; startedAt: string; progress: { current: number; total: number; message: string } }>; count: number }> => {
    const response = await api.get('/pipeline/jobs/running');
    return response.data;
  },

  runJob: async (jobId: string): Promise<JobRunResult> => {
    const response = await api.post(`/pipeline/jobs/${jobId}/run`);
    return response.data;
  },

  cancelJob: async (jobId: string): Promise<{ jobId: string; status: string; message: string }> => {
    const response = await api.post(`/pipeline/jobs/${jobId}/cancel`);
    return response.data;
  },

  // Feed status
  getFeedsStatus: async (): Promise<{ feeds: FeedStatus[]; summary: FeedStatusSummary }> => {
    const response = await api.get('/pipeline/feeds/status');
    return response.data;
  },

  // Pipeline visualization
  getSourcePipelineStats: async (): Promise<SourcePipelineStats> => {
    const response = await api.get('/sources/pipeline-stats');
    return response.data;
  },

  getStageDetails: async (stage: string, limit?: number): Promise<StageDetails> => {
    const response = await api.get(`/pipeline/stage/${stage}/details`, { params: { limit } });
    return response.data;
  },

  // Tree drill-down
  getSourceDocuments: async (sourceId: string, limit?: number): Promise<SourceDocuments> => {
    const response = await api.get(`/sources/${sourceId}/documents`, { params: { limit } });
    return response.data;
  },

  getDocumentSnippets: async (documentId: string, limit?: number): Promise<DocumentSnippets> => {
    const response = await api.get(`/documents/${documentId}/snippets`, { params: { limit } });
    return response.data;
  },

  getSnippetClaims: async (snippetId: string): Promise<SnippetClaims> => {
    const response = await api.get(`/snippets/${snippetId}/claims`);
    return response.data;
  },

  getClaimEvidence: async (claimId: string): Promise<ClaimEvidence> => {
    const response = await api.get(`/claims/${claimId}/evidence`);
    return response.data;
  },
};

// Helper to transform API response to Source type
const transformSource = (raw: Record<string, unknown>): Source => ({
  id: raw.id as string,
  name: raw.name as string,
  sourceType: (raw.sourceType || raw.source_type) as Source['sourceType'],
  baseUrl: (raw.baseUrl || raw.base_url || null) as string | null,
  baseTrust: parseFloat(String(raw.baseTrust || raw.base_trust || 0.5)),
  independenceClusterId: (raw.independenceClusterId || raw.independence_cluster_id || null) as string | null,
  description: (raw.description || null) as string | null,
  defaultDocType: (raw.defaultDocType || raw.default_doc_type || null) as Source['defaultDocType'],
  isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  tags: (raw.tags || []) as string[],
  metadata: (raw.metadata || null) as Record<string, unknown> | null,
  createdAt: (raw.createdAt || raw.created_at) as string,
  updatedAt: (raw.updatedAt || raw.updated_at) as string,
  feeds: raw.feeds ? (raw.feeds as Record<string, unknown>[]).map(transformFeed) : undefined,
  urls: raw.urls ? (raw.urls as Record<string, unknown>[]).map(transformUrl) : undefined,
});

const transformFeed = (raw: Record<string, unknown>): SourceFeed => ({
  id: raw.id as string,
  sourceId: (raw.sourceId || raw.source_id) as string,
  feedUrl: (raw.feedUrl || raw.feed_url) as string,
  feedType: (raw.feedType || raw.feed_type) as SourceFeed['feedType'],
  refreshIntervalMinutes: parseInt(String(raw.refreshIntervalMinutes || raw.refresh_interval_minutes || 60), 10),
  maxItems: parseInt(String(raw.maxItems || raw.max_items || 50), 10),
  isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  lastFetchedAt: (raw.lastFetchedAt || raw.last_fetched_at || null) as string | null,
  lastError: (raw.lastError || raw.last_error || null) as string | null,
  errorCount: parseInt(String(raw.errorCount || raw.error_count || 0), 10),
  metadata: (raw.metadata || null) as Record<string, unknown> | null,
  createdAt: (raw.createdAt || raw.created_at) as string,
  updatedAt: (raw.updatedAt || raw.updated_at) as string,
});

const transformUrl = (raw: Record<string, unknown>): SourceUrl => ({
  id: raw.id as string,
  sourceId: (raw.sourceId || raw.source_id) as string,
  url: raw.url as string,
  isActive: Boolean(raw.isActive ?? raw.is_active ?? true),
  lastFetchedAt: (raw.lastFetchedAt || raw.last_fetched_at || null) as string | null,
  createdAt: (raw.createdAt || raw.created_at) as string,
});

export const sourcesApi = {
  // Legacy endpoints for backward compatibility
  getConfig: async (): Promise<SourcesConfig> => {
    const response = await api.get('/sources/config');
    return response.data;
  },

  getFeeds: async (): Promise<SourcesFeeds> => {
    const response = await api.get('/sources/feeds');
    return response.data;
  },

  // CRUD operations for sources
  list: async (params?: { isActive?: boolean; type?: string }): Promise<{ sources: Source[]; count: number }> => {
    const response = await api.get('/sources', { params });
    const data = response.data as { sources: Record<string, unknown>[]; count: number };
    return {
      sources: data.sources.map(transformSource),
      count: data.count,
    };
  },

  get: async (id: string): Promise<Source> => {
    const response = await api.get(`/sources/${id}`);
    return transformSource(response.data);
  },

  create: async (input: CreateSourceInput): Promise<Source> => {
    const response = await api.post('/sources', input);
    return transformSource(response.data);
  },

  update: async (id: string, input: UpdateSourceInput): Promise<Source> => {
    const response = await api.put(`/sources/${id}`, input);
    return transformSource(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sources/${id}`);
  },

  toggle: async (id: string): Promise<Source> => {
    const response = await api.patch(`/sources/${id}/toggle`);
    return transformSource(response.data);
  },

  // Feed operations
  listFeeds: async (sourceId: string): Promise<SourceFeed[]> => {
    const response = await api.get(`/sources/${sourceId}/feeds`);
    const data = response.data as { feeds: Record<string, unknown>[]; count: number };
    return data.feeds.map(transformFeed);
  },

  createFeed: async (sourceId: string, input: CreateFeedInput): Promise<SourceFeed> => {
    const response = await api.post(`/sources/${sourceId}/feeds`, input);
    return transformFeed(response.data);
  },

  updateFeed: async (feedId: string, input: UpdateFeedInput): Promise<SourceFeed> => {
    const response = await api.put(`/feeds/${feedId}`, input);
    return transformFeed(response.data);
  },

  deleteFeed: async (feedId: string): Promise<void> => {
    await api.delete(`/feeds/${feedId}`);
  },

  toggleFeed: async (feedId: string): Promise<SourceFeed> => {
    const response = await api.patch(`/feeds/${feedId}/toggle`);
    return transformFeed(response.data);
  },

  // URL operations
  listUrls: async (sourceId: string): Promise<SourceUrl[]> => {
    const response = await api.get(`/sources/${sourceId}/urls`);
    const data = response.data as { urls: Record<string, unknown>[]; count: number };
    return data.urls.map(transformUrl);
  },

  createUrl: async (sourceId: string, input: CreateUrlInput): Promise<SourceUrl> => {
    const response = await api.post(`/sources/${sourceId}/urls`, input);
    return transformUrl(response.data);
  },

  deleteUrl: async (urlId: string): Promise<void> => {
    await api.delete(`/urls/${urlId}`);
  },

  // Stats and documents
  getDocuments: async (sourceId: string, params?: { limit?: number; offset?: number }) => {
    const response = await api.get(`/sources/${sourceId}/documents`, { params });
    return response.data;
  },

  getStats: async (sourceId: string) => {
    const response = await api.get(`/sources/${sourceId}/stats`);
    return response.data;
  },
};

export default api;
