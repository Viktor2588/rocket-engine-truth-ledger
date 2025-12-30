/**
 * Conflict Detector Service
 * Stage C of the Truth Ledger pipeline
 *
 * Responsibilities:
 * - Analyze conflict groups for value disagreements
 * - Apply tolerance rules to determine if values conflict
 * - Update conflict_groups status_factual
 * - Flag items for human review when needed
 */

import postgres from 'postgres';
import { getConnection } from '../db/connection.js';
import { SyncManager } from './sync-manager.js';
import type {
  ConflictGroup,
  Claim,
  Attribute,
  ConflictStatus,
  ClaimValue,
} from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ConflictDetectionConfig {
  conflictGroupIds?: string[];
  entityIds?: string[];
  forceRecheck?: boolean;
  limit?: number;
  /** Callback to check if job was cancelled - throws if cancelled */
  checkCancelled?: () => void;
  /** Callback to report progress */
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface ConflictDetectionResult {
  syncId: number;
  groupsAnalyzed: number;
  conflictsFound: number;
  conflictsResolved: number;
  reviewItemsCreated: number;
  errors: Array<{ groupId: string; error: string }>;
}

export interface ConflictAnalysis {
  conflictGroupId: string;
  claimKeyHash: string;
  claims: ClaimSummary[];
  hasConflict: boolean;
  conflictType: 'value_disagreement' | 'version_conflict' | 'scope_conflict' | 'none';
  recommendedStatus: ConflictStatus;
  needsReview: boolean;
  reviewReason?: string;
  details: Record<string, unknown>;
}

export interface ClaimSummary {
  claimId: string;
  value: unknown;
  valueType: string;
  unit?: string;
  evidenceCount: number;
  latestEvidenceDate?: Date;
}

// ============================================================================
// CONFLICT DETECTOR SERVICE
// ============================================================================

export class ConflictDetector {
  /**
   * Detect conflicts in pending conflict groups
   */
  async detectConflicts(config: ConflictDetectionConfig = {}): Promise<ConflictDetectionResult> {
    const sql = getConnection();
    const syncId = await SyncManager.start('truth_extract', { operation: 'conflict_detection', config });

    const result: ConflictDetectionResult = {
      syncId,
      groupsAnalyzed: 0,
      conflictsFound: 0,
      conflictsResolved: 0,
      reviewItemsCreated: 0,
      errors: [],
    };

    try {
      const groups = await this.getGroupsToAnalyze(config);
      const totalGroups = groups.length;

      for (let i = 0; i < groups.length; i++) {
        // Check for cancellation before processing each group
        if (config.checkCancelled) {
          config.checkCancelled();
        }

        const group = groups[i];
        try {
          const analysis = await this.analyzeGroup(group);
          await this.applyAnalysis(analysis);

          result.groupsAnalyzed++;

          if (analysis.hasConflict) {
            result.conflictsFound++;
          }

          if (analysis.recommendedStatus === 'resolved_by_versioning' ||
              analysis.recommendedStatus === 'resolved_by_scope') {
            result.conflictsResolved++;
          }

          if (analysis.needsReview) {
            await this.createReviewItem(analysis);
            result.reviewItemsCreated++;
          }
        } catch (error) {
          result.errors.push({
            groupId: group.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Report progress every 10 groups or at completion
        if ((i + 1) % 10 === 0 || i === totalGroups - 1) {
          if (config.onProgress) {
            const progressPct = Math.floor(((i + 1) / totalGroups) * 100);
            config.onProgress(progressPct, 100, `Analyzed ${i + 1}/${totalGroups} groups`);
          }
        }
      }

      await SyncManager.complete(syncId, result.groupsAnalyzed);
    } catch (error) {
      await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
      throw error;
    }

    return result;
  }

  /**
   * Get conflict groups that need analysis
   */
  private async getGroupsToAnalyze(config: ConflictDetectionConfig): Promise<ConflictGroup[]> {
    const sql = getConnection();
    const limit = config.limit || 500;

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

    if (config.conflictGroupIds && config.conflictGroupIds.length > 0) {
      return await sql<ConflictGroup[]>`
        SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
        WHERE id = ANY(${config.conflictGroupIds})
        ORDER BY updated_at ASC
        LIMIT ${limit}
      `;
    }

    if (config.entityIds && config.entityIds.length > 0) {
      return await sql<ConflictGroup[]>`
        SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
        WHERE entity_id = ANY(${config.entityIds})
        ORDER BY updated_at ASC
        LIMIT ${limit}
      `;
    }

    // Get groups with multiple claims that haven't been analyzed recently
    // or groups where status is still 'unknown'
    const query = config.forceRecheck
      ? sql<ConflictGroup[]>`
          SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
          WHERE claim_count > 0
          ORDER BY updated_at ASC
          LIMIT ${limit}
        `
      : sql<ConflictGroup[]>`
          SELECT ${sql.unsafe(cgColumns)} FROM truth_ledger_claude.conflict_groups
          WHERE status_factual = 'unknown'
            AND claim_count > 0
          ORDER BY created_at ASC
          LIMIT ${limit}
        `;

    return await query;
  }

  /**
   * Analyze a single conflict group
   */
  async analyzeGroup(group: ConflictGroup): Promise<ConflictAnalysis> {
    const sql = getConnection();

    // Get all claims in this group with evidence counts
    const claims = await sql<Array<Claim & { evidenceCount: number; latestEvidenceDate: Date | null }>>`
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
        COUNT(e.id)::int as "evidenceCount",
        MAX(d.published_at) as "latestEvidenceDate"
      FROM truth_ledger_claude.claims c
      LEFT JOIN truth_ledger_claude.evidence e ON e.claim_id = c.id
      LEFT JOIN truth_ledger_claude.snippets s ON s.id = e.snippet_id
      LEFT JOIN truth_ledger_claude.documents d ON d.id = s.document_id
      WHERE c.claim_key_hash = ${group.claimKeyHash}
      GROUP BY c.id
      ORDER BY COUNT(e.id) DESC, c.created_at ASC
    `;

    const claimSummaries: ClaimSummary[] = claims.map(c => ({
      claimId: c.id,
      value: (c.valueJson as ClaimValue).value,
      valueType: (c.valueJson as ClaimValue).type,
      unit: c.unit || undefined,
      evidenceCount: c.evidenceCount,
      latestEvidenceDate: c.latestEvidenceDate || undefined,
    }));

    // Get the attribute for tolerance checking
    const attributes = await sql<Attribute[]>`
      SELECT
        id,
        canonical_name as "canonicalName",
        display_name as "displayName",
        value_type as "valueType",
        unit,
        description,
        tolerance_abs as "toleranceAbs",
        tolerance_rel as "toleranceRel",
        metadata,
        created_at as "createdAt"
      FROM truth_ledger_claude.attributes WHERE id = ${group.attributeId}
    `;
    const attribute = attributes[0];

    // Analyze for conflicts
    const analysis = this.analyzeValues(group, claimSummaries, attribute);

    return analysis;
  }

  /**
   * Analyze values for conflicts
   */
  private analyzeValues(
    group: ConflictGroup,
    claims: ClaimSummary[],
    attribute: Attribute
  ): ConflictAnalysis {
    const analysis: ConflictAnalysis = {
      conflictGroupId: group.id,
      claimKeyHash: group.claimKeyHash,
      claims,
      hasConflict: false,
      conflictType: 'none',
      recommendedStatus: 'unknown',
      needsReview: false,
      details: {},
    };

    // Single claim = no conflict possible
    if (claims.length <= 1) {
      analysis.recommendedStatus = 'no_conflict';
      return analysis;
    }

    // Group claims by value (using tolerance)
    const valueGroups = this.groupByValue(claims, attribute);
    analysis.details.valueGroups = valueGroups.length;
    analysis.details.uniqueValues = valueGroups.map(g => g[0].value);

    if (valueGroups.length === 1) {
      // All values are within tolerance - no conflict
      analysis.recommendedStatus = 'no_conflict';
      return analysis;
    }

    // Multiple distinct values - there's a conflict
    analysis.hasConflict = true;
    analysis.conflictType = 'value_disagreement';

    // Check if this might be a version conflict (can be resolved by time)
    const versioningResolution = this.checkVersioningResolution(valueGroups);
    if (versioningResolution.canResolve) {
      analysis.recommendedStatus = 'resolved_by_versioning';
      analysis.details.versioningAnalysis = versioningResolution;
      return analysis;
    }

    // Check evidence quality
    const evidenceAnalysis = this.analyzeEvidenceQuality(valueGroups);
    analysis.details.evidenceAnalysis = evidenceAnalysis;

    if (evidenceAnalysis.clearWinner) {
      // One value has significantly better evidence
      analysis.recommendedStatus = 'active_conflict';
      analysis.details.leadingValue = evidenceAnalysis.leadingValue;
    } else {
      // Genuine conflict requiring review
      analysis.recommendedStatus = 'needs_review';
      analysis.needsReview = true;
      analysis.reviewReason = 'Multiple conflicting values with comparable evidence';
    }

    return analysis;
  }

  /**
   * Group claims by similar values (within tolerance)
   */
  private groupByValue(claims: ClaimSummary[], attribute: Attribute): ClaimSummary[][] {
    const groups: ClaimSummary[][] = [];
    const assigned = new Set<string>();

    for (const claim of claims) {
      if (assigned.has(claim.claimId)) continue;

      const group = [claim];
      assigned.add(claim.claimId);

      // Find other claims with same value (within tolerance)
      for (const other of claims) {
        if (assigned.has(other.claimId)) continue;
        if (this.valuesMatch(claim, other, attribute)) {
          group.push(other);
          assigned.add(other.claimId);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  /**
   * Check if two claim values match (within tolerance)
   */
  private valuesMatch(a: ClaimSummary, b: ClaimSummary, attribute: Attribute): boolean {
    // Different types never match
    if (a.valueType !== b.valueType) return false;

    if (a.valueType === 'number' && typeof a.value === 'number' && typeof b.value === 'number') {
      // Use attribute-specific or default tolerance
      const toleranceAbs = attribute?.toleranceAbs || null;
      const toleranceRel = attribute?.toleranceRel || 0.02;

      const absDiff = Math.abs(a.value - b.value);
      const maxVal = Math.max(Math.abs(a.value), Math.abs(b.value));
      const threshold = Math.max(toleranceAbs || 0, toleranceRel * maxVal);

      return absDiff <= threshold;
    }

    // For other types, require exact match
    return a.value === b.value;
  }

  /**
   * Check if conflict can be resolved by versioning (newer overrides older)
   */
  private checkVersioningResolution(valueGroups: ClaimSummary[][]): {
    canResolve: boolean;
    reason?: string;
    newestValue?: unknown;
  } {
    // Sort groups by latest evidence date
    const sortedGroups = [...valueGroups].sort((a, b) => {
      const aDate = Math.max(...a.map(c => c.latestEvidenceDate?.getTime() || 0));
      const bDate = Math.max(...b.map(c => c.latestEvidenceDate?.getTime() || 0));
      return bDate - aDate;
    });

    const newest = sortedGroups[0];
    const secondNewest = sortedGroups[1];

    if (!newest[0].latestEvidenceDate || !secondNewest[0].latestEvidenceDate) {
      return { canResolve: false };
    }

    const newestDate = Math.max(...newest.map(c => c.latestEvidenceDate?.getTime() || 0));
    const secondDate = Math.max(...secondNewest.map(c => c.latestEvidenceDate?.getTime() || 0));

    // If newest is at least 180 days newer and from more/equal evidence sources
    const daysDiff = (newestDate - secondDate) / (1000 * 60 * 60 * 24);
    const newestEvidence = newest.reduce((sum, c) => sum + c.evidenceCount, 0);
    const secondEvidence = secondNewest.reduce((sum, c) => sum + c.evidenceCount, 0);

    if (daysDiff > 180 && newestEvidence >= secondEvidence) {
      return {
        canResolve: true,
        reason: `Newest value is ${Math.round(daysDiff)} days more recent with comparable evidence`,
        newestValue: newest[0].value,
      };
    }

    return { canResolve: false };
  }

  /**
   * Analyze evidence quality across value groups
   */
  private analyzeEvidenceQuality(valueGroups: ClaimSummary[][]): {
    clearWinner: boolean;
    leadingValue?: unknown;
    evidenceCounts: number[];
  } {
    const evidenceCounts = valueGroups.map(g =>
      g.reduce((sum, c) => sum + c.evidenceCount, 0)
    );

    const maxEvidence = Math.max(...evidenceCounts);
    const secondMax = evidenceCounts.filter(c => c !== maxEvidence).sort((a, b) => b - a)[0] || 0;

    // Clear winner if leading value has at least 2x the evidence
    if (maxEvidence >= 2 * secondMax && maxEvidence >= 2) {
      const winnerIndex = evidenceCounts.indexOf(maxEvidence);
      return {
        clearWinner: true,
        leadingValue: valueGroups[winnerIndex][0].value,
        evidenceCounts,
      };
    }

    return {
      clearWinner: false,
      evidenceCounts,
    };
  }

  /**
   * Apply analysis results to the database
   */
  private async applyAnalysis(analysis: ConflictAnalysis): Promise<void> {
    const sql = getConnection();

    await sql`
      UPDATE truth_ledger_claude.conflict_groups
      SET conflict_present = ${analysis.hasConflict},
          status_factual = ${analysis.recommendedStatus},
          metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json(analysis.details as postgres.JSONValue)}::jsonb,
          updated_at = NOW()
      WHERE id = ${analysis.conflictGroupId}
    `;
  }

  /**
   * Create a review queue item for conflicts needing human attention
   */
  private async createReviewItem(analysis: ConflictAnalysis): Promise<void> {
    const sql = getConnection();

    await sql`
      INSERT INTO truth_ledger_claude.review_queue (
        item_type,
        item_id,
        reason,
        priority,
        notes
      ) VALUES (
        'conflict_group',
        ${analysis.conflictGroupId}::uuid,
        ${analysis.reviewReason || 'needs_review'},
        5,
        ${JSON.stringify(analysis.details)}
      )
      ON CONFLICT DO NOTHING
    `;
  }

  /**
   * Get conflict summary for an entity
   */
  async getEntityConflictSummary(entityId: string): Promise<{
    totalGroups: number;
    withConflicts: number;
    needsReview: number;
    groups: ConflictGroup[];
  }> {
    const sql = getConnection();

    const groups = await sql<ConflictGroup[]>`
      SELECT
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
      FROM truth_ledger_claude.conflict_groups
      WHERE entity_id = ${entityId}
      ORDER BY conflict_present DESC, claim_count DESC
    `;

    return {
      totalGroups: groups.length,
      withConflicts: groups.filter(g => g.conflictPresent).length,
      needsReview: groups.filter(g => g.statusFactual === 'needs_review').length,
      groups,
    };
  }
}
