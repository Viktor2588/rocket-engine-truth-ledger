/**
 * Fact Resolver Service
 * Core query engine for the Truth Ledger API
 *
 * Responsibilities:
 * - Resolve queries by claim_key_hash or entity+field
 * - Compute truth_display from truth_raw + truth_slider
 * - Apply display gates to determine best_answer eligibility
 * - Return alternatives with full evidence provenance
 */

import { getConnection } from '../db/connection.js';
import {
  computeTruthDisplay,
  computeDisplayStatus,
  interpolateSliderValue,
  DISPLAY_POLICY,
} from '../config/constants.js';
import type {
  FactQueryRequest,
  FactResponse,
  ClaimAlternative,
  EvidenceSummary,
  Claim,
  TruthMetrics,
  ConflictGroup,
  Entity,
  Attribute,
  DisplayStatus,
  ClaimValue,
} from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

interface ResolvedFact {
  conflictGroup: ConflictGroup;
  entity: Entity;
  attribute: Attribute;
  claims: Array<{
    claim: Claim;
    metrics: TruthMetrics | null;
    evidence: EvidenceSummary[];
  }>;
}

// ============================================================================
// FACT RESOLVER SERVICE
// ============================================================================

export class FactResolver {
  /**
   * Resolve a fact query
   */
  async resolve(request: FactQueryRequest): Promise<FactResponse> {
    const slider = Math.min(1, Math.max(0, request.truthSlider ?? 0.5));

    // Get the resolved fact data
    const resolved = await this.getResolvedFact(request);

    if (!resolved) {
      return this.createNotFoundResponse(request, slider);
    }

    // Build alternatives with display scores
    const alternatives = this.buildAlternatives(resolved.claims, slider);

    // Determine best answer based on display gates
    const bestAnswer = this.selectBestAnswer(alternatives, slider);

    // Determine display status
    const statusDisplay = bestAnswer
      ? computeDisplayStatus(
          bestAnswer.truthDisplay,
          bestAnswer.independentSources,
          bestAnswer.contradictionScore,
          slider
        )
      : 'insufficient';

    // Build response
    const response: FactResponse = {
      claimKey: resolved.conflictGroup.claimKeyHash,
      sliderUsed: slider,
      modeLabel: this.getModeLabel(slider),
      bestAnswer,
      statusDisplay,
      conflictPresent: resolved.conflictGroup.conflictPresent,
      alternatives,
      metadata: {
        entityName: resolved.entity.canonicalName,
        attributeName: resolved.attribute.canonicalName,
        scope: resolved.conflictGroup.scopeJson,
        computedAt: new Date(),
      },
    };

    return response;
  }

  /**
   * Get resolved fact by various lookup methods
   */
  private async getResolvedFact(request: FactQueryRequest): Promise<ResolvedFact | null> {
    const sql = getConnection();

    // Method 1: Direct claim_key_hash lookup
    if (request.claimKeyHash) {
      return await this.resolveByClaimKeyHash(request.claimKeyHash);
    }

    // Method 2: Entity ID + field name lookup
    if (request.entityId && request.fieldName) {
      return await this.resolveByEntityField(request.entityId, request.fieldName);
    }

    // Method 3: Domain ID + entity type + field name lookup
    if (request.domainId && request.entityType && request.fieldName) {
      return await this.resolveByDomainId(
        request.entityType,
        request.domainId,
        request.fieldName
      );
    }

    return null;
  }

