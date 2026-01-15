/**
 * AI Extraction Job
 * Runs AI-enhanced claim extraction on snippets
 */

import 'dotenv/config';
import postgres from 'postgres';
import { getConnection, transaction } from '../db/connection.js';
import { SyncManager } from '../services/sync-manager.js';
import { AIExtractor, AIExtractedClaim, AIExtractionResult } from '../services/ai-extractor.js';
import type { Snippet, ClaimValue, Entity, Attribute } from '../types/index.js';

export interface AIExtractJobConfig {
  /** Maximum snippets to process */
  limit?: number;
  /** Only process snippets from these sources */
  sourceIds?: string[];
  /** Only process snippets containing these entity names */
  entityFilter?: string[];
  /** Re-process snippets that already have claims */
  reprocess?: boolean;
  /** Callback to check if job was cancelled */
  checkCancelled?: () => void;
  /** Callback to report progress */
  onProgress?: (current: number, total: number, message: string) => void;
}

export interface AIExtractJobResult {
  syncId: number;
  snippetsProcessed: number;
  claimsCreated: number;
  evidenceCreated: number;
  conflictGroupsCreated: number;
  totalProcessingTime: number;
  errors: Array<{ snippetId: string; error: string }>;
}

/**
 * Run AI-enhanced extraction on snippets
 */
