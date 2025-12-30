/**
 * Extractor Service
 * Stage B of the Truth Ledger pipeline
 *
 * Responsibilities:
 * - Read new/changed documents and their snippets
 * - Extract claims and evidence from snippets
 * - Create conflict_groups, claims, and evidence records
 * - Link claims to entities and attributes
 */

import postgres from 'postgres';
import { getConnection, transaction } from '../db/connection.js';
import { SyncManager } from './sync-manager.js';
import type {
  Entity,
  Attribute,
  Claim,
  ClaimValue,
  Evidence,
  EvidenceStance,
  Snippet,
  ConflictGroup,
  ExtractionResult,
  ValueType,
} from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractConfig {
  documentIds?: string[];
  entityTypes?: string[];
  attributeNames?: string[];
  limit?: number;
  /** Callback to check if job was cancelled - throws if cancelled */
  checkCancelled?: () => void;
  /** Callback to report progress */
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface ExtractResult {
  syncId: number;
  claimsCreated: number;
  evidenceCreated: number;
  conflictGroupsCreated: number;
  errors: Array<{ snippetId: string; error: string }>;
}

export interface ExtractedClaim {
  entityId: string;
  attributeId: string;
  value: unknown;
  valueType: ValueType;
  unit?: string;
  scope: Record<string, unknown>;
  validFrom?: Date;
  validTo?: Date;
  confidence: number;
  quote: string;
}

/**
 * Base class for attribute extractors.
 * Extend this for specific attribute types.
 */
export abstract class AttributeExtractor {
  abstract attributePattern: string;  // e.g., 'engines.isp_s', 'engines.*'
  abstract extract(snippet: Snippet, entity: Entity, attribute: Attribute): ExtractedClaim[];
}

// ============================================================================
// NUMERIC EXTRACTORS
// ============================================================================

/**
 * Generic numeric value extractor with unit conversion
 */
export class NumericExtractor extends AttributeExtractor {
  attributePattern: string;
  private patterns: RegExp[];
  private unitConversions: Map<string, number>;
  private targetUnit: string;

  constructor(
    attributePattern: string,
    patterns: RegExp[],
    targetUnit: string,
    unitConversions?: Map<string, number>
  ) {
    super();
    this.attributePattern = attributePattern;
    this.patterns = patterns;
    this.targetUnit = targetUnit;
    this.unitConversions = unitConversions || new Map();
  }

  extract(snippet: Snippet, entity: Entity, attribute: Attribute): ExtractedClaim[] {
    const claims: ExtractedClaim[] = [];
    const text = snippet.text;

    for (const pattern of this.patterns) {
      const matches = text.matchAll(new RegExp(pattern, 'gi'));

      for (const match of matches) {
        const valueStr = match[1]?.replace(/,/g, '') || match[0];
        const value = parseFloat(valueStr);

        if (isNaN(value)) continue;

        // Check for unit in match
        const unitMatch = match[2] || this.targetUnit;
        const conversionFactor = this.unitConversions.get(unitMatch.toLowerCase()) || 1;
        const convertedValue = value * conversionFactor;

        // Calculate confidence based on context
        const confidence = this.calculateConfidence(snippet, match, entity);

        claims.push({
          entityId: entity.id,
          attributeId: attribute.id,
          value: convertedValue,
          valueType: 'number',
          unit: this.targetUnit,
          scope: this.inferScope(snippet, match),
          confidence,
          quote: this.extractQuote(text, match.index || 0),
        });
      }
    }

    return claims;
  }

  private calculateConfidence(snippet: Snippet, match: RegExpMatchArray, entity: Entity): number {
    let confidence = 0.7;  // Base confidence

    // Boost if entity name appears near the match
    const entityNameLower = entity.canonicalName.toLowerCase();
    const textLower = snippet.text.toLowerCase();
    const matchIndex = match.index || 0;

    // Check if entity name is within 200 chars of the match
    const nearbyText = textLower.substring(
      Math.max(0, matchIndex - 200),
      Math.min(textLower.length, matchIndex + 200)
    );

    if (nearbyText.includes(entityNameLower)) {
      confidence += 0.15;
    }

    // Boost for table snippets (usually more structured)
    if (snippet.snippetType === 'table') {
      confidence += 0.1;
    }

    // Cap at 0.95
    return Math.min(0.95, confidence);
  }

  private inferScope(snippet: Snippet, match: RegExpMatchArray): Record<string, unknown> {
    const scope: Record<string, unknown> = {};
    const text = snippet.text.toLowerCase();

    // Detect altitude context
    if (text.includes('vacuum') || text.includes('vac')) {
      scope.altitude = 'vac';
    } else if (text.includes('sea level') || text.includes('sea-level') || text.includes('sl ')) {
      scope.altitude = 'sl';
    }

    // Detect throttle context
    const throttleMatch = text.match(/(\d{1,3})%\s*throttle/i);
    if (throttleMatch) {
      scope.throttle = `${throttleMatch[1]}%`;
    }

    return scope;
  }

  private extractQuote(text: string, matchIndex: number, radius = 150): string {
    const start = Math.max(0, matchIndex - radius);
    const end = Math.min(text.length, matchIndex + radius);
    let quote = text.substring(start, end);

    // Clean up the quote
    if (start > 0) quote = '...' + quote;
    if (end < text.length) quote = quote + '...';

    return quote.replace(/\s+/g, ' ').trim();
  }
}

// ============================================================================
// PRE-BUILT EXTRACTORS
// ============================================================================

/**
 * ISP (Specific Impulse) extractor
 */
export const IspExtractor = new NumericExtractor(
  'engines.isp_s',
  [
    /(?:isp|specific\s+impulse)[:\s]+(\d+(?:\.\d+)?)\s*(s|seconds?)?/i,
    /(\d{2,3}(?:\.\d+)?)\s*(?:s|seconds?)\s+(?:isp|specific\s+impulse)/i,
    /isp\s*(?:sl|sea\s*level|vac|vacuum)?[:\s]*(\d+(?:\.\d+)?)/i,
    // Wikipedia formats: "Specific impulse Sea level: 300 s" or "Vacuum: 335.1 s"
    /specific\s+impulse[^:]*:\s*(\d+(?:\.\d+)?)\s*s/i,
    /(?:sea\s*level|vacuum|vac|sl):\s*(\d{2,3}(?:\.\d+)?)\s*s(?:\s*\(|$|\s)/i,
  ],
  's'
);

/**
 * Thrust extractor (handles N, kN, MN, lbf conversions)
 */
export const ThrustExtractor = new NumericExtractor(
  'engines.thrust_n',
  [
    /(?:thrust)[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf|klbf)?/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf|klbf)\s+(?:thrust|of\s+thrust)/i,
    // Wikipedia formats: "Maximum thrust Sea level: 2,400 kN" or "Total thrust 9,600 kN"
    /(?:maximum\s+)?thrust[^:]*:\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf)?/i,
    /(?:total\s+)?thrust\s+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(n|kn|mn|lbf)?/i,
    // Format: "10.62 MN" or "2,400 kN" with thrust context nearby
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kn|mn)\s*(?:\(|thrust|$)/i,
  ],
  'N',
  new Map([
    ['n', 1],
    ['kn', 1000],
    ['mn', 1000000],
    ['lbf', 4.44822],
    ['klbf', 4448.22],
  ])
);

