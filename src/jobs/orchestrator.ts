/**
 * Job Orchestrator
 * Schedules and runs the Truth Ledger pipeline jobs
 *
 * Pipeline Stages:
 * 1. truth_ingest  - Fetch documents, create snippets
 * 2. truth_extract - Extract claims and evidence
 * 3. truth_derive  - Create domain-default claims
 * 4. truth_score   - Compute truth_metrics
 *
 * Additional Jobs:
 * - conflict_detection - Analyze conflict groups
 * - integrity_check   - Run integrity validations
 */

import { Ingestor, IngestConfig } from '../services/ingestor.js';
import { Extractor, ExtractConfig } from '../services/extractor.js';
import { ConflictDetector, ConflictDetectionConfig } from '../services/conflict-detector.js';
import { Deriver, DeriverConfig } from '../services/deriver.js';
import { Scorer, ScorerConfig } from '../services/scorer.js';
import { IntegrityChecker, IntegrityReport } from '../services/integrity-checker.js';
import { pino } from 'pino';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineConfig {
  stages?: ('ingest' | 'extract' | 'derive' | 'score' | 'detect_conflicts')[];
  ingestConfig?: Partial<IngestConfig>;
  extractConfig?: Partial<ExtractConfig>;
  deriveConfig?: Partial<DeriverConfig>;
  scoreConfig?: Partial<ScorerConfig>;
  conflictConfig?: Partial<ConflictDetectionConfig>;
  stopOnError?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface PipelineResult {
  startedAt: Date;
  completedAt: Date;
  duration: number;
  stagesRun: string[];
  stageResults: Record<string, {
    success: boolean;
    duration: number;
    recordsProcessed: number;
    errors: string[];
  }>;
  success: boolean;
  summary: string;
}

export interface ScheduledJob {
  name: string;
  cron: string;  // Cron expression
  handler: () => Promise<void>;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

// ============================================================================
// LOGGER
// ============================================================================

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
    },
  },
});

// ============================================================================
// JOB ORCHESTRATOR
// ============================================================================

export class JobOrchestrator {
  private ingestor: Ingestor;
  private extractor: Extractor;
  private conflictDetector: ConflictDetector;
  private deriver: Deriver;
  private scorer: Scorer;
  private integrityChecker: IntegrityChecker;

  constructor() {
    this.ingestor = new Ingestor();
    this.extractor = new Extractor();
    this.conflictDetector = new ConflictDetector();
    this.deriver = new Deriver();
    this.scorer = new Scorer();
    this.integrityChecker = new IntegrityChecker();
  }

  /**
   * Run the full pipeline
   */
  async runPipeline(config: PipelineConfig = {}): Promise<PipelineResult> {
    const startedAt = new Date();
    const stageResults: PipelineResult['stageResults'] = {};
    const stagesRun: string[] = [];
    let success = true;

    const stages = config.stages || ['ingest', 'extract', 'derive', 'score', 'detect_conflicts'];

    logger.info({ stages }, 'Starting pipeline');

    for (const stage of stages) {
      const stageStart = Date.now();
      const stageResult = {
        success: true,
        duration: 0,
        recordsProcessed: 0,
        errors: [] as string[],
      };

      try {
        switch (stage) {
          case 'ingest':
            if (config.ingestConfig?.sourceId && config.ingestConfig?.urls) {
              const result = await this.ingestor.ingest(config.ingestConfig as IngestConfig);
              stageResult.recordsProcessed = result.documentsCreated + result.documentsUpdated + result.snippetsCreated;
              stageResult.errors = result.errors.map(e => `${e.url}: ${e.error}`);
              logger.info({
                stage,
                documentsCreated: result.documentsCreated,
                documentsUpdated: result.documentsUpdated,
                snippetsCreated: result.snippetsCreated,
              }, 'Ingest stage completed');
            } else {
              logger.info('Skipping ingest - no sourceId/urls provided');
            }
            break;

          case 'extract':
            const extractResult = await this.extractor.extract(config.extractConfig);
            stageResult.recordsProcessed = extractResult.claimsCreated + extractResult.evidenceCreated;
            stageResult.errors = extractResult.errors.map(e => `${e.snippetId}: ${e.error}`);
            logger.info({
              stage,
              claimsCreated: extractResult.claimsCreated,
              evidenceCreated: extractResult.evidenceCreated,
              conflictGroupsCreated: extractResult.conflictGroupsCreated,
            }, 'Extract stage completed');
            break;

          case 'derive':
            const deriveResult = await this.deriver.derive(config.deriveConfig);
            stageResult.recordsProcessed = deriveResult.derivedClaimsCreated + deriveResult.fieldLinksCreated;
            stageResult.errors = deriveResult.errors.map(e => `${e.entityId}: ${e.error}`);
            logger.info({
              stage,
              derivedClaimsCreated: deriveResult.derivedClaimsCreated,
              fieldLinksCreated: deriveResult.fieldLinksCreated,
              fieldLinksUpdated: deriveResult.fieldLinksUpdated,
            }, 'Derive stage completed');
            break;

          case 'score':
            const scoreResult = await this.scorer.score(config.scoreConfig);
            stageResult.recordsProcessed = scoreResult.claimsScored;
            stageResult.errors = scoreResult.errors.map(e => `${e.claimId}: ${e.error}`);
            logger.info({
              stage,
              claimsScored: scoreResult.claimsScored,
              metricsCreated: scoreResult.metricsCreated,
              metricsUpdated: scoreResult.metricsUpdated,
            }, 'Score stage completed');
            break;

          case 'detect_conflicts':
            const conflictResult = await this.conflictDetector.detectConflicts(config.conflictConfig);
            stageResult.recordsProcessed = conflictResult.groupsAnalyzed;
            stageResult.errors = conflictResult.errors.map(e => `${e.groupId}: ${e.error}`);
            logger.info({
              stage,
              groupsAnalyzed: conflictResult.groupsAnalyzed,
              conflictsFound: conflictResult.conflictsFound,
              conflictsResolved: conflictResult.conflictsResolved,
              reviewItemsCreated: conflictResult.reviewItemsCreated,
            }, 'Conflict detection stage completed');
            break;
        }

        stageResult.success = stageResult.errors.length === 0;

      } catch (error) {
        stageResult.success = false;
        stageResult.errors.push(error instanceof Error ? error.message : String(error));
        logger.error({ stage, error }, 'Stage failed');

        if (config.stopOnError) {
          success = false;
          break;
        }
      }

      stageResult.duration = Date.now() - stageStart;
      stageResults[stage] = stageResult;
      stagesRun.push(stage);

      if (!stageResult.success) {
        success = false;
      }
    }

    const completedAt = new Date();
    const duration = completedAt.getTime() - startedAt.getTime();

    const result: PipelineResult = {
      startedAt,
      completedAt,
      duration,
      stagesRun,
      stageResults,
      success,
      summary: this.generateSummary(stageResults, success),
    };

    logger.info({
      success,
      duration: `${duration}ms`,
      stagesRun,
    }, 'Pipeline completed');

    return result;
  }

