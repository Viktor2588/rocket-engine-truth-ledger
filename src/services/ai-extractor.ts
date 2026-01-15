/**
 * AI-Enhanced Extractor Service
 * Uses Ollama (local LLM) to intelligently extract claims from snippets with proper context understanding
 *
 * Key improvements over regex extraction:
 * - Understands entity variants (Merlin 1D vs Merlin 1D+ vs Merlin 1D++)
 * - Properly scopes values (sea level vs vacuum, different throttle settings)
 * - Validates extracted values against expected ranges
 * - Detects when values refer to different conditions vs actual conflicts
 */

import { getConnection } from '../db/connection.js';
import type { Entity, Attribute, Snippet, ValueType } from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface AIExtractedClaim {
  entityName: string;           // The specific entity mentioned (e.g., "Merlin 1D+")
  entityVariant?: string;       // Detected variant if different from base (e.g., "+", "++", "Block 5")
  attributeName: string;        // The attribute being claimed (e.g., "thrust_n", "isp_s")
  value: number | string;       // The extracted value
  unit: string;                 // The standardized unit
  scope: {
    altitude?: 'sl' | 'vac';    // Sea level or vacuum
    throttle?: string;          // e.g., "100%", "70%"
    variant?: string;           // Engine variant
    conditions?: string;        // Other conditions like "at max thrust"
  };
  confidence: number;           // 0-1 confidence score
  quote: string;                // The relevant quote from the text
  reasoning: string;            // Why this extraction was made
  isAmbiguous: boolean;         // Whether the extraction is uncertain
  potentialIssues?: string[];   // Any issues detected (e.g., "value seems too high")
}

export interface AIExtractionResult {
  claims: AIExtractedClaim[];
  entitiesMentioned: string[];
  analysisNotes: string;
  processingTime: number;
}

export interface AIExtractorConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Ollama server URL */
  ollamaUrl?: string;
  /** Known entities to help guide extraction */
  knownEntities?: Entity[];
  /** Known attributes to extract */
  targetAttributes?: string[];
  /** Callback to check if job was cancelled */
  checkCancelled?: () => void;
}

// ============================================================================
// JSON SANITIZATION
// ============================================================================

/**
 * Sanitize JSON string to handle common LLM output issues
 * - NaN, Infinity, -Infinity are not valid JSON
 * - Trailing commas
 * - Single quotes instead of double quotes
 */
function sanitizeJsonString(jsonStr: string): string {
  return jsonStr
    // Replace NaN with null
    .replace(/:\s*NaN\b/gi, ': null')
    // Replace Infinity with null
    .replace(/:\s*Infinity\b/gi, ': null')
    .replace(/:\s*-Infinity\b/gi, ': null')
    // Replace undefined with null
    .replace(/:\s*undefined\b/gi, ': null')
    // Remove trailing commas before } or ]
    .replace(/,\s*([\}\]])/g, '$1')
    // Fix "Not specified" or other strings in number fields for scope
    .replace(/"altitude":\s*"[^"]*specified[^"]*"/gi, '"altitude": null')
    .replace(/"throttle":\s*"[^"]*specified[^"]*"/gi, '"throttle": null');
}

// ============================================================================
// FUZZY ENTITY MATCHING
// ============================================================================

/**
 * Calculate similarity between two strings (Dice coefficient)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  // Create bigrams
  const bigrams1 = new Set<string>();
  for (let i = 0; i < s1.length - 1; i++) {
    bigrams1.add(s1.substring(i, i + 2));
  }

  let matches = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    if (bigrams1.has(s2.substring(i, i + 2))) {
      matches++;
    }
  }

  return (2 * matches) / (s1.length + s2.length - 2);
}

/**
 * Entity matching patterns for common variations
 */
