// Entity types
export interface Entity {
  id: string;
  type: string;
  name: string;
  aliases: string[];
  description: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Attribute types
export interface Attribute {
  id: string;
  name: string;
  dataType: string;
  unit: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
}

// Source types
export type SourceType =
  | 'regulator'
  | 'standards_body'
  | 'government_agency'
  | 'manufacturer'
  | 'research'
  | 'peer_reviewed'
  | 'news'
  | 'blog'
  | 'wiki'
  | 'forum'
  | 'social_media'
  | 'other';

export type DocType =
  | 'regulation'
  | 'standard'
  | 'standard_or_policy'
  | 'peer_reviewed_paper'
  | 'technical_report'
  | 'manufacturer_datasheet'
  | 'company_news'
  | 'news_article'
  | 'blog_post'
  | 'social_media'
  | 'wiki'
  | 'forum_post'
  | 'other';

export type FeedType = 'rss' | 'atom' | 'json' | 'html' | 'api';

export interface Source {
  id: string;
  name: string;
  sourceType: SourceType;
  baseUrl: string | null;
  baseTrust: number;
  independenceClusterId: string | null;
  description: string | null;
  defaultDocType: DocType | null;
  isActive: boolean;
  tags: string[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // Related data (populated by API)
  feeds?: SourceFeed[];
  urls?: SourceUrl[];
}

export interface SourceFeed {
  id: string;
  sourceId: string;
  feedUrl: string;
  feedType: FeedType;
  refreshIntervalMinutes: number;
  maxItems: number;
  isActive: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
  errorCount: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceUrl {
  id: string;
  sourceId: string;
  url: string;
  isActive: boolean;
  lastFetchedAt: string | null;
  createdAt: string;
}

export interface CreateSourceInput {
  name: string;
  sourceType: SourceType;
  baseUrl?: string;
  baseTrust: number;
  independenceClusterId?: string;
  description?: string;
  defaultDocType?: DocType;
  isActive?: boolean;
  tags?: string[];
}

export interface UpdateSourceInput {
  name?: string;
  sourceType?: SourceType;
  baseUrl?: string | null;
  baseTrust?: number;
  independenceClusterId?: string | null;
  description?: string | null;
  defaultDocType?: DocType | null;
  isActive?: boolean;
  tags?: string[];
}

export interface CreateFeedInput {
  feedUrl: string;
  feedType: FeedType;
  refreshIntervalMinutes?: number;
  maxItems?: number;
  isActive?: boolean;
}

export interface UpdateFeedInput {
  feedUrl?: string;
  feedType?: FeedType;
  refreshIntervalMinutes?: number;
  maxItems?: number;
  isActive?: boolean;
}

export interface CreateUrlInput {
  url: string;
  isActive?: boolean;
}

// Claim types
export interface Claim {
  id: string;
  entityId: string;
  attributeId: string;
  sourceId: string;
  value: unknown;
  unit: string | null;
  confidence: number | null;
  extractedAt: string;
  validFrom: string | null;
  validTo: string | null;
  scopeJson: Record<string, unknown> | null;
  provenanceChain: Record<string, unknown> | null;
  rawText: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ClaimWithDetails extends Claim {
  attributeName: string;
  sourceName: string;
  sourceDefaultTrust: number;
  truthRaw: number | null;
}

// Fact types
export interface Fact {
  entityId: string;
  attributeId: string;
  scopeJson: Record<string, unknown> | null;
  bestClaimId: string;
  aggregatedTruth: number;
  claimCount: number;
  updatedAt: string;
  // Joined fields
  attributeName: string;
  bestValue: unknown;
  bestUnit: string | null;
  sourceName: string;
}

// Conflict group types
export interface ConflictGroup {
  id: string;
  claimKeyHash: string;
  entityId: string;
  attributeId: string;
  scopeJson: Record<string, unknown> | null;
  conflictPresent: boolean;
  statusFactual: string;
  claimCount: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  entityName?: string;
  attributeName?: string;
}

export interface ConflictGroupWithClaims extends ConflictGroup {
  claims: ClaimWithDetails[];
}

// Review queue types
export interface ReviewQueueItem {
  id: string;
  itemType: string;
  itemId: string;
  reason: string;
  priority: number;
  status: 'pending' | 'in_review' | 'resolved' | 'dismissed';
  notes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface ReviewQueueStats {
  pendingCount: number;
  inReviewCount: number;
  resolvedCount: number;
  dismissedCount: number;
  highPriorityCount: number;
  avgResolutionHours: number | null;
}

// Stats types
export interface LedgerStats {
  entityCount: number;
  claimCount: number;
  sourceCount: number;
  attributeCount: number;
  factCount: number;
  conflictCount: number;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Filter/query types
export interface EntityFilters {
  type?: string;
  name?: string;
  limit?: number;
  offset?: number;
}

export interface ConflictFilters {
  entityId?: string;
  hasConflict?: boolean;
  limit?: number;
  offset?: number;
}

export interface ReviewQueueFilters {
  status?: string;
  itemType?: string;
  limit?: number;
  offset?: number;
}

// Pipeline visualization types
export interface SourcePipelineStats {
  sources: SourceWithPipelineStats[];
  totals: {
    documents: number;
    snippets: number;
    claims: number;
    evidence: number;
  };
}

export interface SourceWithPipelineStats {
  id: string;
  name: string;
  sourceType: SourceType;
  baseTrust: number;
  isActive: boolean;
  stats: {
    documents: number;
    snippets: number;
    claims: number;
    evidence: number;
  };
  recentActivity: {
    lastDocumentAt: string | null;
    lastClaimAt: string | null;
  };
}

export interface StageDetails {
  stage: string;
  totalCount: number;
  bySource: {
    sourceId: string;
    sourceName: string;
    count: number;
    percentage: number;
  }[];
  samples: unknown[];
  processingStats: {
    last24h: number;
    last7d: number;
  };
  summary?: {
    avgTruth: number;
    highConfidence: number;
    lowConfidence: number;
  };
}

export interface SourceDocuments {
  documents: {
    id: string;
    title: string;
    url: string;
    docType: string;
    publishedAt: string | null;
    retrievedAt: string;
    snippetCount: number;
  }[];
  total: number;
}

export interface DocumentSnippets {
  snippets: {
    id: string;
    locator: string;
    text: string;
    snippetType: string;
    createdAt: string;
  }[];
  total: number;
}

export interface SnippetClaims {
  claims: {
    id: string;
    valueJson: unknown;
    unit: string | null;
    scopeJson: unknown;
    entityName: string | null;
    attributeName: string | null;
    stance: string;
    confidence: number;
    quote: string;
  }[];
  total: number;
}

export interface ClaimEvidence {
  evidence: {
    id: string;
    quote: string;
    stance: string;
    confidence: number;
    locator: string;
    snippetText: string;
    documentTitle: string;
    documentUrl: string;
    sourceName: string;
  }[];
  total: number;
}

// Extractor pattern types
export interface ExtractorPattern {
  id: string;
  name: string;
  description: string | null;
  attributePattern: string;
  entityType: string | null;  // Uses ENTITY_TYPES from entity-types.ts
  patterns: string[];
  targetUnit: string | null;
  unitConversions: Record<string, number>;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExtractorPatternInput {
  name: string;
  description?: string;
  attributePattern: string;
  entityType?: string;  // Uses ENTITY_TYPES from entity-types.ts
  patterns: string[];
  targetUnit?: string;
  unitConversions?: Record<string, number>;
  isActive?: boolean;
  priority?: number;
}

export interface UpdateExtractorPatternInput {
  name?: string;
  description?: string;
  attributePattern?: string;
  entityType?: string | null;  // Uses ENTITY_TYPES from entity-types.ts
  patterns?: string[];
  targetUnit?: string;
  unitConversions?: Record<string, number>;
  isActive?: boolean;
  priority?: number;
}

export interface PatternTestResult {
  matches: {
    pattern: string;
    match: string;
    value: number;
    unit: string | null;
    convertedValue: number | null;
  }[];
  targetUnit: string | null;
  matchCount: number;
}

// Entity management types (extended for CRUD)
export interface CreateEntityInput {
  canonicalName: string;
  entityType: string;  // Uses ENTITY_TYPES from entity-types.ts
  aliases?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateEntityInput {
  canonicalName?: string;
  aliases?: string[];
  metadata?: Record<string, unknown>;
}
