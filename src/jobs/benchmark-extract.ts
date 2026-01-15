/**
 * Benchmark Extraction Job
 *
 * Compares different extraction methods and models:
 * - Regex-based extraction (fast, limited)
 * - AI extraction with different Ollama models
 *
 * Measures:
 * - Speed (time per snippet)
 * - Yield (claims per snippet)
 * - Accuracy (against ground truth)
 * - Scope detection (sl vs vac differentiation)
 */

import 'dotenv/config';
import { getConnection } from '../db/connection.js';
import { Extractor } from '../services/extractor.js';
import { AIExtractor, AIExtractionResult, AIExtractedClaim } from '../services/ai-extractor.js';
import { GROUND_TRUTH, validateAgainstGroundTruth, GroundTruthValue } from '../config/ground-truth.js';
import type { Snippet } from '../types/index.js';

// ============================================================================
// TYPES
// ============================================================================

export interface BenchmarkConfig {
  /** Number of snippets to test */
  sampleSize?: number;
  /** Models to benchmark */
  models?: string[];
  /** Include regex extraction */
  includeRegex?: boolean;
  /** Only test snippets mentioning these entities */
  entityFilter?: string[];
  /** Verbose output */
  verbose?: boolean;
  /** Use fixed snippet set (deterministic, reproducible) */
  fixed?: boolean;
}

export interface ModelResult {
  model: string;
  totalTime: number;
  avgTimePerSnippet: number;
  snippetsProcessed: number;
  totalClaims: number;
  claimsPerSnippet: number;
  uniqueEntities: number;
  scopeDetection: {
    withAltitude: number;
    withThrottle: number;
    withVariant: number;
  };
  accuracy: {
    testedAgainstGroundTruth: number;
    withinTolerance: number;
    avgDeviation: number;
    details: Array<{
      entity: string;
      attribute: string;
      extracted: number;
      expected: number;
      deviation: number;
      pass: boolean;
    }>;
  };
  errors: number;
}

export interface BenchmarkResult {
  timestamp: string;
  config: BenchmarkConfig;
  sampleSnippets: number;
  results: ModelResult[];
  winner: {
    fastest: string;
    mostClaims: string;
    mostAccurate: string;
    bestOverall: string;
  };
  summary: string;
}

// ============================================================================
// BENCHMARK FUNCTIONS
// ============================================================================

/**
 * Get sample snippets for benchmarking
 */
async function getSampleSnippets(config: BenchmarkConfig): Promise<Snippet[]> {
  const sql = getConnection();
  const limit = config.sampleSize || 10;

  // Use deterministic ordering for reproducible benchmarks
  const orderBy = config.fixed ? sql`ORDER BY s.id` : sql`ORDER BY RANDOM()`;

  // Get snippets that are likely to contain engine data
  // Prioritize snippets mentioning ground truth entities
  const groundTruthEntities = [...new Set(GROUND_TRUTH.map(gt => gt.entityName))];

  let snippets: Snippet[];

  if (config.entityFilter?.length) {
    // Filter by specific entities
    snippets = await sql<Snippet[]>`
      SELECT s.*
      FROM truth_ledger.snippets s
      WHERE s.text ILIKE ANY(${config.entityFilter.map(e => `%${e}%`)})
      ${orderBy}
      LIMIT ${limit}
    `;
  } else {
    // Try to get snippets with ground truth entities first
    snippets = await sql<Snippet[]>`
      SELECT s.*
      FROM truth_ledger.snippets s
      WHERE s.text ILIKE ANY(${groundTruthEntities.map(e => `%${e}%`)})
      ${orderBy}
      LIMIT ${limit}
    `;

    // If not enough, get random snippets
    if (snippets.length < limit) {
      const more = await sql<Snippet[]>`
        SELECT s.*
        FROM truth_ledger.snippets s
        WHERE s.id NOT IN (${snippets.length > 0 ? sql`${snippets.map(s => s.id)}` : sql`''`})
        ${orderBy}
        LIMIT ${limit - snippets.length}
      `;
      snippets = [...snippets, ...more];
    }
  }

  return snippets;
}

/**
 * Run AI extraction benchmark for a specific model
 */
