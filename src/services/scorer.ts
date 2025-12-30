/**
 * Scorer Service
 * Stage E of the Truth Ledger pipeline
 *
 * Responsibilities:
 * - Compute truth_metrics (RAW scores) for claims
 * - Apply evidence weighting (source trust, doc type, recency)
 * - Handle independence clusters with diminishing returns
 * - Apply low-quality caps
 * - Store results in truth_metrics table
 */

import postgres from 'postgres';
import { getConnection, transaction } from '../db/connection.js';
import { SyncManager } from './sync-manager.js';
import {
  DOC_TYPE_MULTIPLIER,
  LOW_QUALITY_DOC_TYPES,
  LOW_QUALITY_CAP_RATIO,
  RAW_SCORING_CONFIG,
  computeRecencyScore,
  computeClusterWeight,
} from '../config/constants.js';
import type {
  TruthMetrics,
  TruthFactors,
  Claim,
  Evidence,
  DocType,
  ScoringInput,
  ScoringOutput,
} from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ScorerConfig {
  claimIds?: string[];
  conflictGroupIds?: string[];
  entityIds?: string[];
  forceRescore?: boolean;
  limit?: number;
}

export interface ScorerResult {
  syncId: number;
  claimsScored: number;
  metricsCreated: number;
  metricsUpdated: number;
  errors: Array<{ claimId: string; error: string }>;
}

export interface EvidenceWeight {
  evidenceId: string;
  snippetId: string;
  documentId: string;
  sourceId: string;
  sourceName: string;
  docType: DocType;
  stance: 'support' | 'contradict' | 'neutral';

  // Weight components
  baseTrust: number;
  docTypeMultiplier: number;
  extractionConfidence: number;
  recencyScore: number;
  clusterWeight: number;

  // Final weight
  rawWeight: number;
  effectiveWeight: number;

  // Metadata
  independenceClusterId: string | null;
  publishedAt: Date | null;
  isSuperseded: boolean;
  isLowQuality: boolean;
}

// ============================================================================
// SCORER SERVICE
// ============================================================================