export async function runAIExtraction(config: AIExtractJobConfig = {}): Promise<AIExtractJobResult> {
  const sql = getConnection();
  const syncId = await SyncManager.start('ai_extract', { config });

  const result: AIExtractJobResult = {
    syncId,
    snippetsProcessed: 0,
    claimsCreated: 0,
    evidenceCreated: 0,
    conflictGroupsCreated: 0,
    totalProcessingTime: 0,
    errors: [],
  };

  const startTime = Date.now();

  try {
    // Initialize AI extractor
    const extractor = new AIExtractor();
    await extractor.initialize();
    console.log('[AIExtract] Initialized AI extractor');

    // Get snippets to process
    const snippets = await getSnippetsToProcess(config);
    console.log(`[AIExtract] Found ${snippets.length} snippets to process`);

    if (snippets.length === 0) {
      await SyncManager.complete(syncId, 0);
      return result;
    }

    // Process snippets one at a time to manage API rate limits
    for (let i = 0; i < snippets.length; i++) {
      const snippet = snippets[i];

      // Check for cancellation
      if (config.checkCancelled) {
        config.checkCancelled();
      }

      try {
        const extractionResult = await extractor.extractFromSnippet(snippet);

        if (extractionResult.claims.length > 0) {
          const dbResult = await saveAIExtractedClaims(
            snippet,
            extractionResult.claims,
            extractor
          );

          result.claimsCreated += dbResult.claimsCreated;
          result.evidenceCreated += dbResult.evidenceCreated;
          result.conflictGroupsCreated += dbResult.conflictGroupsCreated;

          console.log(`[AIExtract] Snippet ${snippet.id}: ${extractionResult.claims.length} claims extracted, ${dbResult.claimsCreated} new claims saved`);
        }

        result.snippetsProcessed++;

        // Report progress
        if (config.onProgress && (i % 5 === 0 || i === snippets.length - 1)) {
          config.onProgress(
            i + 1,
            snippets.length,
            `Processed ${i + 1}/${snippets.length} snippets (${result.claimsCreated} claims)`
          );
        }

        // Small delay to avoid rate limiting
        if (i < snippets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        result.errors.push({
          snippetId: snippet.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`[AIExtract] Error processing snippet ${snippet.id}:`, error);
      }
    }

    result.totalProcessingTime = Date.now() - startTime;

    await SyncManager.complete(
      syncId,
      result.claimsCreated + result.evidenceCreated
    );

    console.log(`[AIExtract] Completed: ${result.claimsCreated} claims, ${result.evidenceCreated} evidence in ${result.totalProcessingTime}ms`);

  } catch (error) {
    await SyncManager.fail(syncId, error instanceof Error ? error : String(error));
    throw error;
  }

  return result;
}

/**
 * Get snippets that need AI extraction
 */
async function getSnippetsToProcess(config: AIExtractJobConfig): Promise<Snippet[]> {
  const sql = getConnection();
  const limit = config.limit || 100; // Default to 100 for AI extraction (expensive)

  if (config.reprocess) {
    // Get snippets even if they have existing claims
    return await sql<Snippet[]>`
      SELECT DISTINCT s.*
      FROM truth_ledger.snippets s
      JOIN truth_ledger.documents d ON s.document_id = d.id
      ${config.sourceIds?.length ? sql`WHERE d.source_id = ANY(${config.sourceIds})` : sql``}
      ORDER BY s.created_at DESC
      LIMIT ${limit}
    `;
  }

  // Get snippets without AI-extracted claims
  // We identify AI-extracted claims by parser_notes containing 'AIExtractor'
  return await sql<Snippet[]>`
    WITH ai_processed AS (
      SELECT DISTINCT e.snippet_id
      FROM truth_ledger.evidence e
      JOIN truth_ledger.claims c ON e.claim_id = c.id
      WHERE c.parser_notes LIKE '%AIExtractor%'
    )
    SELECT s.*
    FROM truth_ledger.snippets s
    JOIN truth_ledger.documents d ON s.document_id = d.id
    LEFT JOIN ai_processed ap ON ap.snippet_id = s.id
    WHERE ap.snippet_id IS NULL
    ${config.sourceIds?.length ? sql`AND d.source_id = ANY(${config.sourceIds})` : sql``}
    ORDER BY s.created_at DESC
    LIMIT ${limit}
  `;
}

/**
 * Save AI-extracted claims to the database
 */
async function saveAIExtractedClaims(
  snippet: Snippet,
  claims: AIExtractedClaim[],
  extractor: AIExtractor
): Promise<{
  claimsCreated: number;
  evidenceCreated: number;
  conflictGroupsCreated: number;
}> {
  let claimsCreated = 0;
  let evidenceCreated = 0;
  let conflictGroupsCreated = 0;

  for (const aiClaim of claims) {
    // Resolve entity
    const entity = extractor.resolveEntity(aiClaim.entityName);
    if (!entity) {
      console.log(`[AIExtract] Skipping claim: entity not found: ${aiClaim.entityName}`);
      continue;
    }

    // Resolve attribute
    const attribute = extractor.getAttribute(aiClaim.attributeName);
    if (!attribute) {
      console.log(`[AIExtract] Skipping claim: attribute not found: ${aiClaim.attributeName}`);
      continue;
    }

    // Skip ambiguous claims with low confidence
    if (aiClaim.isAmbiguous && aiClaim.confidence < 0.6) {
      console.log(`[AIExtract] Skipping ambiguous claim with confidence ${aiClaim.confidence}`);
      continue;
    }

    const dbResult = await saveSingleClaim(
      snippet,
      aiClaim,
      entity,
      attribute
    );

    claimsCreated += dbResult.claimCreated ? 1 : 0;
    evidenceCreated += dbResult.evidenceCreated ? 1 : 0;
    conflictGroupsCreated += dbResult.conflictGroupCreated ? 1 : 0;
  }

  return { claimsCreated, evidenceCreated, conflictGroupsCreated };
}

/**
 * Save a single AI-extracted claim to the database
 */
async function saveSingleClaim(
  snippet: Snippet,
  aiClaim: AIExtractedClaim,
  entity: Entity,
  attribute: Attribute
): Promise<{
  claimCreated: boolean;
  evidenceCreated: boolean;
  conflictGroupCreated: boolean;
}> {
  return await transaction(async (sql) => {
    let claimCreated = false;
    let evidenceCreated = false;
    let conflictGroupCreated = false;

    // Build scope from AI extraction
    const scope: Record<string, unknown> = {};
    if (aiClaim.scope.altitude) scope.altitude = aiClaim.scope.altitude;
    if (aiClaim.scope.throttle) scope.throttle = aiClaim.scope.throttle;
    if (aiClaim.scope.variant) scope.variant = aiClaim.scope.variant;
    if (aiClaim.scope.conditions) scope.conditions = aiClaim.scope.conditions;
    if (aiClaim.entityVariant) scope.entityVariant = aiClaim.entityVariant;

    // Compute claim_key_hash
    const hashResult = await sql<{ hash: string }[]>`
      SELECT truth_ledger.compute_claim_key_hash(
        ${entity.id}::uuid,
        ${attribute.id}::uuid,
        ${sql.json(scope as postgres.JSONValue)}::jsonb
      ) as hash
    `;
    const claimKeyHash = hashResult[0].hash;

    // Create conflict group if it doesn't exist
    const cgInsert = await sql`
      INSERT INTO truth_ledger.conflict_groups (
        claim_key_hash,
        entity_id,
        attribute_id,
        scope_json
      ) VALUES (
        ${claimKeyHash},
        ${entity.id},
        ${attribute.id},
        ${sql.json(scope as postgres.JSONValue)}
      )
      ON CONFLICT (claim_key_hash) DO NOTHING
      RETURNING id
    `;

    if (cgInsert.length > 0) {
      conflictGroupCreated = true;
    }

    // Create claim value JSON
    const value = typeof aiClaim.value === 'number' ? aiClaim.value : parseFloat(String(aiClaim.value));
    const valueJson: ClaimValue = {
      value: value,
      type: 'number',
      confidence: aiClaim.confidence,
    };

    // Build parser notes with AI extraction details
    const parserNotes = JSON.stringify({
      extractor: 'AIExtractor',
      reasoning: aiClaim.reasoning,
      isAmbiguous: aiClaim.isAmbiguous,
      potentialIssues: aiClaim.potentialIssues,
    });

    // Check if this exact claim already exists
    const existingClaims = await sql`
      SELECT id FROM truth_ledger.claims
      WHERE claim_key_hash = ${claimKeyHash}
        AND value_json = ${sql.json(valueJson as unknown as postgres.JSONValue)}::jsonb
      LIMIT 1
    `;

    let claimId: string;

    if (existingClaims.length > 0) {
      claimId = existingClaims[0].id as string;
    } else {
      // Create the claim
      const claimInsert = await sql`
        INSERT INTO truth_ledger.claims (
          claim_key_hash,
          entity_id,
          attribute_id,
          value_json,
          unit,
          scope_json,
          is_derived,
          parser_notes
        ) VALUES (
          ${claimKeyHash},
          ${entity.id},
          ${attribute.id},
          ${sql.json(valueJson as unknown as postgres.JSONValue)}::jsonb,
          ${aiClaim.unit || null},
          ${sql.json(scope as postgres.JSONValue)},
          false,
          ${parserNotes}
        )
        RETURNING id
      `;
      claimId = claimInsert[0].id as string;
      claimCreated = true;

      // Update conflict group claim count
      await sql`
        UPDATE truth_ledger.conflict_groups
        SET claim_count = claim_count + 1
        WHERE claim_key_hash = ${claimKeyHash}
      `;
    }

    // Create evidence linking claim to snippet
    const evidenceInsert = await sql`
      INSERT INTO truth_ledger.evidence (
        claim_id,
        snippet_id,
        quote,
        stance,
        extraction_confidence
      ) VALUES (
        ${claimId},
        ${snippet.id},
        ${aiClaim.quote},
        'support',
        ${aiClaim.confidence}
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

// ============================================================================
// CLI RUNNER
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const limit = parseInt(process.env.LIMIT || '50', 10);

  console.log(`[AIExtract] Starting AI extraction job (limit: ${limit})`);

  runAIExtraction({ limit })
    .then(result => {
      console.log('\n=== AI Extraction Complete ===');
      console.log(`Snippets processed: ${result.snippetsProcessed}`);
      console.log(`Claims created: ${result.claimsCreated}`);
      console.log(`Evidence created: ${result.evidenceCreated}`);
      console.log(`Conflict groups: ${result.conflictGroupsCreated}`);
      console.log(`Processing time: ${result.totalProcessingTime}ms`);
      console.log(`Errors: ${result.errors.length}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('AI extraction failed:', error);
      process.exit(1);
    });
}