const ENTITY_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
  // Merlin variants
  { pattern: /^merlin$/i, canonical: 'Merlin 1D' },
  { pattern: /^merlin\s*1$/i, canonical: 'Merlin 1D' },
  { pattern: /^merlin\s*engine$/i, canonical: 'Merlin 1D' },
  { pattern: /^merlin\s*1d$/i, canonical: 'Merlin 1D' },
  { pattern: /^merlin\s*1d\+$/i, canonical: 'Merlin 1D+' },
  { pattern: /^merlin\s*1d\s*vacuum$/i, canonical: 'Merlin 1D Vacuum' },
  { pattern: /^mvac$/i, canonical: 'Merlin 1D Vacuum' },
  // Raptor variants
  { pattern: /^raptor$/i, canonical: 'Raptor' },
  { pattern: /^raptor\s*1$/i, canonical: 'Raptor 1' },
  { pattern: /^raptor\s*2$/i, canonical: 'Raptor 2' },
  { pattern: /^raptor\s*3$/i, canonical: 'Raptor 3' },
  { pattern: /^raptor\s*engine$/i, canonical: 'Raptor' },
  { pattern: /^raptor\s*vacuum$/i, canonical: 'Raptor Vacuum' },
  { pattern: /^rvac$/i, canonical: 'Raptor Vacuum' },
  // RS-25 / SSME
  { pattern: /^rs-?25$/i, canonical: 'RS-25' },
  { pattern: /^ssme$/i, canonical: 'RS-25' },
  { pattern: /^space\s*shuttle\s*main\s*engine$/i, canonical: 'RS-25' },
  // BE-4
  { pattern: /^be-?4$/i, canonical: 'BE-4' },
  // RD-180
  { pattern: /^rd-?180$/i, canonical: 'RD-180' },
  // F-1
  { pattern: /^f-?1$/i, canonical: 'F-1' },
  { pattern: /^f-?1\s*engine$/i, canonical: 'F-1' },
];

// ============================================================================
// PROMPTS
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `You are an expert aerospace engineer and data extraction specialist. Your task is to extract precise technical claims from text about rocket engines and launch vehicles.

## Your Expertise:
- Deep knowledge of rocket propulsion systems
- Understanding of engine variants and their differences (e.g., Merlin 1D, 1D+, 1D++, Merlin Vacuum)
- Knowledge of typical performance values (thrust, ISP, mass) for common engines
- Understanding of measurement conditions (sea level vs vacuum, different throttle settings)

## Critical Rules:
1. **Entity Precision**: Be precise about which entity variant a value refers to. "Merlin 1D" and "Merlin 1D+" are DIFFERENT engines with different performance.

2. **Scope Detection**: Always identify the measurement conditions:
   - Sea level (sl) vs Vacuum (vac) - these give VERY different thrust/ISP values
   - Throttle setting (100%, 70%, etc.)
   - Engine version/block number

3. **SINGLE ENGINE vs STAGE/CLUSTER VALUES** (CRITICAL):
   - Extract values for INDIVIDUAL ENGINES only, NOT total stage thrust
   - Falcon 9 has 9 Merlin engines - if you see ~7.6 MN thrust, that's TOTAL, not per-engine
   - Per-engine Merlin thrust is ~845 kN (sea level) or ~914 kN (vacuum)
   - Super Heavy has 33 Raptor engines - ~7500 tonnes total means ~230 tonnes PER ENGINE
   - If text says "combined thrust" or "total thrust" - DO NOT extract as single engine value
   - Look for phrases like "each engine", "per engine", "single engine" to confirm

4. **Value Validation**: Flag values that seem implausible:
   - Merlin engines: thrust ~700-1000 kN, ISP ~280-330s (varies by variant and altitude)
   - Raptor engines: thrust ~2000-2500 kN, ISP ~330-380s
   - RS-25: thrust ~1860 kN (sl) to ~2280 kN (vac)
   - If thrust is >3000 kN for Merlin or >4000 kN for Raptor, it's likely TOTAL stage thrust - SKIP IT

5. **Ambiguity Handling**: If you can't determine the exact entity or conditions, set isAmbiguous=true and explain in reasoning.

6. **No Guessing**: Only extract values that are clearly stated. Don't infer values.

## Output Format:
Return ONLY a valid JSON object (no markdown, no explanation before or after) with:
- claims: Array of extracted claims
- entitiesMentioned: List of all entities referenced
- analysisNotes: Any observations about the text quality or potential issues`;