async function benchmarkAIModel(
  model: string,
  snippets: Snippet[],
  verbose: boolean
): Promise<ModelResult> {
  const startTime = Date.now();
  const extractor = new AIExtractor({ model });
  await extractor.initialize();

  const allClaims: AIExtractedClaim[] = [];
  let errors = 0;

  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    if (verbose) {
      console.log(`  [${model}] Processing snippet ${i + 1}/${snippets.length}...`);
    }

    try {
      const result = await extractor.extractFromSnippet(snippet);
      allClaims.push(...result.claims);

      if (verbose && result.claims.length > 0) {
        console.log(`    Found ${result.claims.length} claims`);
      }
    } catch (err) {
      errors++;
      if (verbose) {
        console.error(`    Error: ${err}`);
      }
    }
  }

  const totalTime = Date.now() - startTime;

  // Analyze results
  const uniqueEntities = new Set(allClaims.map(c => c.entityName)).size;

  const scopeDetection = {
    withAltitude: allClaims.filter(c => c.scope?.altitude).length,
    withThrottle: allClaims.filter(c => c.scope?.throttle).length,
    withVariant: allClaims.filter(c => c.scope?.variant || c.entityVariant).length,
  };

  // Validate against ground truth
  const accuracyDetails: ModelResult['accuracy']['details'] = [];
  let testedCount = 0;
  let withinToleranceCount = 0;
  let totalDeviation = 0;

  for (const claim of allClaims) {
    const value = typeof claim.value === 'number' ? claim.value : parseFloat(String(claim.value));
    if (isNaN(value)) continue;

    const validation = validateAgainstGroundTruth(
      claim.entityName,
      claim.attributeName,
      value,
      claim.scope
    );

    if (validation.matched && validation.groundTruth) {
      testedCount++;
      if (validation.withinTolerance) withinToleranceCount++;
      if (validation.deviation !== null) totalDeviation += validation.deviation;

      accuracyDetails.push({
        entity: claim.entityName,
        attribute: claim.attributeName,
        extracted: value,
        expected: validation.groundTruth.value,
        deviation: validation.deviation || 0,
        pass: validation.withinTolerance,
      });
    }
  }

  return {
    model,
    totalTime,
    avgTimePerSnippet: totalTime / snippets.length,
    snippetsProcessed: snippets.length,
    totalClaims: allClaims.length,
    claimsPerSnippet: allClaims.length / snippets.length,
    uniqueEntities,
    scopeDetection,
    accuracy: {
      testedAgainstGroundTruth: testedCount,
      withinTolerance: withinToleranceCount,
      avgDeviation: testedCount > 0 ? totalDeviation / testedCount : 0,
      details: accuracyDetails,
    },
    errors,
  };
}

/**
 * Run regex extraction benchmark
 */
async function benchmarkRegex(
  snippets: Snippet[],
  verbose: boolean
): Promise<ModelResult> {
  const startTime = Date.now();
  const extractor = new Extractor();

  // Regex extractor works differently - it processes all snippets at once
  // For fair comparison, we'll time how long it takes
  let totalClaims = 0;
  let errors = 0;

  try {
    // Note: Regex extractor doesn't have per-snippet extraction
    // We'll simulate by running extract with our sample
    if (verbose) {
      console.log(`  [regex] Processing ${snippets.length} snippets...`);
    }

    const result = await extractor.extract({ limit: snippets.length });
    totalClaims = result.claimsCreated;
  } catch (err) {
    errors++;
    if (verbose) {
      console.error(`    Error: ${err}`);
    }
  }

  const totalTime = Date.now() - startTime;

  // Regex doesn't do scope detection
  return {
    model: 'regex',
    totalTime,
    avgTimePerSnippet: totalTime / snippets.length,
    snippetsProcessed: snippets.length,
    totalClaims,
    claimsPerSnippet: totalClaims / snippets.length,
    uniqueEntities: 0, // Regex doesn't track this well
    scopeDetection: {
      withAltitude: 0, // Regex doesn't detect scope
      withThrottle: 0,
      withVariant: 0,
    },
    accuracy: {
      testedAgainstGroundTruth: 0,
      withinTolerance: 0,
      avgDeviation: 0,
      details: [],
    },
    errors,
  };
}

