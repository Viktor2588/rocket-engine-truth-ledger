/**
 * Truth Ledger Core Types
 * TypeScript type definitions for the truth ledger system
 */

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

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
  createdAt: Date;
  updatedAt: Date;
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
  lastFetchedAt: Date | null;
  lastError: string | null;
  errorCount: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FeedType = 'rss' | 'atom' | 'json' | 'html' | 'api';

export interface SourceUrl {
  id: string;
  sourceId: string;
  url: string;
  isActive: boolean;
  lastFetchedAt: Date | null;
  createdAt: Date;
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

export interface Document {
  id: string;
  sourceId: string;
  title: string;
  url: string | null;
  versionLabel: string | null;
  docType: DocType;
  publishedAt: Date | null;
  retrievedAt: Date;
  contentHash: string;
  rawContent: string | null;
  supersedesDocumentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface Snippet {
  id: string;
  documentId: string;
  locator: string;
  text: string;
  snippetHash: string;
  snippetType: SnippetType;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export type SnippetType = 'text' | 'table' | 'figure' | 'equation' | 'list' | 'other';

export interface Entity {
  id: string;
  entityType: EntityType;
  canonicalName: string;
  engineId: number | null;
  launchVehicleId: number | null;
  countryId: number | null;
  aliases: string[] | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EntityType =
  | 'engine'
  | 'launch_vehicle'
  | 'country'
  | 'satellite'
  | 'launch_site'
  | 'space_mission'
  | 'standard_clause'
  | 'organization'
  | 'other';

export interface Attribute {
  id: string;
  canonicalName: string;
  displayName: string | null;
  valueType: ValueType;
  unit: string | null;
  description: string | null;
  toleranceAbs: number | null;
  toleranceRel: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export type ValueType = 'number' | 'text' | 'boolean' | 'range' | 'enum' | 'date' | 'json';

export interface ConflictGroup {
  id: string;
  claimKeyHash: string;
  entityId: string;
  attributeId: string;
  scopeJson: Record<string, unknown>;
  conflictPresent: boolean;
  statusFactual: ConflictStatus;
  claimCount: number;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ConflictStatus =
  | 'unknown'
  | 'no_conflict'
  | 'active_conflict'
  | 'resolved_by_versioning'
  | 'resolved_by_scope'
  | 'needs_review';

export interface Claim {
  id: string;
  claimKeyHash: string;
  entityId: string;
  attributeId: string;
  valueJson: ClaimValue;
  unit: string | null;
  scopeJson: Record<string, unknown>;
  validFrom: Date | null;
  validTo: Date | null;
  isDerived: boolean;
  derivedFromClaimId: string | null;
  parserNotes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimValue {
  value: unknown;
  type: ValueType;
  confidence?: number;
}

export interface Evidence {
  id: string;
  claimId: string;
  snippetId: string;
  quote: string | null;
  stance: EvidenceStance;
  extractionConfidence: number;
  parserNotes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export type EvidenceStance = 'support' | 'contradict' | 'neutral';

export interface TruthMetrics {
  id: string;
  conflictGroupId: string;
  claimId: string;
  truthRaw: number;
  supportScore: number;
  contradictionScore: number;
  independentSources: number;
  recencyScore: number | null;
  specificityScore: number | null;
  factorsJson: TruthFactors | null;
  computedAt: Date;
}

export interface TruthFactors {
  evidenceCount: number;
  clusterCounts: Record<string, number>;
  topContributors: Array<{
    evidenceId: string;
    weight: number;
    sourceId: string;
    docType: DocType;
  }>;
  docTypeMultipliers: Record<DocType, number>;
  lowQualityCapped: boolean;
  capsApplied: string[];
}

export interface FieldLink {
  id: string;
  entityId: string;
  fieldName: string;
  claimKeyHash: string | null;
  autoUpdate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface FactQueryRequest {
  claimKeyHash?: string;
  entityId?: string;
  entityType?: EntityType;
  domainId?: number;  // e.g., engine_id
  fieldName?: string;
  truthSlider?: number;  // 0.0 to 1.0
  asOf?: Date;
  includeAlternatives?: boolean;
}

export interface FactResponse {
  claimKey: string;
  sliderUsed: number;
  modeLabel: 'Conservative' | 'Balanced' | 'Assertive';
  bestAnswer: ClaimAlternative | null;
  statusDisplay: DisplayStatus;
  conflictPresent: boolean;
  alternatives: ClaimAlternative[];
  metadata: {
    entityName: string;
    attributeName: string;
    scope: Record<string, unknown>;
    computedAt: Date;
  };
}

export interface ClaimAlternative {
  claimId: string;
  value: unknown;
  unit: string | null;
  truthRaw: number;
  truthDisplay: number;
  independentSources: number;
  supportScore: number;
  contradictionScore: number;
  evidence: EvidenceSummary[];
  validFrom: Date | null;
  validTo: Date | null;
}

export interface EvidenceSummary {
  evidenceId: string;
  documentTitle: string;
  documentVersion: string | null;
  publishedAt: Date | null;
  sourceName: string;
  sourceType: SourceType;
  locator: string;
  quote: string | null;
  stance: EvidenceStance;
  extractionConfidence: number;
}

export type DisplayStatus = 'verified' | 'supported' | 'disputed' | 'insufficient' | 'unknown';

// ============================================================================
// PIPELINE TYPES
// ============================================================================

export interface SyncStatus {
  id: number;
  syncType: SyncType;
  state: SyncState;
  startedAt: Date | null;
  completedAt: Date | null;
  recordsSynced: number;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export type SyncType =
  | 'truth_ingest'
  | 'feed_ingest'
  | 'truth_extract'
  | 'conflict_detection'
  | 'truth_derive'
  | 'truth_score';

export type SyncState = 'pending' | 'running' | 'success' | 'failed';

export interface ExtractionResult {
  entityId: string;
  attributeId: string;
  valueJson: ClaimValue;
  unit: string | null;
  scopeJson: Record<string, unknown>;
  validFrom: Date | null;
  validTo: Date | null;
  evidence: Array<{
    snippetId: string;
    quote: string;
    stance: EvidenceStance;
    extractionConfidence: number;
  }>;
}

export interface ScoringInput {
  claimId: string;
  claimKeyHash: string;
  entityId: string;
  attributeId: string;
  valueJson: ClaimValue;
  evidence: Array<{
    evidenceId: string;
    snippetId: string;
    documentId: string;
    sourceId: string;
    stance: EvidenceStance;
    extractionConfidence: number;
    docType: DocType;
    baseTrust: number;
    independenceClusterId: string | null;
    publishedAt: Date | null;
    isSuperseded: boolean;
  }>;
}

export interface ScoringOutput {
  claimId: string;
  truthRaw: number;
  supportScore: number;
  contradictionScore: number;
  independentSources: number;
  recencyScore: number;
  specificityScore: number;
  factorsJson: TruthFactors;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ScopeTemplate {
  profile: string;
  fields: string[];
  required: string[];
  example: Record<string, unknown>;
}

export interface ClaimKeyComponents {
  entityId: string;
  attributeId: string;
  scopeJson: Record<string, unknown>;
}