function buildExtractionPrompt(
  snippet: Snippet,
  knownEntities: Entity[],
  targetAttributes: string[]
): string {
  // Limit entities to first 50 to keep prompt manageable for local models
  const limitedEntities = knownEntities.slice(0, 50);
  const entityList = limitedEntities.map(e => {
    const aliases = e.aliases?.length ? ` (aliases: ${e.aliases.slice(0, 3).join(', ')})` : '';
    return `- ${e.canonicalName}${aliases}`;
  }).join('\n');

  const attributeList = targetAttributes.map(a => `- ${a}`).join('\n');

  // Truncate snippet text if too long
  const maxTextLength = 2000;
  const snippetText = snippet.text.length > maxTextLength
    ? snippet.text.substring(0, maxTextLength) + '...[truncated]'
    : snippet.text;

  return `## Known Entities (subset):
${entityList}

## Target Attributes to Extract:
${attributeList}

## Text to Analyze:
"""
${snippetText}
"""

## Instructions:
1. Identify which entities are mentioned in this text
2. For each entity, extract any technical values for the target attributes
3. Be VERY careful about which variant/version the value applies to and whether it's sea level or vacuum

Return ONLY a valid JSON object with this structure (no markdown code blocks, just raw JSON):
{
  "claims": [
    {
      "entityName": "exact entity name",
      "entityVariant": "variant if any",
      "attributeName": "engines.thrust_n or engines.isp_s etc",
      "value": numeric_value,
      "unit": "N, s, kg, etc",
      "scope": {
        "altitude": "sl or vac",
        "throttle": "percentage if mentioned"
      },
      "confidence": 0.0-1.0,
      "quote": "relevant excerpt",
      "reasoning": "why you extracted this",
      "isAmbiguous": false,
      "potentialIssues": []
    }
  ],
  "entitiesMentioned": ["list of entities"],
  "analysisNotes": "observations"
}

## CRITICAL UNIT REQUIREMENTS:
- Thrust MUST be in Newtons (N), NOT kN or MN
  - Example: 845 kN = 845000 N (output 845000, not 845)
  - Example: 2.2 MN = 2200000 N (output 2200000, not 2.2)
- ISP MUST be in seconds (s)
- Mass MUST be in kilograms (kg), NOT tonnes
  - Example: 1.4 tonnes = 1400 kg (output 1400, not 1.4)

ALWAYS output the FULL number in base units. Never output abbreviated values.
If text has both sl and vac values, create SEPARATE claims for each.`;
}

// ============================================================================
// OLLAMA API INTERFACE
// ============================================================================

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