/**
 * Mass extractor (handles kg, t, lb conversions)
 */
export const MassExtractor = new NumericExtractor(
  'engines.mass_kg',
  [
    /(?:mass|weight)[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|t|lb|lbs)?/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|t|lb|lbs)\s+(?:mass|weight|dry)/i,
  ],
  'kg',
  new Map([
    ['kg', 1],
    ['t', 1000],
    ['lb', 0.453592],
    ['lbs', 0.453592],
  ])
);

/**
 * Chamber pressure extractor
 */
export const ChamberPressureExtractor = new NumericExtractor(
  'engines.chamber_pressure_bar',
  [
    /(?:chamber\s+pressure)[:\s]+(\d+(?:\.\d+)?)\s*(bar|mpa|psi)?/i,
    /(\d+(?:\.\d+)?)\s*(bar|mpa|psi)\s+(?:chamber\s+pressure)/i,
  ],
  'bar',
  new Map([
    ['bar', 1],
    ['mpa', 10],
    ['psi', 0.0689476],
  ])
);

/**
 * Payload to LEO extractor
 */
export const PayloadLeoExtractor = new NumericExtractor(
  'launch_vehicles.payload_to_leo_kg',
  [
    /(?:payload|capacity)\s+(?:to\s+)?(?:leo|low\s+earth\s+orbit)[:\s]+(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|t)?/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|t)\s+(?:to\s+)?(?:leo|low\s+earth\s+orbit)/i,
    // Wikipedia formats: "Payload ( LEO 200 km) — ~25,000 kg" or "~25,000 kg to LEO"
    /payload[^)]*leo[^)]*\)[^~]*~?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|t)?/i,
    /~?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(kg|t)\s+(?:to\s+)?leo/i,
  ],
  'kg',
  new Map([
    ['kg', 1],
    ['t', 1000],
  ])
);

