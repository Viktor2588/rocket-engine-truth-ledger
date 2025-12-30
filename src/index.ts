/**
 * Truth Ledger - Main Entry Point
 * Centralized fact-checking system for aerospace data
 *
 * This module provides the main exports and entry points for:
 * - API server
 * - Pipeline jobs
 * - Service classes
 */

// Load environment variables
import 'dotenv/config';

// Export core services
export { Ingestor, HtmlFetcher, Snippetizer, SourceManager } from './services/ingestor.js';
export { Extractor, AttributeExtractor, NumericExtractor, EntityMatcher, AttributeManager } from './services/extractor.js';
export { ConflictDetector } from './services/conflict-detector.js';
export { Deriver } from './services/deriver.js';
export { Scorer } from './services/scorer.js';
export { FactResolver } from './services/fact-resolver.js';
export { IntegrityChecker } from './services/integrity-checker.js';
export { SyncManager } from './services/sync-manager.js';

// Export job orchestrator
export { JobOrchestrator } from './jobs/orchestrator.js';

// Export API server
export { createApp, startServer } from './api/server.js';

// Export database utilities
export { getConnection, closeConnection, transaction, healthCheck } from './db/connection.js';

// Export configuration
export {
  DOC_TYPE_MULTIPLIER,
  LOW_QUALITY_DOC_TYPES,
  LOW_QUALITY_CAP_RATIO,
  SOURCE_TYPE_TRUST_RANGES,
  computeIndependenceWeight,
  computeClusterWeight,
  RECENCY_CONFIG,
  computeRecencyScore,
  RAW_SCORING_CONFIG,
  interpolateSliderValue,
  DISPLAY_POLICY,
  GAMMA_CURVE,
  computeGamma,
  computeTruthDisplay,
  DEFAULT_TOLERANCES,
  valuesAreConflicting,
  computeDisplayStatus,
  SCOPE_TEMPLATES,
} from './config/constants.js';
export * from './config/database.js';

// Export types
export type * from './types/index.js';

// Export crypto utilities
export { computeContentHash, computeSnippetHash, computeClaimKeyHash } from './utils/crypto.js';

// ============================================================================
// MAIN FUNCTION
// ============================================================================

import { getConnection, closeConnection, healthCheck } from './db/connection.js';

async function main() {
  const command = process.argv[2];

  console.log('Truth Ledger v0.1.0');
  console.log('===================\n');

  switch (command) {
    case 'serve':
    case 'server':
    case 'api': {
      const { startServer } = await import('./api/server.js');
      const port = parseInt(process.env.PORT || '3000', 10);
      await startServer(port);
      break;
    }

    case 'job':
    case 'pipeline': {
      const { runFromCLI } = await import('./jobs/orchestrator.js');
      await runFromCLI(process.argv.slice(3));
      await closeConnection();
      break;
    }

    case 'status':
    default: {
      await showStatus();
      await closeConnection();
      break;
    }
  }
}

async function showStatus() {
  console.log('Checking database connection...');
  const isHealthy = await healthCheck();

  if (isHealthy) {
    console.log('Database connection: OK\n');

    const sql = getConnection();

    // Check if truth_ledger schema exists
    const schemas = await sql`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'truth_ledger'
    `;

    if (schemas.length > 0) {
      console.log('Truth Ledger schema: EXISTS');

      // Count records in each table
      const counts = await sql`
        SELECT
          'sources' as table_name,
          (SELECT COUNT(*) FROM truth_ledger_claude.sources) as count
        UNION ALL
        SELECT
          'documents',
          (SELECT COUNT(*) FROM truth_ledger_claude.documents)
        UNION ALL
        SELECT
          'snippets',
          (SELECT COUNT(*) FROM truth_ledger_claude.snippets)
        UNION ALL
        SELECT
          'entities',
          (SELECT COUNT(*) FROM truth_ledger_claude.entities)
        UNION ALL
        SELECT
          'attributes',
          (SELECT COUNT(*) FROM truth_ledger_claude.attributes)
        UNION ALL
        SELECT
          'conflict_groups',
          (SELECT COUNT(*) FROM truth_ledger_claude.conflict_groups)
        UNION ALL
        SELECT
          'claims',
          (SELECT COUNT(*) FROM truth_ledger_claude.claims)
        UNION ALL
        SELECT
          'evidence',
          (SELECT COUNT(*) FROM truth_ledger_claude.evidence)
        UNION ALL
        SELECT
          'truth_metrics',
          (SELECT COUNT(*) FROM truth_ledger_claude.truth_metrics)
        UNION ALL
        SELECT
          'field_links',
          (SELECT COUNT(*) FROM truth_ledger_claude.field_links)
      `;

      console.log('\nTable counts:');
      for (const row of counts) {
        console.log(`  ${row.table_name}: ${row.count}`);
      }

      // Show conflicts
      const conflicts = await sql`
        SELECT COUNT(*) as count FROM truth_ledger_claude.conflict_groups
        WHERE conflict_present = true
      `;
      console.log(`\nActive conflicts: ${conflicts[0].count}`);

      // Show pending reviews
      const reviews = await sql`
        SELECT COUNT(*) as count FROM truth_ledger_claude.review_queue
        WHERE status = 'pending'
      `;
      console.log(`Pending reviews: ${reviews[0].count}`);

    } else {
      console.log('Truth Ledger schema: NOT FOUND');
      console.log('Run migrations: npm run migrate');
    }
  } else {
    console.log('Database connection: FAILED');
    console.log('Check your database configuration in .env');
  }

  console.log('\n---');
  console.log('Commands:');
  console.log('  npm run dev           - Start API server in development mode');
  console.log('  npm run serve         - Start API server');
  console.log('  npm run job pipeline  - Run full pipeline');
  console.log('  npm run job integrity - Run integrity checks');
  console.log('  npm run job health    - Quick health check');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