  /**
   * Resolve by claim_key_hash
   */
  private async resolveByClaimKeyHash(claimKeyHash: string): Promise<ResolvedFact | null> {
    const sql = getConnection();

    // Get conflict group with proper column aliases
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
      WHERE claim_key_hash = ${claimKeyHash}
    `;

    if (groups.length === 0) return null;
    const conflictGroup = groups[0];

    // Get entity and attribute with proper column aliases
    const [entities, attributes] = await Promise.all([
      sql<Entity[]>`
        SELECT
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
        FROM truth_ledger_claude.entities WHERE id = ${conflictGroup.entityId}
      `,
      sql<Attribute[]>`
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
        FROM truth_ledger_claude.attributes WHERE id = ${conflictGroup.attributeId}
      `,
    ]);

    if (entities.length === 0 || attributes.length === 0) return null;

    // Get claims with metrics and evidence
    const claims = await this.getClaimsWithEvidence(claimKeyHash);

    return {
      conflictGroup,
      entity: entities[0],
      attribute: attributes[0],
      claims,
    };
  }

  /**
   * Resolve by entity ID and field name
   */
  private async resolveByEntityField(
    entityId: string,
    fieldName: string
  ): Promise<ResolvedFact | null> {
    const sql = getConnection();

    // Get field link
    const links = await sql<{ claim_key_hash: string }[]>`
      SELECT claim_key_hash FROM truth_ledger_claude.field_links
      WHERE entity_id = ${entityId} AND field_name = ${fieldName}
    `;

    if (links.length === 0 || !links[0].claim_key_hash) return null;

    return await this.resolveByClaimKeyHash(links[0].claim_key_hash);
  }

  /**
   * Resolve by domain table ID (e.g., engine_id) and field name
   */
  private async resolveByDomainId(
    entityType: string,
    domainId: number,
    fieldName: string
  ): Promise<ResolvedFact | null> {
    const sql = getConnection();

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

    // Build the entity lookup based on entity type
    let entities: Entity[];

    switch (entityType) {
      case 'engine':
        entities = await sql<Entity[]>`
          SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities
          WHERE engine_id = ${domainId}
        `;
        break;
      case 'launch_vehicle':
        entities = await sql<Entity[]>`
          SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities
          WHERE launch_vehicle_id = ${domainId}
        `;
        break;
      case 'country':
        entities = await sql<Entity[]>`
          SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities
          WHERE country_id = ${domainId}
        `;
        break;
      default:
        return null;
    }

    if (entities.length === 0) return null;

    return await this.resolveByEntityField(entities[0].id, fieldName);
  }

  /**
   * Get claims with metrics and evidence
   */
  private async getClaimsWithEvidence(claimKeyHash: string): Promise<Array<{
    claim: Claim;
    metrics: TruthMetrics | null;
    evidence: EvidenceSummary[];
  }>> {
    const sql = getConnection();

    // Get all claims for this bucket with proper column aliases
    const claims = await sql<Claim[]>`
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
      WHERE claim_key_hash = ${claimKeyHash}
      ORDER BY created_at ASC
    `;

    const result = [];

    for (const claim of claims) {
      // Get metrics with proper column aliases
      const metrics = await sql<TruthMetrics[]>`
        SELECT
          id,
          conflict_group_id as "conflictGroupId",
          claim_id as "claimId",
          truth_raw as "truthRaw",
          support_score as "supportScore",
          contradiction_score as "contradictionScore",
          independent_sources as "independentSources",
          recency_score as "recencyScore",
          specificity_score as "specificityScore",
          factors_json as "factorsJson",
          computed_at as "computedAt"
        FROM truth_ledger_claude.truth_metrics
        WHERE claim_id = ${claim.id}
      `;

      // Get evidence with provenance
      const evidence = await sql<Array<{
        evidence_id: string;
        document_title: string;
        document_version: string | null;
        published_at: Date | null;
        source_name: string;
        source_type: string;
        locator: string;
        quote: string | null;
        stance: 'support' | 'contradict' | 'neutral';
        extraction_confidence: number;
      }>>`
        SELECT
          e.id as evidence_id,
          d.title as document_title,
          d.version_label as document_version,
          d.published_at,
          src.name as source_name,
          src.source_type,
          s.locator,
          e.quote,
          e.stance,
          e.extraction_confidence
        FROM truth_ledger_claude.evidence e
        JOIN truth_ledger_claude.snippets s ON s.id = e.snippet_id
        JOIN truth_ledger_claude.documents d ON d.id = s.document_id
        JOIN truth_ledger_claude.sources src ON src.id = d.source_id
        WHERE e.claim_id = ${claim.id}
        ORDER BY d.published_at DESC NULLS LAST
      `;

      result.push({
        claim,
        metrics: metrics[0] || null,
        evidence: evidence.map(e => ({
          evidenceId: e.evidence_id,
          documentTitle: e.document_title,
          documentVersion: e.document_version,
          publishedAt: e.published_at,
          sourceName: e.source_name,
          sourceType: e.source_type as any,
          locator: e.locator,
          quote: e.quote,
          stance: e.stance,
          extractionConfidence: e.extraction_confidence,
        })),
      });
    }

    return result;
  }

  /**
   * Build alternatives array with computed display scores
   */
  private buildAlternatives(
    claims: Array<{
      claim: Claim;
      metrics: TruthMetrics | null;
      evidence: EvidenceSummary[];
    }>,
    slider: number
  ): ClaimAlternative[] {
    return claims
      .map(({ claim, metrics, evidence }) => {
        const truthRaw = metrics?.truthRaw ?? 0;
        const truthDisplay = computeTruthDisplay(truthRaw, slider);

        return {
          claimId: claim.id,
          value: (claim.valueJson as ClaimValue).value,
          unit: claim.unit,
          truthRaw,
          truthDisplay,
          independentSources: metrics?.independentSources ?? 0,
          supportScore: metrics?.supportScore ?? 0,
          contradictionScore: metrics?.contradictionScore ?? 0,
          evidence,
          validFrom: claim.validFrom,
          validTo: claim.validTo,
        };
      })
      .sort((a, b) => b.truthDisplay - a.truthDisplay);
  }

  /**
   * Select best answer based on display gates
   */
  private selectBestAnswer(
    alternatives: ClaimAlternative[],
    slider: number
  ): ClaimAlternative | null {
    if (alternatives.length === 0) return null;

    const best = alternatives[0];

    // Get threshold values for current slider position
    const minTruth = interpolateSliderValue(DISPLAY_POLICY.minTruthToShowBestAnswer, slider);
    const minSources = interpolateSliderValue(DISPLAY_POLICY.minIndependentSources, slider);
    const maxContradiction = interpolateSliderValue(DISPLAY_POLICY.maxAllowedContradiction, slider);
    const tieMargin = interpolateSliderValue(DISPLAY_POLICY.tieMargin, slider);

    // Check display gates
    if (best.truthDisplay < minTruth) {
      return null;  // Below truth threshold
    }

    if (best.independentSources < minSources) {
      return null;  // Not enough independent sources
    }

    if (best.contradictionScore > maxContradiction) {
      return null;  // Too much contradiction
    }

    // Check for tie with second-best
    if (alternatives.length > 1) {
      const second = alternatives[1];
      if (best.truthDisplay - second.truthDisplay < tieMargin) {
        return null;  // Too close to call
      }
    }

    return best;
  }

  /**
   * Get mode label for slider position
   */
  private getModeLabel(slider: number): 'Conservative' | 'Balanced' | 'Assertive' {
    if (slider < 0.33) return 'Conservative';
    if (slider < 0.67) return 'Balanced';
    return 'Assertive';
  }

  /**
   * Create not found response
   */
  private createNotFoundResponse(request: FactQueryRequest, slider: number): FactResponse {
    return {
      claimKey: request.claimKeyHash || 'unknown',
      sliderUsed: slider,
      modeLabel: this.getModeLabel(slider),
      bestAnswer: null,
      statusDisplay: 'unknown',
      conflictPresent: false,
      alternatives: [],
      metadata: {
        entityName: 'unknown',
        attributeName: request.fieldName || 'unknown',
        scope: {},
        computedAt: new Date(),
      },
    };
  }

  /**
   * Get all facts for an entity
   */
  async getEntityFacts(
    entityId: string,
    slider: number = 0.5
  ): Promise<{
    entityName: string;
    facts: Array<{
      fieldName: string;
      response: FactResponse;
    }>;
  }> {
    const sql = getConnection();

    // Get entity with proper column aliases
    const entities = await sql<Entity[]>`
      SELECT
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
      FROM truth_ledger_claude.entities WHERE id = ${entityId}
    `;

    if (entities.length === 0) {
      return { entityName: 'unknown', facts: [] };
    }

    // Get all field links for this entity
    const fieldLinks = await sql<{ field_name: string; claim_key_hash: string }[]>`
      SELECT field_name, claim_key_hash
      FROM truth_ledger_claude.field_links
      WHERE entity_id = ${entityId}
        AND claim_key_hash IS NOT NULL
      ORDER BY field_name
    `;

    const facts = [];

    for (const link of fieldLinks) {
      if (!link.claim_key_hash) continue;

      const response = await this.resolve({
        claimKeyHash: link.claim_key_hash,
        truthSlider: slider,
      });

      facts.push({
        fieldName: link.field_name,
        response,
      });
    }

    return {
      entityName: entities[0].canonicalName,
      facts,
    };
  }
}
