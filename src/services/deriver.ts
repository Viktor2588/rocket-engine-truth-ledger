/**
 * Deriver Service
 * Stage D of the Truth Ledger pipeline (Domain Default Mapper)
 *
 * Responsibilities:
 * - Convert high-quality raw claims into domain-default buckets
 * - Create field_links mapping domain columns to claim buckets
 * - Handle scope normalization for domain representation
 * - Support the bridge between aerospace scope and simple domain columns
 */

import postgres from 'postgres';
import { getConnection, transaction } from '../db/connection.js';
import { SyncManager } from './sync-manager.js';
import { SCOPE_TEMPLATES } from '../config/constants.js';
import type {
  Claim,
  ConflictGroup,
  Entity,
  Attribute,
  FieldLink,
  ClaimValue,
} from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface DeriverConfig {
  entityIds?: string[];
  fieldNames?: string[];
  forceRederive?: boolean;
  limit?: number;
  /** Callback to check if job was cancelled - throws if cancelled */
  checkCancelled?: () => void;
  /** Callback to report progress */
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface DeriverResult {
  syncId: number;
  derivedClaimsCreated: number;
  fieldLinksCreated: number;
  fieldLinksUpdated: number;
  errors: Array<{ entityId: string; error: string }>;
}

export interface DerivationRule {
  sourceAttributePattern: string;  // e.g., 'engines.isp_s' with various scopes
  targetField: string;             // e.g., 'engines.isp_s'
  scopeFilter?: Record<string, unknown>;  // Filter for source claims
  aggregation: 'best_supported' | 'latest' | 'average' | 'max' | 'min';
  minTruthRaw?: number;  // Minimum truth_raw to consider
  description?: string;
}

// ============================================================================
// DEFAULT DERIVATION RULES
// ============================================================================

/**
 * Default rules for deriving domain field values from raw claims
 */
export const DEFAULT_DERIVATION_RULES: DerivationRule[] = [
  // Engine attributes
  {
    sourceAttributePattern: 'engines.isp_s',
    targetField: 'engines.isp_s',
    scopeFilter: { altitude: 'vac' },  // Prefer vacuum ISP
    aggregation: 'best_supported',
    minTruthRaw: 0.5,
    description: 'Engine specific impulse (vacuum)',
  },
  {
    sourceAttributePattern: 'engines.thrust_n',
    targetField: 'engines.thrust_n',
    scopeFilter: { altitude: 'sl' },  // Sea level thrust is typical
    aggregation: 'best_supported',
    minTruthRaw: 0.5,
    description: 'Engine thrust (sea level)',
  },
  {
    sourceAttributePattern: 'engines.mass_kg',
    targetField: 'engines.mass_kg',
    aggregation: 'best_supported',
    minTruthRaw: 0.5,
    description: 'Engine dry mass',
  },
  {
    sourceAttributePattern: 'engines.chamber_pressure_bar',
    targetField: 'engines.chamber_pressure_bar',
    aggregation: 'best_supported',
    minTruthRaw: 0.5,
    description: 'Chamber pressure',
  },

  // Launch vehicle attributes
  {
    sourceAttributePattern: 'launch_vehicles.payload_to_leo_kg',
    targetField: 'launch_vehicles.payload_to_leo_kg',
    scopeFilter: { orbit: 'LEO' },
    aggregation: 'best_supported',
    minTruthRaw: 0.5,
    description: 'Payload capacity to LEO',
  },
  {
    sourceAttributePattern: 'launch_vehicles.payload_to_gto_kg',
    targetField: 'launch_vehicles.payload_to_gto_kg',
    scopeFilter: { orbit: 'GTO' },
    aggregation: 'best_supported',
    minTruthRaw: 0.5,
    description: 'Payload capacity to GTO',
  },
];

// ============================================================================
// DERIVER SERVICE
// ============================================================================

export class Deriver {
  private rules: DerivationRule[];

  constructor(rules?: DerivationRule[]) {
    this.rules = rules || DEFAULT_DERIVATION_RULES;
  }

  /**
   * Derive domain-default claims from raw claims
   */
  async derive(config: DeriverConfig = {}): Promise<DeriverResult> {
    const sql = getConnection();
    const syncId = await SyncManager.start('truth_derive', { config });

    const result: DeriverResult = {
      syncId,
      derivedClaimsCreated: 0,
      fieldLinksCreated: 0,
      fieldLinksUpdated: 0,
      errors: [],
    };

    try {
      // Get entities to process
      const entities = await this.getEntitiesToProcess(config);
      const totalEntities = entities.length;

      for (let i = 0; i < entities.length; i++) {
        // Check for cancellation before processing each entity
        if (config.checkCancelled) {
          config.checkCancelled();
        }

        const entity = entities[i];
        try {
          const entityResult = await this.deriveForEntity(entity, config);
          result.derivedClaimsCreated += entityResult.derivedClaimsCreated;
          result.fieldLinksCreated += entityResult.fieldLinksCreated;
          result.fieldLinksUpdated += entityResult.fieldLinksUpdated;
        } catch (error) {
          result.errors.push({
            entityId: entity.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Report progress every 5 entities or at completion
        if ((i + 1) % 5 === 0 || i === totalEntities - 1) {
          if (config.onProgress) {
            const progressPct = Math.floor(((i + 1) / totalEntities) * 100);
            config.onProgress(progressPct, 100, `Derived ${i + 1}/${totalEntities} entities`);
          }
        }
      }

      await SyncManager.complete(
        syncId,
        result.derivedClaimsCreated + result.fieldLinksCreated + result.fieldLinksUpdated
      );
    } catch (error) {
      await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
      throw error;
    }

    return result;
  }

  /**
   * Get entities to process
   */
  private async getEntitiesToProcess(config: DeriverConfig): Promise<Entity[]> {
    const sql = getConnection();
    const limit = config.limit || 500;

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

    if (config.entityIds && config.entityIds.length > 0) {
      return await sql<Entity[]>`
        SELECT ${sql.unsafe(entityColumns)} FROM truth_ledger_claude.entities
        WHERE id = ANY(${config.entityIds})
        ORDER BY canonical_name
      `;
    }

    // Get entities that have conflict groups but potentially missing field links
    if (config.forceRederive) {
      return await sql<Entity[]>`
        SELECT DISTINCT
          e.id,
          e.entity_type as "entityType",
          e.canonical_name as "canonicalName",
          e.engine_id as "engineId",
          e.launch_vehicle_id as "launchVehicleId",
          e.country_id as "countryId",
          e.aliases,
          e.metadata,
          e.created_at as "createdAt",
          e.updated_at as "updatedAt"
        FROM truth_ledger_claude.entities e
        JOIN truth_ledger_claude.conflict_groups cg ON cg.entity_id = e.id
        ORDER BY e.canonical_name
        LIMIT ${limit}
      `;
    }

    // Get entities with conflict groups that don't have field links yet
    return await sql<Entity[]>`
      SELECT DISTINCT
        e.id,
        e.entity_type as "entityType",
        e.canonical_name as "canonicalName",
        e.engine_id as "engineId",
        e.launch_vehicle_id as "launchVehicleId",
        e.country_id as "countryId",
        e.aliases,
        e.metadata,
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM truth_ledger_claude.entities e
      JOIN truth_ledger_claude.conflict_groups cg ON cg.entity_id = e.id
      LEFT JOIN truth_ledger_claude.field_links fl ON fl.entity_id = e.id
      WHERE fl.id IS NULL
      ORDER BY e.canonical_name
      LIMIT ${limit}
    `;
  }

  /**
   * Derive claims for a single entity
   */
  private async deriveForEntity(
    entity: Entity,
    config: DeriverConfig
  ): Promise<{
    derivedClaimsCreated: number;
    fieldLinksCreated: number;
    fieldLinksUpdated: number;
  }> {
    let derivedClaimsCreated = 0;
    let fieldLinksCreated = 0;
    let fieldLinksUpdated = 0;

    // Filter rules by entity type
    const applicableRules = this.rules.filter(rule => {
      const [tableName] = rule.targetField.split('.');
      if (tableName === 'engines' && entity.entityType !== 'engine') return false;
      if (tableName === 'launch_vehicles' && entity.entityType !== 'launch_vehicle') return false;
      if (config.fieldNames && !config.fieldNames.includes(rule.targetField)) return false;
      return true;
    });

    for (const rule of applicableRules) {
      const ruleResult = await this.applyRule(entity, rule);
      derivedClaimsCreated += ruleResult.derivedClaimCreated ? 1 : 0;
      fieldLinksCreated += ruleResult.fieldLinkCreated ? 1 : 0;
      fieldLinksUpdated += ruleResult.fieldLinkUpdated ? 1 : 0;
    }

    return { derivedClaimsCreated, fieldLinksCreated, fieldLinksUpdated };
  }

  /**
   * Apply a single derivation rule to an entity
   */
  private async applyRule(
    entity: Entity,
    rule: DerivationRule
  ): Promise<{
    derivedClaimCreated: boolean;
    fieldLinkCreated: boolean;
    fieldLinkUpdated: boolean;
  }> {
    return await transaction(async (sql) => {
      let derivedClaimCreated = false;
      let fieldLinkCreated = false;
      let fieldLinkUpdated = false;

      // Get attribute for this rule
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
        FROM truth_ledger_claude.attributes
        WHERE canonical_name = ${rule.sourceAttributePattern}
      `;

      if (attributes.length === 0) {
        return { derivedClaimCreated, fieldLinkCreated, fieldLinkUpdated };
      }
      const attribute = attributes[0];

      // Find candidate claims for this entity + attribute
      const candidateClaims = await this.findCandidateClaims(
        sql,
        entity.id,
        attribute.id,
        rule
      );

      if (candidateClaims.length === 0) {
        return { derivedClaimCreated, fieldLinkCreated, fieldLinkUpdated };
      }

      // Select best claim based on aggregation strategy
      const bestClaim = this.selectBestClaim(candidateClaims, rule);

      if (!bestClaim) {
        return { derivedClaimCreated, fieldLinkCreated, fieldLinkUpdated };
      }

      // Create domain-default scope
      const domainScope = {
        profile: 'domain_default_v1',
        field: rule.targetField,
        derived_from_scope: bestClaim.scopeJson,
      };

      // Compute claim_key_hash for the derived claim
      const hashResult = await sql<{ hash: string }[]>`
        SELECT truth_ledger_claude.compute_claim_key_hash(
          ${entity.id}::uuid,
          ${attribute.id}::uuid,
          ${sql.json(domainScope as postgres.JSONValue)}::jsonb
        ) as hash
      `;
      const derivedClaimKeyHash = hashResult[0].hash;

      // Create conflict group for derived claim
      const cgInsert = await sql<ConflictGroup[]>`
        INSERT INTO truth_ledger_claude.conflict_groups (
          claim_key_hash,
          entity_id,
          attribute_id,
          scope_json
        ) VALUES (
          ${derivedClaimKeyHash},
          ${entity.id},
          ${attribute.id},
          ${sql.json(domainScope as postgres.JSONValue)}
        )
        ON CONFLICT (claim_key_hash) DO NOTHING
        RETURNING id
      `;

      // Create the derived claim
      const derivedValueJson: ClaimValue = {
        value: (bestClaim.valueJson as ClaimValue).value,
        type: (bestClaim.valueJson as ClaimValue).type,
        confidence: (bestClaim.valueJson as ClaimValue).confidence,
      };

      const existingDerived = await sql<Claim[]>`
        SELECT id FROM truth_ledger_claude.claims
        WHERE claim_key_hash = ${derivedClaimKeyHash}
          AND derived_from_claim_id = ${bestClaim.id}
      `;

      let derivedClaimId: string;

      if (existingDerived.length > 0) {
        derivedClaimId = existingDerived[0].id;
      } else {
        const claimInsert = await sql<Claim[]>`
          INSERT INTO truth_ledger_claude.claims (
            claim_key_hash,
            entity_id,
            attribute_id,
            value_json,
            unit,
            scope_json,
            is_derived,
            derived_from_claim_id,
            parser_notes
          ) VALUES (
            ${derivedClaimKeyHash},
            ${entity.id},
            ${attribute.id},
            ${sql.json(derivedValueJson as unknown as postgres.JSONValue)}::jsonb,
            ${bestClaim.unit || null},
            ${sql.json(domainScope as postgres.JSONValue)},
            true,
            ${bestClaim.id},
            ${`Derived using rule: ${rule.aggregation}, source scope: ${JSON.stringify(bestClaim.scopeJson)}`}
          )
          RETURNING id
        `;
        derivedClaimId = claimInsert[0].id;
        derivedClaimCreated = true;

        // Update conflict group claim count
        await sql`
          UPDATE truth_ledger_claude.conflict_groups
          SET claim_count = claim_count + 1
          WHERE claim_key_hash = ${derivedClaimKeyHash}
        `;

        // Copy evidence from source claim to derived claim
        await sql`
          INSERT INTO truth_ledger_claude.evidence (
            claim_id,
            snippet_id,
            quote,
            stance,
            extraction_confidence,
            parser_notes
          )
          SELECT
            ${derivedClaimId},
            snippet_id,
            quote,
            stance,
            extraction_confidence,
            'Copied from source claim ' || ${bestClaim.id}
          FROM truth_ledger_claude.evidence
          WHERE claim_id = ${bestClaim.id}
          ON CONFLICT (claim_id, snippet_id) DO NOTHING
        `;
      }

      // Create or update field link
      const fieldLinkResult = await sql<FieldLink[]>`
        INSERT INTO truth_ledger_claude.field_links (
          entity_id,
          field_name,
          claim_key_hash,
          auto_update
        ) VALUES (
          ${entity.id},
          ${rule.targetField},
          ${derivedClaimKeyHash},
          true
        )
        ON CONFLICT (entity_id, field_name) DO UPDATE SET
          claim_key_hash = EXCLUDED.claim_key_hash,
          updated_at = NOW()
        RETURNING id, (xmax = 0) as is_insert
      `;

      if (fieldLinkResult.length > 0) {
        // Check if this was an insert or update based on xmax
        const result = fieldLinkResult[0] as FieldLink & { is_insert: boolean };
        if (result.is_insert) {
          fieldLinkCreated = true;
        } else {
          fieldLinkUpdated = true;
        }
      }

      return { derivedClaimCreated, fieldLinkCreated, fieldLinkUpdated };
    });
  }

  /**
   * Find candidate claims for a derivation rule
   */
  private async findCandidateClaims(
    sql: ReturnType<typeof getConnection>,
    entityId: string,
    attributeId: string,
    rule: DerivationRule
  ): Promise<Array<Claim & { truthRaw: number | null }>> {
    // Build scope filter condition
    let scopeCondition = '';
    const scopeParams: (string | number | boolean | null)[] = [];

    if (rule.scopeFilter && Object.keys(rule.scopeFilter).length > 0) {
      scopeCondition = 'AND c.scope_json @> $3::jsonb';
      scopeParams.push(JSON.stringify(rule.scopeFilter));
    }

    // Get claims with their truth_raw scores, using proper column aliases
    const query = `
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
        tm.truth_raw as "truthRaw"
      FROM truth_ledger_claude.claims c
      LEFT JOIN truth_ledger_claude.truth_metrics tm ON tm.claim_id = c.id
      WHERE c.entity_id = $1
        AND c.attribute_id = $2
        AND c.is_derived = false
        ${scopeCondition}
        ${rule.minTruthRaw ? `AND (tm.truth_raw IS NULL OR tm.truth_raw >= ${rule.minTruthRaw})` : ''}
      ORDER BY tm.truth_raw DESC NULLS LAST, c.created_at DESC
    `;

    // Use unsafe query since we're building dynamic SQL
    return await sql.unsafe<Array<Claim & { truthRaw: number | null }>>(
      query,
      [entityId, attributeId, ...scopeParams]
    );
  }

  /**
   * Select the best claim based on aggregation strategy
   */
  private selectBestClaim(
    claims: Array<Claim & { truthRaw: number | null }>,
    rule: DerivationRule
  ): (Claim & { truthRaw: number | null }) | null {
    if (claims.length === 0) return null;

    switch (rule.aggregation) {
      case 'best_supported':
        // Already sorted by truthRaw DESC
        return claims[0];

      case 'latest':
        // Sort by createdAt DESC
        return [...claims].sort((a, b) =>
          (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        )[0];

      case 'max':
        return [...claims].sort((a, b) => {
          const valA = (a.valueJson as ClaimValue).value as number;
          const valB = (b.valueJson as ClaimValue).value as number;
          return valB - valA;
        })[0];

      case 'min':
        return [...claims].sort((a, b) => {
          const valA = (a.valueJson as ClaimValue).value as number;
          const valB = (b.valueJson as ClaimValue).value as number;
          return valA - valB;
        })[0];

      case 'average':
        // For average, create a synthetic claim
        const sum = claims.reduce(
          (acc, c) => acc + ((c.valueJson as ClaimValue).value as number),
          0
        );
        const avg = sum / claims.length;

        // Return first claim with modified value
        const avgClaim = { ...claims[0] };
        (avgClaim.valueJson as ClaimValue).value = avg;
        return avgClaim;

      default:
        return claims[0];
    }
  }

  /**
   * Register a custom derivation rule
   */
  registerRule(rule: DerivationRule): void {
    this.rules.push(rule);
  }

  /**
   * Get field link for an entity + field
   */
  static async getFieldLink(entityId: string, fieldName: string): Promise<FieldLink | null> {
    const sql = getConnection();
    const result = await sql<FieldLink[]>`
      SELECT
        id,
        entity_id as "entityId",
        field_name as "fieldName",
        claim_key_hash as "claimKeyHash",
        auto_update as "autoUpdate",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM truth_ledger_claude.field_links
      WHERE entity_id = ${entityId} AND field_name = ${fieldName}
    `;
    return result[0] || null;
  }

  /**
   * Get all field links for an entity
   */
  static async getEntityFieldLinks(entityId: string): Promise<FieldLink[]> {
    const sql = getConnection();
    return await sql<FieldLink[]>`
      SELECT
        id,
        entity_id as "entityId",
        field_name as "fieldName",
        claim_key_hash as "claimKeyHash",
        auto_update as "autoUpdate",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM truth_ledger_claude.field_links
      WHERE entity_id = ${entityId}
      ORDER BY field_name
    `;
  }
}