async function callOllama(
  url: string,
  model: string,
  messages: OllamaMessage[],
  options: { temperature?: number; num_predict?: number; timeout?: number } = {}
): Promise<string> {
  // Larger models need more time - default 5 min timeout
  const timeoutMs = options.timeout ?? 300000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0,
          num_predict: options.num_predict ?? 4096,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;
    return data.message.content;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// AI EXTRACTOR CLASS
// ============================================================================

export class AIExtractor {
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private ollamaUrl: string;
  private entityCache: Map<string, Entity> = new Map();
  private attributeCache: Map<string, Attribute> = new Map();

  constructor(config: AIExtractorConfig = {}) {
    this.model = config.model || 'granite3.3:8b';
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0;
    this.ollamaUrl = config.ollamaUrl || 'http://localhost:11434';
  }

  /**
   * Load entities and attributes from database
   */
  async initialize(): Promise<void> {
    const sql = getConnection();

    // Load entities
    const entities = await sql`
      SELECT
        id,
        entity_type as "entityType",
        canonical_name as "canonicalName",
        aliases,
        metadata
      FROM truth_ledger_claude.entities
    `;

    for (const entity of entities as unknown as Entity[]) {
      this.entityCache.set(entity.canonicalName.toLowerCase(), entity);
      if (entity.aliases) {
        for (const alias of entity.aliases) {
          this.entityCache.set(alias.toLowerCase(), entity);
        }
      }
    }

    // Load attributes
    const attributes = await sql`
      SELECT
        id,
        canonical_name as "canonicalName",
        display_name as "displayName",
        value_type as "valueType",
        unit
      FROM truth_ledger_claude.attributes
    `;

    for (const attr of attributes as unknown as Attribute[]) {
      this.attributeCache.set(attr.canonicalName, attr);
    }

    console.log(`[AIExtractor] Loaded ${this.entityCache.size} entities and ${this.attributeCache.size} attributes`);
    console.log(`[AIExtractor] Using Ollama model: ${this.model} at ${this.ollamaUrl}`);
  }

  /**
   * Extract claims from a single snippet using AI
   */
  async extractFromSnippet(
    snippet: Snippet,
    config: AIExtractorConfig = {}
  ): Promise<AIExtractionResult> {
    const startTime = Date.now();

    // Get known entities - either from config or cache
    const knownEntities = config.knownEntities || Array.from(new Set(this.entityCache.values()));

    // Get target attributes
    const targetAttributes = config.targetAttributes || [
      'engines.thrust_n',
      'engines.isp_s',
      'engines.mass_kg',
      'engines.chamber_pressure_bar',
      'launch_vehicles.payload_to_leo_kg',
    ];

    const prompt = buildExtractionPrompt(snippet, knownEntities, targetAttributes);

    try {
      const messages: OllamaMessage[] = [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const responseText = await callOllama(
        this.ollamaUrl,
        this.model,
        messages,
        { temperature: this.temperature, num_predict: this.maxTokens }
      );

      // Parse the JSON response - try to extract JSON from the response
      let jsonStr = responseText;

      // Try to find JSON in markdown code blocks first
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Try to find raw JSON object
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
      }

      if (!jsonStr || !jsonStr.startsWith('{')) {
        console.error('[AIExtractor] No JSON found in response:', responseText.substring(0, 500));
        return {
          claims: [],
          entitiesMentioned: [],
          analysisNotes: 'Failed to parse AI response - no JSON found',
          processingTime: Date.now() - startTime,
        };
      }

      let parsed: {
        claims: AIExtractedClaim[];
        entitiesMentioned: string[];
        analysisNotes: string;
      };

      try {
        // Sanitize JSON to handle NaN, Infinity, and other invalid values
        const sanitizedJson = sanitizeJsonString(jsonStr);
        parsed = JSON.parse(sanitizedJson);
      } catch (parseError) {
        console.error('[AIExtractor] JSON parse error:', parseError, '\nJSON string:', jsonStr.substring(0, 500));
        return {
          claims: [],
          entitiesMentioned: [],
          analysisNotes: 'Failed to parse AI response - invalid JSON',
          processingTime: Date.now() - startTime,
        };
      }

      // Ensure claims is an array
      if (!Array.isArray(parsed.claims)) {
        parsed.claims = [];
      }

      // Validate and enhance claims
      const validatedClaims = await this.validateClaims(parsed.claims);

      return {
        claims: validatedClaims,
        entitiesMentioned: parsed.entitiesMentioned || [],
        analysisNotes: parsed.analysisNotes || '',
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[AIExtractor] Error extracting from snippet:', error);
      return {
        claims: [],
        entitiesMentioned: [],
        analysisNotes: `Error: ${error instanceof Error ? error.message : String(error)}`,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Fuzzy match an entity name to a known entity
   */
  private fuzzyMatchEntity(extractedName: string): Entity | undefined {
    const name = extractedName.trim();

    // 1. Try exact match first
    const exactMatch = this.entityCache.get(name.toLowerCase());
    if (exactMatch) return exactMatch;

    // 2. Try pattern matching for common variations
    for (const { pattern, canonical } of ENTITY_PATTERNS) {
      if (pattern.test(name)) {
        const entity = this.entityCache.get(canonical.toLowerCase());
        if (entity) return entity;
      }
    }

    // 3. Try fuzzy string similarity matching
    let bestMatch: Entity | undefined;
    let bestScore = 0;
    const threshold = 0.7; // Minimum similarity threshold

    for (const [key, entity] of this.entityCache) {
      // Check canonical name
      const score = stringSimilarity(name, entity.canonicalName);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = entity;
      }

      // Check aliases
      if (entity.aliases) {
        for (const alias of entity.aliases) {
          const aliasScore = stringSimilarity(name, alias);
          if (aliasScore > bestScore && aliasScore >= threshold) {
            bestScore = aliasScore;
            bestMatch = entity;
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Auto-correct unit issues based on expected value ranges
   */
  private autoCorrectUnits(claim: AIExtractedClaim): AIExtractedClaim {
    const value = typeof claim.value === 'number' ? claim.value : parseFloat(String(claim.value));

    if (isNaN(value) || value === null) {
      return claim;
    }

    const correctedClaim = { ...claim };

    switch (claim.attributeName) {
      case 'engines.thrust_n':
        // If thrust is < 10,000 N, it's likely in kN - multiply by 1000
        if (value > 0 && value < 10000) {
          correctedClaim.value = value * 1000;
          correctedClaim.potentialIssues = [
            ...(correctedClaim.potentialIssues || []),
            `Auto-corrected: ${value} → ${correctedClaim.value} (assumed kN→N)`
          ];
        }
        // If thrust is < 100, it's likely in MN - multiply by 1,000,000
        else if (value > 0 && value < 100) {
          correctedClaim.value = value * 1000000;
          correctedClaim.potentialIssues = [
            ...(correctedClaim.potentialIssues || []),
            `Auto-corrected: ${value} → ${correctedClaim.value} (assumed MN→N)`
          ];
        }
        break;

      case 'engines.mass_kg':
        // If mass is < 10, it's likely in tonnes - multiply by 1000
        if (value > 0 && value < 10) {
          correctedClaim.value = value * 1000;
          correctedClaim.potentialIssues = [
            ...(correctedClaim.potentialIssues || []),
            `Auto-corrected: ${value} → ${correctedClaim.value} (assumed tonnes→kg)`
          ];
        }
        break;

      case 'engines.chamber_pressure_bar':
        // If pressure is > 1000, it's likely in kPa - divide by 100
        if (value > 1000) {
          correctedClaim.value = value / 100;
          correctedClaim.potentialIssues = [
            ...(correctedClaim.potentialIssues || []),
            `Auto-corrected: ${value} → ${correctedClaim.value} (assumed kPa→bar)`
          ];
        }
        break;
    }

    return correctedClaim;
  }

  /**
   * Validate and enhance extracted claims
   */
  private async validateClaims(claims: AIExtractedClaim[]): Promise<AIExtractedClaim[]> {
    const validated: AIExtractedClaim[] = [];

    for (let claim of claims) {
      // Skip if missing required fields
      if (!claim.entityName || !claim.attributeName || claim.value === undefined || claim.value === null) {
        continue;
      }

      // Skip if value is not a valid number
      const numValue = typeof claim.value === 'number' ? claim.value : parseFloat(String(claim.value));
      if (isNaN(numValue)) {
        continue;
      }

      // Auto-correct unit issues
      claim = this.autoCorrectUnits(claim);

      // Check if entity exists using fuzzy matching
      const entity = this.fuzzyMatchEntity(claim.entityName);

      // Validate value ranges
      const rangeCheck = this.validateValueRange(claim);

      // Reject claims that are clearly wrong (e.g., total stage thrust)
      if (rangeCheck.shouldReject) {
        console.log(`[AIExtractor] Rejected claim: ${claim.entityName} ${claim.attributeName} = ${claim.value} - ${rangeCheck.issues.join(', ')}`);
        continue;
      }

      if (rangeCheck.issues.length > 0) {
        claim.potentialIssues = [
          ...(claim.potentialIssues || []),
          ...rangeCheck.issues,
        ];
        claim.confidence = (claim.confidence || 0.8) * rangeCheck.confidenceMultiplier;
      }

      // Only include if we have a matching entity
      if (entity) {
        validated.push({
          ...claim,
          entityName: entity.canonicalName, // Normalize to canonical name
          confidence: claim.confidence || 0.8,
          isAmbiguous: claim.isAmbiguous || false,
          quote: claim.quote || '',
          reasoning: claim.reasoning || '',
          scope: claim.scope || {},
        });
      } else {
        // Log unmatched entities for potential database additions
        console.log(`[AIExtractor] Unmatched entity: ${claim.entityName}`);
      }
    }

    return validated;
  }

  /**
   * Known total stage thrust values (to detect context confusion)
   * These are NOT single engine values
   */
  private static STAGE_THRUST_VALUES: Record<string, { min: number; max: number; engines: number }> = {
    // Falcon 9 first stage: 9 × Merlin 1D
    'falcon_9_stage1': { min: 7000000, max: 8500000, engines: 9 },
    // Falcon Heavy: 27 × Merlin 1D
    'falcon_heavy': { min: 22000000, max: 24000000, engines: 27 },
    // Super Heavy: 33 × Raptor
    'super_heavy': { min: 70000000, max: 80000000, engines: 33 },
    // Starship: 6 × Raptor
    'starship': { min: 12000000, max: 15000000, engines: 6 },
  };

  /**
   * Check if a thrust value looks like total stage thrust rather than single engine
   */
  private isStageThrustValue(entityName: string, value: number): { isStageThrust: boolean; reason?: string } {
    const lowerName = entityName.toLowerCase();

    // Check for Merlin engines
    if (lowerName.includes('merlin')) {
      // Single Merlin: 700-1000 kN (700,000 - 1,000,000 N)
      // Falcon 9 total: ~7.6 MN (9 engines)
      if (value > 3000000) {
        return {
          isStageThrust: true,
          reason: `Value ${(value/1000000).toFixed(1)}MN is likely total Falcon 9 stage thrust (9 engines), not single Merlin (~845kN)`
        };
      }
    }

    // Check for Raptor engines
    if (lowerName.includes('raptor')) {
      // Single Raptor: 2000-2500 kN
      // Super Heavy total: ~75 MN (33 engines)
      if (value > 5000000) {
        return {
          isStageThrust: true,
          reason: `Value ${(value/1000000).toFixed(1)}MN is likely total stage thrust, not single Raptor (~2.2MN)`
        };
      }
    }

    // Check for RS-25
    if (lowerName.includes('rs-25') || lowerName.includes('ssme')) {
      // Single RS-25: 1860-2280 kN
      // SLS Core Stage: 4 × RS-25 = ~8 MN
      if (value > 5000000) {
        return {
          isStageThrust: true,
          reason: `Value ${(value/1000000).toFixed(1)}MN is likely total SLS core stage thrust (4 engines), not single RS-25 (~2MN)`
        };
      }
    }

    return { isStageThrust: false };
  }

  /**
   * Known engine thrust ranges to catch mass/thrust column confusion
   * Values are in Newtons, with reasonable tolerance
   */
  private static ENGINE_THRUST_RANGES: Record<string, { min: number; max: number; mass?: number }> = {
    // Russian engines - these have known mass values that could be confused
    'rd-180': { min: 3800000, max: 4200000, mass: 5480 },  // ~4.15 MN, mass 5480 kg
    'rd-171': { min: 7200000, max: 8000000, mass: 9300 },  // ~7.9 MN, mass 9300 kg
    'rd-191': { min: 1900000, max: 2100000 },             // ~2.0 MN
    'rd-170': { min: 7200000, max: 8000000 },             // ~7.9 MN (4 chambers)
    // American engines
    'f-1': { min: 6700000, max: 7000000, mass: 8400 },    // ~6.77 MN, mass 8400 kg
    'rs-68': { min: 2900000, max: 3400000 },              // ~3.1 MN
    'be-4': { min: 2200000, max: 2500000 },               // ~2.4 MN
    // Small engines - thrust much lower than mass×1000
    'be-7': { min: 40000, max: 50000 },                   // ~44.5 kN (not MN!)
  };

  /**
   * Check if thrust is plausible for a specific engine
   * Catches cases where mass (kg) is confused with thrust (N)
   */
  private checkEngineThrustPlausibility(entityName: string, value: number): {
    shouldReject: boolean;
    reason?: string;
    warning?: string;
  } {
    const lowerName = entityName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check against known engine ranges
    for (const [engineKey, range] of Object.entries(AIExtractor.ENGINE_THRUST_RANGES)) {
      const keyNormalized = engineKey.replace(/[^a-z0-9]/g, '');

      if (lowerName.includes(keyNormalized)) {
        // Check if value matches mass×1000 (common table confusion)
        if (range.mass && Math.abs(value - range.mass * 1000) < range.mass * 100) {
          return {
            shouldReject: true,
            reason: `Value ${(value/1000000).toFixed(2)}MN matches ${entityName} mass (${range.mass}kg)×1000 - likely column confusion. Expected thrust: ${(range.min/1000000).toFixed(1)}-${(range.max/1000000).toFixed(1)}MN`
          };
        }

        // Check if significantly outside expected range
        if (value < range.min * 0.7 || value > range.max * 1.3) {
          // More than 30% outside range
          if (value < range.min * 0.5 || value > range.max * 2) {
            return {
              shouldReject: true,
              reason: `Value ${(value/1000000).toFixed(2)}MN is far outside expected range for ${entityName}: ${(range.min/1000000).toFixed(1)}-${(range.max/1000000).toFixed(1)}MN`
            };
          }
          return {
            shouldReject: false,
            warning: `Value ${(value/1000000).toFixed(2)}MN is outside typical range for ${entityName}: ${(range.min/1000000).toFixed(1)}-${(range.max/1000000).toFixed(1)}MN`
          };
        }
      }
    }

    return { shouldReject: false };
  }

  /**
   * Validate value against expected ranges for attribute type
   */
  private validateValueRange(claim: AIExtractedClaim): {
    issues: string[];
    confidenceMultiplier: number;
    shouldReject: boolean;
  } {
    const issues: string[] = [];
    let confidenceMultiplier = 1.0;
    let shouldReject = false;

    const value = typeof claim.value === 'number' ? claim.value : parseFloat(String(claim.value));

    if (isNaN(value)) {
      issues.push(`Value "${claim.value}" is not a valid number`);
      return { issues, confidenceMultiplier: 0.3, shouldReject: true };
    }

    switch (claim.attributeName) {
      case 'engines.thrust_n':
        // Check if this looks like total stage thrust
        const stageCheck = this.isStageThrustValue(claim.entityName, value);
        if (stageCheck.isStageThrust) {
          issues.push(stageCheck.reason!);
          shouldReject = true; // Reject total stage thrust values
          break;
        }

        // Check engine-specific plausibility (catch mass/thrust column confusion)
        const engineCheck = this.checkEngineThrustPlausibility(claim.entityName, value);
        if (engineCheck.shouldReject) {
          issues.push(engineCheck.reason!);
          shouldReject = true;
          break;
        }
        if (engineCheck.warning) {
          issues.push(engineCheck.warning);
          confidenceMultiplier *= 0.7;
        }

        // Thrust typically ranges from 10kN (small engines) to 35MN (F-1)
        if (value < 10000) {
          issues.push(`Thrust ${value}N seems too low - might be in kN?`);
          confidenceMultiplier *= 0.5;
        } else if (value > 40000000) {
          issues.push(`Thrust ${value}N seems too high for any known engine`);
          confidenceMultiplier *= 0.3;
        }
        break;

      case 'engines.isp_s':
        // ISP for chemical rockets: 200-470s range
        // >1000s is IMPOSSIBLE for chemical rockets - likely confused with thrust or other column
        if (value > 1000) {
          issues.push(`ISP ${value}s is impossible for chemical rockets (max ~470s) - likely column confusion`);
          shouldReject = true;
        } else if (value < 100) {
          issues.push(`ISP ${value}s is too low for any practical rocket engine`);
          shouldReject = true;
        } else if (value < 150 || value > 500) {
          issues.push(`ISP ${value}s is outside typical range (200-465s)`);
          confidenceMultiplier *= 0.5;
        }
        break;

      case 'engines.mass_kg':
        // Engine mass typically 50kg (small) to 8000kg (F-1)
        if (value < 10 || value > 10000) {
          issues.push(`Engine mass ${value}kg is outside typical range`);
          confidenceMultiplier *= 0.5;
        }
        break;

      case 'engines.chamber_pressure_bar':
        // Chamber pressure typically 30-300 bar
        if (value < 20 || value > 400) {
          issues.push(`Chamber pressure ${value}bar is outside typical range`);
          confidenceMultiplier *= 0.5;
        }
        break;
    }

    return { issues, confidenceMultiplier, shouldReject };
  }

  /**
   * Resolve entity from extracted name to database entity
   */
  resolveEntity(name: string): Entity | undefined {
    return this.entityCache.get(name.toLowerCase());
  }

  /**
   * Get attribute by canonical name
   */
  getAttribute(canonicalName: string): Attribute | undefined {
    return this.attributeCache.get(canonicalName);
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export interface AIBatchConfig {
  /** Maximum concurrent API calls */
  concurrency?: number;
  /** Delay between batches in ms */
  batchDelay?: number;
  /** Maximum snippets to process */
  limit?: number;
  /** Callback to check if job was cancelled */
  checkCancelled?: () => void;
  /** Callback to report progress */
  onProgress?: (current: number, total: number, message: string) => void;
}

/**
 * Process multiple snippets with AI extraction
 */
export async function batchAIExtract(
  snippets: Snippet[],
  config: AIBatchConfig = {}
): Promise<{
  results: AIExtractionResult[];
  totalClaims: number;
  processingTime: number;
}> {
  const startTime = Date.now();
  const extractor = new AIExtractor();
  await extractor.initialize();

  // Local models are slower, so lower concurrency
  const concurrency = config.concurrency || 1;
  const batchDelay = config.batchDelay || 100;
  const results: AIExtractionResult[] = [];
  let totalClaims = 0;

  // Process in batches
  for (let i = 0; i < snippets.length; i += concurrency) {
    if (config.checkCancelled) {
      config.checkCancelled();
    }

    const batch = snippets.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(snippet => extractor.extractFromSnippet(snippet))
    );

    for (const result of batchResults) {
      results.push(result);
      totalClaims += result.claims.length;
    }

    if (config.onProgress) {
      const processed = Math.min(i + concurrency, snippets.length);
      config.onProgress(processed, snippets.length, `Processed ${processed}/${snippets.length} snippets (${totalClaims} claims extracted)`);
    }

    // Delay between batches
    if (i + concurrency < snippets.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  return {
    results,
    totalClaims,
    processingTime: Date.now() - startTime,
  };
}