export class Scorer {
  /**
   * Score claims and compute truth_metrics
   */
  async score(config: ScorerConfig = {}): Promise<ScorerResult> {
    const sql = getConnection();
    const syncId = await SyncManager.start('truth_score', { config });

    const result: ScorerResult = {
      syncId,
      claimsScored: 0,
      metricsCreated: 0,
      metricsUpdated: 0,
      errors: [],
    };

    try {
      const claims = await this.getClaimsToScore(config);

      for (const claim of claims) {
        try {
          const scoreResult = await this.scoreClaim(claim);
          result.claimsScored++;
          if (scoreResult.created) {
            result.metricsCreated++;
          } else if (scoreResult.updated) {
            result.metricsUpdated++;
          }
        } catch (error) {
          result.errors.push({
            claimId: claim.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await SyncManager.complete(
        syncId,
        result.claimsScored
      );
    } catch (error) {
      await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
      throw error;
    }

    return result;
  }

  /**
   * Get claims that need scoring
   */
  private async getClaimsToScore(config: ScorerConfig): Promise<Claim[]> {
    const sql = getConnection();
    const limit = config.limit || 1000;

    // Helper to build claim SELECT with proper column aliases for camelCase
    const claimColumns = (prefix = '') => {
      const p = prefix ? `${prefix}.` : '';
      return sql`
        ${sql.unsafe(p)}id,
        ${sql.unsafe(p)}claim_key_hash as "claimKeyHash",
        ${sql.unsafe(p)}entity_id as "entityId",
        ${sql.unsafe(p)}attribute_id as "attributeId",
        ${sql.unsafe(p)}value_json as "valueJson",
        ${sql.unsafe(p)}unit,
        ${sql.unsafe(p)}scope_json as "scopeJson",
        ${sql.unsafe(p)}valid_from as "validFrom",
        ${sql.unsafe(p)}valid_to as "validTo",
        ${sql.unsafe(p)}is_derived as "isDerived",
        ${sql.unsafe(p)}derived_from_claim_id as "derivedFromClaimId",
        ${sql.unsafe(p)}parser_notes as "parserNotes",
        ${sql.unsafe(p)}metadata,
        ${sql.unsafe(p)}created_at as "createdAt",
        ${sql.unsafe(p)}updated_at as "updatedAt"
      `;
    };

    if (config.claimIds && config.claimIds.length > 0) {
      return await sql<Claim[]>`
        SELECT
          id,
          claim_key_hash as "claimKeyHash",
          entity_id as "entityId",
          attribute_id as "attributeId",
          value_json as "valueJson",
          unit,
          scope_json as "scopeJson",
          valid_from as "validFrom",
          valid_to as "validTo",
          is_derived as "isDerived",
          derived_from_claim_id as "derivedFromClaimId",
          parser_notes as "parserNotes",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM truth_ledger_claude.claims
        WHERE id = ANY(${config.claimIds})
        ORDER BY created_at ASC
      `;
    }

    if (config.conflictGroupIds && config.conflictGroupIds.length > 0) {
      return await sql<Claim[]>`
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
          c.updated_at as "updatedAt"
        FROM truth_ledger_claude.claims c
        JOIN truth_ledger_claude.conflict_groups cg ON cg.claim_key_hash = c.claim_key_hash
        WHERE cg.id = ANY(${config.conflictGroupIds})
        ORDER BY c.created_at ASC
        LIMIT ${limit}
      `;
    }

    if (config.entityIds && config.entityIds.length > 0) {
      return await sql<Claim[]>`
        SELECT
          id,
          claim_key_hash as "claimKeyHash",
          entity_id as "entityId",
          attribute_id as "attributeId",
          value_json as "valueJson",
          unit,
          scope_json as "scopeJson",
          valid_from as "validFrom",
          valid_to as "validTo",
          is_derived as "isDerived",
          derived_from_claim_id as "derivedFromClaimId",
          parser_notes as "parserNotes",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM truth_ledger_claude.claims
        WHERE entity_id = ANY(${config.entityIds})
        ORDER BY created_at ASC
        LIMIT ${limit}
      `;
    }

    if (config.forceRescore) {
      return await sql<Claim[]>`
        SELECT
          id,
          claim_key_hash as "claimKeyHash",
          entity_id as "entityId",
          attribute_id as "attributeId",
          value_json as "valueJson",
          unit,
          scope_json as "scopeJson",
          valid_from as "validFrom",
          valid_to as "validTo",
          is_derived as "isDerived",
          derived_from_claim_id as "derivedFromClaimId",
          parser_notes as "parserNotes",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM truth_ledger_claude.claims
        ORDER BY created_at ASC
        LIMIT ${limit}
      `;
    }

    // Get claims without metrics or with stale metrics
    return await sql<Claim[]>`
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
        c.updated_at as "updatedAt"
      FROM truth_ledger_claude.claims c
      LEFT JOIN truth_ledger_claude.truth_metrics tm ON tm.claim_id = c.id
      WHERE tm.id IS NULL
         OR tm.computed_at < c.updated_at
      ORDER BY c.created_at ASC
      LIMIT ${limit}
    `;
  }

  /**
   * Score a single claim
   */
  private async scoreClaim(claim: Claim): Promise<{
    created: boolean;
    updated: boolean;
    metrics: TruthMetrics;
  }> {
    const sql = getConnection();

    // Get evidence with full provenance chain
    const evidenceRows = await sql<Array<{
      evidence_id: string;
      snippet_id: string;
      document_id: string;
      source_id: string;
      source_name: string;
      doc_type: DocType;
      stance: 'support' | 'contradict' | 'neutral';
      extraction_confidence: number;
      base_trust: number;
      independence_cluster_id: string | null;
      published_at: Date | null;
      supersedes_document_id: string | null;
    }>>`
      SELECT
        e.id as evidence_id,
        e.snippet_id,
        s.document_id,
        d.source_id,
        src.name as source_name,
        d.doc_type,
        e.stance,
        e.extraction_confidence,
        src.base_trust,
        src.independence_cluster_id,
        d.published_at,
        d.supersedes_document_id
      FROM truth_ledger_claude.evidence e
      JOIN truth_ledger_claude.snippets s ON s.id = e.snippet_id
      JOIN truth_ledger_claude.documents d ON d.id = s.document_id
      JOIN truth_ledger_claude.sources src ON src.id = d.source_id
      WHERE e.claim_id = ${claim.id}
      ORDER BY d.published_at DESC NULLS LAST
    `;

    // Compute weights for each evidence
    const weights = this.computeEvidenceWeights(evidenceRows);

    // Compute scores
    const scores = this.computeScores(weights);

    // Build factors JSON for audit/debug
    const factors: TruthFactors = {
      evidenceCount: weights.length,
      clusterCounts: this.getClusterCounts(weights),
      topContributors: weights
        .sort((a, b) => b.effectiveWeight - a.effectiveWeight)
        .slice(0, 5)
        .map(w => ({
          evidenceId: w.evidenceId,
          weight: w.effectiveWeight,
          sourceId: w.sourceId,
          docType: w.docType,
        })),
      docTypeMultipliers: Object.fromEntries(
        Object.entries(DOC_TYPE_MULTIPLIER)
      ) as Record<DocType, number>,
      lowQualityCapped: scores.lowQualityCapped,
      capsApplied: scores.capsApplied,
    };

    // Get conflict group
    const conflictGroups = await sql<{ id: string }[]>`
      SELECT id FROM truth_ledger_claude.conflict_groups
      WHERE claim_key_hash = ${claim.claimKeyHash}
    `;

    if (conflictGroups.length === 0) {
      throw new Error(`No conflict group found for claim ${claim.id}`);
    }

    // Upsert truth_metrics
    return await transaction(async (txSql) => {
      const existingMetrics = await txSql<TruthMetrics[]>`
        SELECT * FROM truth_ledger_claude.truth_metrics
        WHERE claim_id = ${claim.id}
      `;

      let metrics: TruthMetrics;
      let created = false;
      let updated = false;

      if (existingMetrics.length > 0) {
        // Update existing
        const updateResult = await txSql<TruthMetrics[]>`
          UPDATE truth_ledger_claude.truth_metrics
          SET
            truth_raw = ${scores.truthRaw},
            support_score = ${scores.supportScore},
            contradiction_score = ${scores.contradictionScore},
            independent_sources = ${scores.independentSources},
            recency_score = ${scores.recencyScore},
            specificity_score = ${scores.specificityScore},
            factors_json = ${txSql.json(factors as unknown as postgres.JSONValue)}::jsonb,
            computed_at = NOW()
          WHERE claim_id = ${claim.id}
          RETURNING *
        `;
        metrics = updateResult[0];
        updated = true;
      } else {
        // Insert new
        const insertResult = await txSql<TruthMetrics[]>`
          INSERT INTO truth_ledger_claude.truth_metrics (
            conflict_group_id,
            claim_id,
            truth_raw,
            support_score,
            contradiction_score,
            independent_sources,
            recency_score,
            specificity_score,
            factors_json
          ) VALUES (
            ${conflictGroups[0].id},
            ${claim.id},
            ${scores.truthRaw},
            ${scores.supportScore},
            ${scores.contradictionScore},
            ${scores.independentSources},
            ${scores.recencyScore},
            ${scores.specificityScore},
            ${txSql.json(factors as unknown as postgres.JSONValue)}::jsonb
          )
          RETURNING *
        `;
        metrics = insertResult[0];
        created = true;
      }

      return { created, updated, metrics };
    });
  }

  /**
   * Compute evidence weights
   */
  private computeEvidenceWeights(evidenceRows: Array<{
    evidence_id: string;
    snippet_id: string;
    document_id: string;
    source_id: string;
    source_name: string;
    doc_type: DocType;
    stance: 'support' | 'contradict' | 'neutral';
    extraction_confidence: number;
    base_trust: number;
    independence_cluster_id: string | null;
    published_at: Date | null;
    supersedes_document_id: string | null;
  }>): EvidenceWeight[] {
    const now = new Date();

    // Group by independence cluster to apply diminishing returns
    const clusterPositions = new Map<string, number>();

    return evidenceRows.map(row => {
      const docTypeMultiplier = DOC_TYPE_MULTIPLIER[row.doc_type] || DOC_TYPE_MULTIPLIER.other;
      const recencyScore = computeRecencyScore(
        row.published_at,
        now,
        row.supersedes_document_id !== null
      );

      // Determine cluster position for diminishing returns
      const clusterId = row.independence_cluster_id || row.source_id;
      const position = (clusterPositions.get(clusterId) || 0) + 1;
      clusterPositions.set(clusterId, position);

      const clusterWeight = computeClusterWeight(position);

      // Compute raw weight
      const rawWeight = row.base_trust * docTypeMultiplier * row.extraction_confidence * recencyScore;

      // Apply cluster weight for effective weight
      const effectiveWeight = rawWeight * clusterWeight;

      const isLowQuality = LOW_QUALITY_DOC_TYPES.has(row.doc_type);

      return {
        evidenceId: row.evidence_id,
        snippetId: row.snippet_id,
        documentId: row.document_id,
        sourceId: row.source_id,
        sourceName: row.source_name,
        docType: row.doc_type,
        stance: row.stance,

        baseTrust: row.base_trust,
        docTypeMultiplier,
        extractionConfidence: row.extraction_confidence,
        recencyScore,
        clusterWeight,

        rawWeight,
        effectiveWeight,

        independenceClusterId: row.independence_cluster_id,
        publishedAt: row.published_at,
        isSuperseded: row.supersedes_document_id !== null,
        isLowQuality,
      };
    });
  }

  /**
   * Compute final scores from evidence weights
   */
  private computeScores(weights: EvidenceWeight[]): {
    truthRaw: number;
    supportScore: number;
    contradictionScore: number;
    independentSources: number;
    recencyScore: number;
    specificityScore: number;
    lowQualityCapped: boolean;
    capsApplied: string[];
  } {
    const capsApplied: string[] = [];

    // Separate support and contradict evidence
    const supportWeights = weights.filter(w => w.stance === 'support');
    const contradictWeights = weights.filter(w => w.stance === 'contradict');

    // Sum up support score
    let supportScore = supportWeights.reduce((sum, w) => sum + w.effectiveWeight, 0);

    // Apply low-quality cap
    const lowQualitySupport = supportWeights
      .filter(w => w.isLowQuality)
      .reduce((sum, w) => sum + w.effectiveWeight, 0);

    const highQualitySupport = supportScore - lowQualitySupport;
    const maxLowQualityContribution = highQualitySupport * LOW_QUALITY_CAP_RATIO;
    let lowQualityCapped = false;

    if (lowQualitySupport > maxLowQualityContribution && highQualitySupport > 0) {
      supportScore = highQualitySupport + maxLowQualityContribution;
      lowQualityCapped = true;
      capsApplied.push(`low_quality_capped:${lowQualitySupport.toFixed(3)}->${maxLowQualityContribution.toFixed(3)}`);
    }

    // Contradiction score
    const contradictionScore = contradictWeights.reduce((sum, w) => sum + w.effectiveWeight, 0);

    // Compute truth_raw using the conservative formula:
    // truth_raw = support_score / (support_score + contradiction_score + k)
    const k = RAW_SCORING_CONFIG.k;
    const truthRaw = supportScore / (supportScore + contradictionScore + k);

    // Count independent sources
    const uniqueClusters = new Set(weights.map(w => w.independenceClusterId || w.sourceId));
    const independentSources = uniqueClusters.size;

    // Compute average recency score
    const recencyScore = weights.length > 0
      ? weights.reduce((sum, w) => sum + w.recencyScore, 0) / weights.length
      : 0;

    // Specificity score (placeholder - could be enhanced based on scope specificity)
    const specificityScore = 1.0;

    return {
      truthRaw: Math.min(1.0, Math.max(0.0, truthRaw)),
      supportScore,
      contradictionScore,
      independentSources,
      recencyScore,
      specificityScore,
      lowQualityCapped,
      capsApplied,
    };
  }

  /**
   * Get cluster counts for factors JSON
   */
  private getClusterCounts(weights: EvidenceWeight[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const w of weights) {
      const clusterId = w.independenceClusterId || w.sourceId;
      counts[clusterId] = (counts[clusterId] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get truth metrics for a claim
   */
  static async getMetrics(claimId: string): Promise<TruthMetrics | null> {
    const sql = getConnection();
    const result = await sql<TruthMetrics[]>`
      SELECT * FROM truth_ledger_claude.truth_metrics
      WHERE claim_id = ${claimId}
    `;
    return result[0] || null;
  }

  /**
   * Get all metrics for a conflict group
   */
  static async getGroupMetrics(conflictGroupId: string): Promise<TruthMetrics[]> {
    const sql = getConnection();
    return await sql<TruthMetrics[]>`
      SELECT * FROM truth_ledger_claude.truth_metrics
      WHERE conflict_group_id = ${conflictGroupId}
      ORDER BY truth_raw DESC
    `;
  }

  /**
   * Get best claim for a conflict group based on truth_raw
   */
  static async getBestClaim(claimKeyHash: string): Promise<{
    claim: Claim;
    metrics: TruthMetrics;
  } | null> {
    const sql = getConnection();

    const result = await sql<Array<Claim & TruthMetrics>>`
      SELECT c.*, tm.*
      FROM truth_ledger_claude.claims c
      JOIN truth_ledger_claude.truth_metrics tm ON tm.claim_id = c.id
      WHERE c.claim_key_hash = ${claimKeyHash}
      ORDER BY tm.truth_raw DESC
      LIMIT 1
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      claim: row as Claim,
      metrics: row as TruthMetrics,
    };
  }
}