  /**
   * Run a single stage
   */
  async runStage(stage: string, config: PipelineConfig = {}): Promise<PipelineResult> {
    return this.runPipeline({
      ...config,
      stages: [stage as any],
    });
  }

  /**
   * Run integrity checks
   */
  async runIntegrityChecks(): Promise<IntegrityReport> {
    logger.info('Starting integrity checks');
    const report = await this.integrityChecker.runAllChecks();
    logger.info({
      checksRun: report.checksRun,
      checksPassed: report.checksPassed,
      checksFailed: report.checksFailed,
      violationCount: report.violations.length,
    }, 'Integrity checks completed');
    return report;
  }

  /**
   * Run a quick health check pipeline
   */
  async runHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Check for orphaned claims
    const report = await this.integrityChecker.runAllChecks();

    for (const violation of report.violations) {
      if (violation.severity === 'critical') {
        issues.push(`[CRITICAL] ${violation.description}`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Generate pipeline summary
   */
  private generateSummary(
    stageResults: PipelineResult['stageResults'],
    success: boolean
  ): string {
    const lines: string[] = [];

    lines.push(success ? '✅ Pipeline completed successfully' : '❌ Pipeline completed with errors');
    lines.push('');

    for (const [stage, result] of Object.entries(stageResults)) {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      lines.push(`${status} ${stage}: ${result.recordsProcessed} records (${duration})`);

      if (result.errors.length > 0) {
        for (const error of result.errors.slice(0, 3)) {
          lines.push(`   ⚠️ ${error}`);
        }
        if (result.errors.length > 3) {
          lines.push(`   ... and ${result.errors.length - 3} more errors`);
        }
      }
    }

    return lines.join('\n');
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

export async function runFromCLI(args: string[]): Promise<void> {
  const orchestrator = new JobOrchestrator();
  const command = args[0] || 'pipeline';

  switch (command) {
    case 'pipeline':
      const stages = args.slice(1).length > 0 ? args.slice(1) : undefined;
      const result = await orchestrator.runPipeline({ stages: stages as any });
      console.log(result.summary);
      process.exit(result.success ? 0 : 1);
      break;

    case 'ingest':
      console.log('Usage: npm run job ingest <sourceId> <url1> [url2] ...');
      if (args.length >= 3) {
        const sourceId = args[1];
        const urls = args.slice(2);
        await orchestrator.runPipeline({
          stages: ['ingest'],
          ingestConfig: { sourceId, urls },
        });
      }
      break;

    case 'extract':
      await orchestrator.runStage('extract');
      break;

    case 'derive':
      await orchestrator.runStage('derive');
      break;

    case 'score':
      await orchestrator.runStage('score');
      break;

    case 'conflicts':
      await orchestrator.runStage('detect_conflicts');
      break;

    case 'integrity':
      const report = await orchestrator.runIntegrityChecks();
      console.log('\n=== Integrity Report ===');
      console.log(`Checks run: ${report.checksRun}`);
      console.log(`Passed: ${report.checksPassed}`);
      console.log(`Failed: ${report.checksFailed}`);
      if (report.violations.length > 0) {
        console.log('\nViolations:');
        for (const v of report.violations) {
          console.log(`  [${v.severity.toUpperCase()}] ${v.description}`);
        }
      }
      process.exit(report.checksFailed > 0 ? 1 : 0);
      break;

    case 'health':
      const health = await orchestrator.runHealthCheck();
      console.log(health.healthy ? '✅ System is healthy' : '❌ System has issues');
      if (health.issues.length > 0) {
        console.log('\nIssues:');
        for (const issue of health.issues) {
          console.log(`  ${issue}`);
        }
      }
      process.exit(health.healthy ? 0 : 1);
      break;

    default:
      console.log(`
Truth Ledger Job Orchestrator

Commands:
  pipeline [stages...]  Run full pipeline or specific stages
  ingest <sourceId> <urls...>  Ingest documents from source
  extract              Extract claims from pending snippets
  derive               Derive domain-default claims
  score                Compute truth metrics
  conflicts            Detect and analyze conflicts
  integrity            Run integrity checks
  health               Quick health check

Stages: ingest, extract, derive, score, detect_conflicts
      `);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFromCLI(process.argv.slice(2)).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