/**
 * Run full benchmark comparison
 */
export async function runBenchmark(config: BenchmarkConfig = {}): Promise<BenchmarkResult> {
  const verbose = config.verbose ?? true;
  const models = config.models || ['llama3.1:8b'];
  const includeRegex = config.includeRegex ?? false;

  console.log('\n========================================');
  console.log('   EXTRACTION BENCHMARK');
  console.log('========================================\n');

  // Get sample snippets
  console.log('Loading sample snippets...');
  const snippets = await getSampleSnippets(config);
  console.log(`Loaded ${snippets.length} snippets for testing\n`);

  const results: ModelResult[] = [];

  // Benchmark each AI model
  for (const model of models) {
    console.log(`\nBenchmarking: ${model}`);
    console.log('-'.repeat(40));

    try {
      const result = await benchmarkAIModel(model, snippets, verbose);
      results.push(result);

      console.log(`\n  Results for ${model}:`);
      console.log(`    Time: ${(result.totalTime / 1000).toFixed(1)}s total, ${(result.avgTimePerSnippet / 1000).toFixed(1)}s/snippet`);
      console.log(`    Claims: ${result.totalClaims} total, ${result.claimsPerSnippet.toFixed(1)}/snippet`);
      console.log(`    Entities: ${result.uniqueEntities} unique`);
      console.log(`    Scope detection: altitude=${result.scopeDetection.withAltitude}, throttle=${result.scopeDetection.withThrottle}`);
      console.log(`    Accuracy: ${result.accuracy.withinTolerance}/${result.accuracy.testedAgainstGroundTruth} within tolerance`);
      if (result.errors > 0) {
        console.log(`    Errors: ${result.errors}`);
      }
    } catch (err) {
      console.error(`  Failed to benchmark ${model}: ${err}`);
    }
  }

  // Benchmark regex if requested
  if (includeRegex) {
    console.log(`\nBenchmarking: regex`);
    console.log('-'.repeat(40));

    try {
      const result = await benchmarkRegex(snippets, verbose);
      results.push(result);

      console.log(`\n  Results for regex:`);
      console.log(`    Time: ${(result.totalTime / 1000).toFixed(1)}s total`);
      console.log(`    Claims: ${result.totalClaims} total`);
    } catch (err) {
      console.error(`  Failed to benchmark regex: ${err}`);
    }
  }

  // Determine winners
  const aiResults = results.filter(r => r.model !== 'regex');
  const fastest = aiResults.reduce((a, b) => a.avgTimePerSnippet < b.avgTimePerSnippet ? a : b);
  const mostClaims = aiResults.reduce((a, b) => a.claimsPerSnippet > b.claimsPerSnippet ? a : b);
  const mostAccurate = aiResults.reduce((a, b) => {
    const aScore = a.accuracy.testedAgainstGroundTruth > 0
      ? a.accuracy.withinTolerance / a.accuracy.testedAgainstGroundTruth
      : 0;
    const bScore = b.accuracy.testedAgainstGroundTruth > 0
      ? b.accuracy.withinTolerance / b.accuracy.testedAgainstGroundTruth
      : 0;
    return aScore > bScore ? a : b;
  });

  // Calculate overall score (weighted: 30% speed, 30% claims, 40% accuracy)
  const bestOverall = aiResults.reduce((a, b) => {
    const maxTime = Math.max(...aiResults.map(r => r.avgTimePerSnippet));
    const maxClaims = Math.max(...aiResults.map(r => r.claimsPerSnippet));

    const aSpeedScore = 1 - (a.avgTimePerSnippet / maxTime);
    const aClaimScore = a.claimsPerSnippet / (maxClaims || 1);
    const aAccuracyScore = a.accuracy.testedAgainstGroundTruth > 0
      ? a.accuracy.withinTolerance / a.accuracy.testedAgainstGroundTruth
      : 0;
    const aTotal = aSpeedScore * 0.3 + aClaimScore * 0.3 + aAccuracyScore * 0.4;

    const bSpeedScore = 1 - (b.avgTimePerSnippet / maxTime);
    const bClaimScore = b.claimsPerSnippet / (maxClaims || 1);
    const bAccuracyScore = b.accuracy.testedAgainstGroundTruth > 0
      ? b.accuracy.withinTolerance / b.accuracy.testedAgainstGroundTruth
      : 0;
    const bTotal = bSpeedScore * 0.3 + bClaimScore * 0.3 + bAccuracyScore * 0.4;

    return aTotal > bTotal ? a : b;
  });

  // Generate summary
  const summary = generateSummary(results, snippets.length);

  const benchmarkResult: BenchmarkResult = {
    timestamp: new Date().toISOString(),
    config,
    sampleSnippets: snippets.length,
    results,
    winner: {
      fastest: fastest.model,
      mostClaims: mostClaims.model,
      mostAccurate: mostAccurate.model,
      bestOverall: bestOverall.model,
    },
    summary,
  };

  // Print summary
  console.log('\n========================================');
  console.log('   BENCHMARK SUMMARY');
  console.log('========================================\n');
  console.log(summary);

  return benchmarkResult;
}

