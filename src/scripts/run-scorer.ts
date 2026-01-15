/**
 * Run Scorer Pipeline
 * Computes truth metrics for claims
 */

import 'dotenv/config';
import { Scorer } from '../services/scorer.js';
import { getConnection, closeConnection } from '../db/connection.js';

async function runScorer() {
  const sql = getConnection();

  console.log('Running scorer pipeline...\n');

  // Show current state
  const claimCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.claims
  `;
  const metricsCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.truth_metrics
  `;

  console.log('Before scoring:');
  console.log(`  Claims: ${claimCount[0].count}`);
  console.log(`  Truth metrics: ${metricsCount[0].count}`);

  // Run scorer
  const scorer = new Scorer();
  console.log('\n📊 Scoring claims...');

  const result = await scorer.score({});

  console.log(`\n✅ Scoring complete:`);
  console.log(`  Claims scored: ${result.claimsScored}`);
  console.log(`  Metrics created: ${result.metricsCreated}`);
  console.log(`  Metrics updated: ${result.metricsUpdated}`);

  if (result.errors.length > 0) {
    console.log(`  Errors: ${result.errors.length}`);
    for (const error of result.errors.slice(0, 5)) {
      console.log(`    - ${typeof error === 'object' ? JSON.stringify(error) : error}`);
    }
  }

  // Show after state
  const newMetricsCount = await sql`
    SELECT COUNT(*)::int as count FROM truth_ledger_claude.truth_metrics
  `;

  console.log('\n📊 Database counts after scoring:');
  console.log(`  Truth metrics: ${newMetricsCount[0].count}`);

  // Show sample truth metrics
  const sampleMetrics = await sql`
    SELECT
      e.canonical_name as entity,
      a.display_name as attribute,
      tm.truth_raw,
      tm.support_score,
      tm.contradiction_score,
      tm.independent_sources,
      c.value_json,
      c.unit
    FROM truth_ledger_claude.truth_metrics tm
    JOIN truth_ledger_claude.claims c ON tm.claim_id = c.id
    JOIN truth_ledger_claude.entities e ON c.entity_id = e.id
    JOIN truth_ledger_claude.attributes a ON c.attribute_id = a.id
    ORDER BY tm.truth_raw DESC
    LIMIT 20
  `;

  if (sampleMetrics.length > 0) {
    console.log('\n📋 Sample truth metrics (sorted by truth_raw):');
    for (const metric of sampleMetrics) {
      const valueJson = metric.value_json as { type: string; value: number } | null;
      const value = valueJson?.value !== undefined
        ? `${valueJson.value}${metric.unit ? ' ' + metric.unit : ''}`
        : '(no value)';
      const truthRaw = Number(metric.truth_raw);
      const supportScore = Number(metric.support_score);
      console.log(`  ${metric.entity} - ${metric.attribute}:`);
      console.log(`    Value: ${value}, Truth Raw: ${truthRaw.toFixed(3)}, Support: ${supportScore.toFixed(3)}, Sources: ${metric.independent_sources}`);
    }
  }

  await closeConnection();
}

runScorer().catch(console.error);