// Default extractors registry
export const DEFAULT_EXTRACTORS: AttributeExtractor[] = [
  IspExtractor,
  ThrustExtractor,
  MassExtractor,
  ChamberPressureExtractor,
  PayloadLeoExtractor,
];

// ============================================================================
// ENTITY MATCHER
// ============================================================================

/**
 * Matches snippets to entities based on content
 */
export class EntityMatcher {
  private entities: Entity[] = [];
  private entityAliases: Map<string, Entity> = new Map();

  async loadEntities(): Promise<void> {
    const sql = getConnection();
    const rows = await sql`
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
      FROM truth_ledger_claude.entities
      ORDER BY canonical_name
    `;
    this.entities = rows as unknown as Entity[];

    // Build alias map
    this.entityAliases.clear();
    for (const entity of this.entities) {
      // Add canonical name
      this.entityAliases.set(entity.canonicalName.toLowerCase(), entity);

      // Add aliases
      if (entity.aliases) {
        for (const alias of entity.aliases) {
          this.entityAliases.set(alias.toLowerCase(), entity);
        }
      }
    }
  }

  /**
   * Find entities mentioned in a snippet
   */
  findEntities(snippet: Snippet): Entity[] {
    const textLower = snippet.text.toLowerCase();
    const matched: Entity[] = [];
    const matchedIds = new Set<string>();

    // Check each entity/alias
    for (const [name, entity] of this.entityAliases) {
      if (!matchedIds.has(entity.id) && textLower.includes(name)) {
        matched.push(entity);
        matchedIds.add(entity.id);
      }
    }

    return matched;
  }

  getEntityById(id: string): Entity | undefined {
    return this.entities.find(e => e.id === id);
  }
}

// ============================================================================
// EXTRACTOR SERVICE
// ============================================================================

export class Extractor {
  private extractors: AttributeExtractor[];
  private entityMatcher: EntityMatcher;
  private attributeCache: Map<string, Attribute> = new Map();

  constructor(extractors?: AttributeExtractor[]) {
    this.extractors = extractors || DEFAULT_EXTRACTORS;
    this.entityMatcher = new EntityMatcher();
  }

