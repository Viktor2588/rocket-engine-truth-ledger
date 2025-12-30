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