/**
 * Generate human-readable summary
 */
function generateSummary(results: ModelResult[], snippetCount: number): string {
  const lines: string[] = [];

  lines.push(`Tested ${results.length} extraction method(s) on ${snippetCount} snippets\n`);

  // Comparison table header
  lines.push('| Model | Time/Snippet | Claims/Snippet | Accuracy | Scope Detection |');
  lines.push('|-------|-------------|----------------|----------|-----------------|');

  for (const r of results) {
    const time = `${(r.avgTimePerSnippet / 1000).toFixed(1)}s`;
    const claims = r.claimsPerSnippet.toFixed(1);
    const accuracy = r.accuracy.testedAgainstGroundTruth > 0
      ? `${((r.accuracy.withinTolerance / r.accuracy.testedAgainstGroundTruth) * 100).toFixed(0)}%`
      : 'N/A';
    const scope = `${r.scopeDetection.withAltitude}/${r.totalClaims}`;

    lines.push(`| ${r.model.padEnd(13)} | ${time.padEnd(11)} | ${claims.padEnd(14)} | ${accuracy.padEnd(8)} | ${scope.padEnd(15)} |`);
  }

  lines.push('');

  // Accuracy details
  const allAccuracyDetails = results.flatMap(r =>
    r.accuracy.details.map(d => ({ ...d, model: r.model }))
  );

  if (allAccuracyDetails.length > 0) {
    lines.push('\nGround Truth Validation:');
    for (const d of allAccuracyDetails) {
      const status = d.pass ? '✓' : '✗';
      const dev = (d.deviation * 100).toFixed(1);
      lines.push(`  ${status} ${d.model}: ${d.entity} ${d.attribute} = ${d.extracted} (expected ${d.expected}, ${dev}% deviation)`);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// CLI RUNNER
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse CLI args
  const args = process.argv.slice(2);
  const config: BenchmarkConfig = {
    sampleSize: 5,
    models: ['granite3.3:8b'],
    includeRegex: false,
    verbose: true,
    fixed: false,
  };

  // Parse args
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--samples' && args[i + 1]) {
      config.sampleSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--models' && args[i + 1]) {
      config.models = args[i + 1].split(',');
      i++;
    } else if (args[i] === '--include-regex') {
      config.includeRegex = true;
    } else if (args[i] === '--entity' && args[i + 1]) {
      config.entityFilter = config.entityFilter || [];
      config.entityFilter.push(args[i + 1]);
      i++;
    } else if (args[i] === '--quiet') {
      config.verbose = false;
    } else if (args[i] === '--fixed') {
      config.fixed = true;
    }
  }

  console.log('Benchmark configuration:');
  console.log(`  Samples: ${config.sampleSize}`);
  console.log(`  Models: ${config.models?.join(', ')}`);
  console.log(`  Include regex: ${config.includeRegex}`);
  console.log(`  Fixed snippets: ${config.fixed}`);
  if (config.entityFilter) {
    console.log(`  Entity filter: ${config.entityFilter.join(', ')}`);
  }

  runBenchmark(config)
    .then(result => {
      console.log('\n\nBenchmark complete!');
      console.log(`Best overall: ${result.winner.bestOverall}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}