  /**
   * Extract claims from pending documents
   */
  async extract(config: ExtractConfig = {}): Promise<ExtractResult> {
    const sql = getConnection();
    const syncId = await SyncManager.start('truth_extract', { config });

    const result: ExtractResult = {
      syncId,
      claimsCreated: 0,
      evidenceCreated: 0,
      conflictGroupsCreated: 0,
      errors: [],
    };

    try {
      // Load entities and attributes
      await this.entityMatcher.loadEntities();
      await this.loadAttributes();

      console.log(`[Extractor] Loaded ${this.attributeCache.size} attributes`);

      // Get snippets to process
      const snippets = await this.getSnippetsToProcess(config);

      console.log(`[Extractor] Found ${snippets.length} snippets to process`);

      let processedCount = 0;
      const totalSnippets = snippets.length;

      for (const snippet of snippets) {
        // Check for cancellation before processing each snippet
        if (config.checkCancelled) {
          config.checkCancelled();
        }

        try {
          const snippetResult = await this.processSnippet(snippet);
          result.claimsCreated += snippetResult.claimsCreated;
          result.evidenceCreated += snippetResult.evidenceCreated;
          result.conflictGroupsCreated += snippetResult.conflictGroupsCreated;

          if (snippetResult.claimsCreated > 0) {
            console.log(`[Extractor] Created ${snippetResult.claimsCreated} claims from snippet ${snippet.id}`);
          }
        } catch (error) {
          result.errors.push({
            snippetId: snippet.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        processedCount++;

        // Report progress every 10 snippets or at completion
        if (processedCount % 10 === 0 || processedCount === totalSnippets) {
          if (config.onProgress) {
            const progressPct = Math.floor((processedCount / totalSnippets) * 100);
            config.onProgress(progressPct, 100, `Processed ${processedCount}/${totalSnippets} snippets`);
          }
        }

        if (processedCount % 100 === 0) {
          console.log(`[Extractor] Processed ${processedCount}/${totalSnippets} snippets...`);
        }
      }

      await SyncManager.complete(
        syncId,
        result.claimsCreated + result.evidenceCreated + result.conflictGroupsCreated
      );

    } catch (error) {
      await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
      throw error;
    }

    return result;
  }

  /**
   * Load attributes into cache
   */
  private async loadAttributes(): Promise<void> {
    const sql = getConnection();
    const attributes = await sql`
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
    `;

    this.attributeCache.clear();
    for (const attr of attributes as unknown as Attribute[]) {
      this.attributeCache.set(attr.canonicalName, attr);
    }
  }

  /**
   * Get snippets that need processing
   */
  private async getSnippetsToProcess(config: ExtractConfig): Promise<Snippet[]> {
    const sql = getConnection();
    const limit = config.limit || 1000;

    if (config.documentIds && config.documentIds.length > 0) {
      return await sql<Snippet[]>`
        SELECT s.*
        FROM truth_ledger_claude.snippets s
        WHERE s.document_id = ANY(${config.documentIds})
        ORDER BY s.created_at ASC
        LIMIT ${limit}
      `;
    }

    // Get snippets that haven't been processed yet
    return await sql<Snippet[]>`
      SELECT s.*
      FROM truth_ledger_claude.snippets s
      LEFT JOIN truth_ledger_claude.evidence e ON e.snippet_id = s.id
      WHERE e.id IS NULL
      ORDER BY s.created_at ASC
      LIMIT ${limit}
    `;
  }

  /**
   * Process a single snippet
   */
  private entitiesFoundCount = 0;
  private claimsExtractedCount = 0;

  private async processSnippet(snippet: Snippet): Promise<{
    claimsCreated: number;
    evidenceCreated: number;
    conflictGroupsCreated: number;
  }> {
    let claimsCreated = 0;
    let evidenceCreated = 0;
    let conflictGroupsCreated = 0;

    // Find entities mentioned in the snippet
    const entities = this.entityMatcher.findEntities(snippet);

    if (entities.length === 0) {
      // No entities found, skip
      return { claimsCreated, evidenceCreated, conflictGroupsCreated };
    }

    this.entitiesFoundCount++;
    if (this.entitiesFoundCount <= 5) {
      console.log(`[Extractor] Found entities in snippet: ${entities.map(e => e.canonicalName).join(', ')}`);
    }

    // For each entity, try each extractor
    for (const entity of entities) {
      for (const extractor of this.extractors) {
        const attribute = this.attributeCache.get(extractor.attributePattern);
        if (!attribute) continue;

        // Check if attribute applies to this entity type
        const [tableName] = extractor.attributePattern.split('.');
        if (tableName === 'engines' && entity.entityType !== 'engine') continue;
        if (tableName === 'launch_vehicles' && entity.entityType !== 'launch_vehicle') continue;

        const extractedClaims = extractor.extract(snippet, entity, attribute);

        if (extractedClaims.length > 0) {
          this.claimsExtractedCount++;
          if (this.claimsExtractedCount <= 5) {
            console.log(`[Extractor] Extracted ${extractedClaims.length} claim(s) for ${entity.canonicalName} - ${extractor.attributePattern}: ${extractedClaims[0].value}`);
          }
        }

        for (const extracted of extractedClaims) {
          const dbResult = await this.createClaimWithEvidence(snippet, extracted);
          claimsCreated += dbResult.claimCreated ? 1 : 0;
          evidenceCreated += dbResult.evidenceCreated ? 1 : 0;
          conflictGroupsCreated += dbResult.conflictGroupCreated ? 1 : 0;
        }
      }
    }

    return { claimsCreated, evidenceCreated, conflictGroupsCreated };
  }

  /**
   * Create claim and evidence in the database
   */
  private async createClaimWithEvidence(
    snippet: Snippet,
    extracted: ExtractedClaim
  ): Promise<{
    claimCreated: boolean;
    evidenceCreated: boolean;
    conflictGroupCreated: boolean;
  }> {
    return await transaction(async (sql) => {
      let claimCreated = false;
      let evidenceCreated = false;
      let conflictGroupCreated = false;

      // Compute claim_key_hash using the DB function
      const hashResult = await sql<{ hash: string }[]>`
        SELECT truth_ledger_claude.compute_claim_key_hash(
          ${extracted.entityId}::uuid,
          ${extracted.attributeId}::uuid,
          ${sql.json(extracted.scope as postgres.JSONValue)}::jsonb
        ) as hash
      `;
      const claimKeyHash = hashResult[0].hash;

      // Create conflict group if it doesn't exist
      const cgInsert = await sql<ConflictGroup[]>`
        INSERT INTO truth_ledger_claude.conflict_groups (
          claim_key_hash,
          entity_id,
          attribute_id,
          scope_json
        ) VALUES (
          ${claimKeyHash},
          ${extracted.entityId},
          ${extracted.attributeId},
          ${sql.json(extracted.scope as postgres.JSONValue)}
        )
        ON CONFLICT (claim_key_hash) DO NOTHING
        RETURNING id
      `;

      if (cgInsert.length > 0) {
        conflictGroupCreated = true;
      }

      // Create the claim value JSON
      const valueJson: ClaimValue = {
        value: extracted.value,
        type: extracted.valueType,
        confidence: extracted.confidence,
      };

      // Check if this exact claim already exists
      const existingClaims = await sql<Claim[]>`
        SELECT id FROM truth_ledger_claude.claims
        WHERE claim_key_hash = ${claimKeyHash}
          AND value_json = ${sql.json(valueJson as unknown as postgres.JSONValue)}::jsonb
        LIMIT 1
      `;

      let claimId: string;

      if (existingClaims.length > 0) {
        claimId = existingClaims[0].id;
      } else {
        // Create the claim
        const claimInsert = await sql<Claim[]>`
          INSERT INTO truth_ledger_claude.claims (
            claim_key_hash,
            entity_id,
            attribute_id,
            value_json,
            unit,
            scope_json,
            valid_from,
            valid_to,
            is_derived,
            parser_notes
          ) VALUES (
            ${claimKeyHash},
            ${extracted.entityId},
            ${extracted.attributeId},
            ${sql.json(valueJson as unknown as postgres.JSONValue)}::jsonb,
            ${extracted.unit || null},
            ${sql.json(extracted.scope as postgres.JSONValue)},
            ${extracted.validFrom || null},
            ${extracted.validTo || null},
            false,
            ${'Extracted by TruthLedger Extractor'}
          )
          RETURNING id
        `;
        claimId = claimInsert[0].id;
        claimCreated = true;

        // Update conflict group claim count
        await sql`
          UPDATE truth_ledger_claude.conflict_groups
          SET claim_count = claim_count + 1
          WHERE claim_key_hash = ${claimKeyHash}
        `;
      }

      // Create evidence linking claim to snippet
      const evidenceInsert = await sql<Evidence[]>`
        INSERT INTO truth_ledger_claude.evidence (
          claim_id,
          snippet_id,
          quote,
          stance,
          extraction_confidence
        ) VALUES (
          ${claimId},
          ${snippet.id},
          ${extracted.quote},
          'support',
          ${extracted.confidence}
        )
        ON CONFLICT (claim_id, snippet_id) DO NOTHING
        RETURNING id
      `;

      if (evidenceInsert.length > 0) {
        evidenceCreated = true;
      }

      return { claimCreated, evidenceCreated, conflictGroupCreated };
    });
  }

  /**
   * Register a custom extractor
   */
  registerExtractor(extractor: AttributeExtractor): void {
    this.extractors.push(extractor);
  }
}

// ============================================================================
// ATTRIBUTE MANAGEMENT
// ============================================================================

export class AttributeManager {
  /**
   * Ensure an attribute exists
   */
  static async ensureAttribute(
    canonicalName: string,
    valueType: ValueType,
    options?: {
      displayName?: string;
      unit?: string;
      description?: string;
      toleranceAbs?: number;
      toleranceRel?: number;
    }
  ): Promise<Attribute> {
    const sql = getConnection();

    const result = await sql<Attribute[]>`
      INSERT INTO truth_ledger_claude.attributes (
        canonical_name,
        display_name,
        value_type,
        unit,
        description,
        tolerance_abs,
        tolerance_rel
      ) VALUES (
        ${canonicalName},
        ${options?.displayName || null},
        ${valueType},
        ${options?.unit || null},
        ${options?.description || null},
        ${options?.toleranceAbs || null},
        ${options?.toleranceRel || 0.02}
      )
      ON CONFLICT (canonical_name) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, truth_ledger_claude.attributes.display_name),
        description = COALESCE(EXCLUDED.description, truth_ledger_claude.attributes.description)
      RETURNING *
    `;

    return result[0];
  }

  /**
   * Get attribute by canonical name
   */
  static async getAttribute(canonicalName: string): Promise<Attribute | null> {
    const sql = getConnection();
    const result = await sql<Attribute[]>`
      SELECT * FROM truth_ledger_claude.attributes
      WHERE canonical_name = ${canonicalName}
    `;
    return result[0] || null;
  }
}
