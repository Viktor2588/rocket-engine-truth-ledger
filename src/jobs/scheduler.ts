/**
 * Job Scheduler
 * Runs scheduled jobs at defined intervals
 *
 * Usage:
 *   pnpm job:scheduler          # Run once (for cron)
 *   pnpm job:scheduler --daemon # Run as daemon with intervals
 */

import 'dotenv/config';
import postgres from 'postgres';
import { pino } from 'pino';
import { IntegrityChecker, SourceHealthReport } from '../services/integrity-checker.js';
import { getConnection } from '../db/connection.js';

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
// TYPES
// ============================================================================

export interface ScheduledJobResult {
  jobName: string;
  success: boolean;
  startedAt: Date;
  completedAt: Date;
  duration: number;
  summary: string;
  alerts: Alert[];
}

export interface Alert {
  level: 'info' | 'warning' | 'critical';
  source: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface SchedulerConfig {
  runOnce?: boolean;
  jobs?: string[];
  integrityIntervalMs?: number;
  healthIntervalMs?: number;
}

// ============================================================================
// SCHEDULER
// ============================================================================

export class Scheduler {
  private integrityChecker: IntegrityChecker;
  private running = false;
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    this.integrityChecker = new IntegrityChecker();
  }

  /**
   * Run all scheduled jobs once
   */
  async runOnce(jobs?: string[]): Promise<ScheduledJobResult[]> {
    const results: ScheduledJobResult[] = [];
    const jobsToRun = jobs || ['integrity', 'health'];

    for (const job of jobsToRun) {
      switch (job) {
        case 'integrity':
          results.push(await this.runIntegrityJob());
          break;
        case 'health':
          results.push(await this.runHealthJob());
          break;
        default:
          logger.warn({ job }, 'Unknown job');
      }
    }

    // Log summary
    const alerts = results.flatMap(r => r.alerts);
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    const warningAlerts = alerts.filter(a => a.level === 'warning');

    if (criticalAlerts.length > 0) {
      logger.error({ count: criticalAlerts.length }, 'Critical alerts found');
      for (const alert of criticalAlerts) {
        logger.error({ source: alert.source, details: alert.details }, alert.message);
      }
    }

    if (warningAlerts.length > 0) {
      logger.warn({ count: warningAlerts.length }, 'Warnings found');
      for (const alert of warningAlerts) {
        logger.warn({ source: alert.source, details: alert.details }, alert.message);
      }
    }

    return results;
  }

  /**
   * Run as daemon with intervals
   */
  async runDaemon(config: SchedulerConfig = {}): Promise<void> {
    if (this.running) {
      logger.warn('Scheduler already running');
      return;
    }

    this.running = true;
    logger.info('Starting scheduler daemon');

    // Default intervals
    const integrityInterval = config.integrityIntervalMs || 24 * 60 * 60 * 1000; // 24 hours
    const healthInterval = config.healthIntervalMs || 60 * 60 * 1000; // 1 hour

    // Run immediately
    await this.runOnce();

    // Set up intervals
    this.intervals.push(
      setInterval(async () => {
        try {
          await this.runIntegrityJob();
        } catch (error) {
          logger.error({ error }, 'Integrity job failed');
        }
      }, integrityInterval)
    );

    this.intervals.push(
      setInterval(async () => {
        try {
          await this.runHealthJob();
        } catch (error) {
          logger.error({ error }, 'Health job failed');
        }
      }, healthInterval)
    );

    logger.info({
      integrityInterval: `${integrityInterval / 1000 / 60} minutes`,
      healthInterval: `${healthInterval / 1000 / 60} minutes`,
    }, 'Scheduler intervals set');

    // Handle shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  /**
   * Stop daemon
   */
  stop(): void {
    logger.info('Stopping scheduler');
    this.running = false;
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    process.exit(0);
  }

  /**
   * Run integrity check job
   */
  private async runIntegrityJob(): Promise<ScheduledJobResult> {
    const startedAt = new Date();
    const alerts: Alert[] = [];

    try {
      logger.info('Running integrity check job');
      const report = await this.integrityChecker.runAllChecks();

      // Convert violations to alerts
      for (const violation of report.violations) {
        alerts.push({
          level: violation.severity === 'critical' ? 'critical' :
                 violation.severity === 'warning' ? 'warning' : 'info',
          source: 'integrity',
          message: violation.description,
          details: {
            checkName: violation.checkName,
            affectedTable: violation.affectedTable,
            affectedCount: violation.affectedIds.length,
            remediation: violation.remediation,
          },
        });
      }

      // Auto-fix safe issues
      if (report.checksFailed > 0) {
        const fixResult = await this.integrityChecker.autoFix({
          fixCounts: true,
          fixOrphanedClaims: false, // Dangerous - don't auto-delete
          fixInvalidLinks: true,
        });

        if (fixResult.totalFixed > 0) {
          logger.info({ fixes: fixResult.fixes }, 'Auto-fixed integrity issues');
        }
      }

      const completedAt = new Date();

      // Store result in sync_status
      await this.recordJobRun('integrity_check', true, {
        checksRun: report.checksRun,
        checksPassed: report.checksPassed,
        checksFailed: report.checksFailed,
        violationCount: report.violations.length,
      });

      return {
        jobName: 'integrity',
        success: report.checksFailed === 0,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        summary: `Ran ${report.checksRun} checks: ${report.checksPassed} passed, ${report.checksFailed} failed`,
        alerts,
      };
    } catch (error) {
      const completedAt = new Date();
      await this.recordJobRun('integrity_check', false, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        jobName: 'integrity',
        success: false,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        summary: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        alerts: [{
          level: 'critical',
          source: 'integrity',
          message: 'Integrity check job failed',
          details: { error: error instanceof Error ? error.message : String(error) },
        }],
      };
    }
  }

  /**
   * Run source health check job
   */
  private async runHealthJob(): Promise<ScheduledJobResult> {
    const startedAt = new Date();
    const alerts: Alert[] = [];

    try {
      logger.info('Running health check job');
      const health = await this.integrityChecker.getSourceHealth();
      const stats = await this.integrityChecker.getPipelineStats();

      // Check for stale sources
      const staleSources = health.sources.filter(s => s.status === 'stale');
      if (staleSources.length > 0) {
        alerts.push({
          level: 'warning',
          source: 'health',
          message: `${staleSources.length} sources are stale (no updates in 30+ days)`,
          details: {
            staleSources: staleSources.map(s => ({
              name: s.sourceName,
              lastDocument: s.lastDocumentAt,
              daysSince: s.daysSinceLastDocument,
            })),
          },
        });
      }

      // Check for empty sources
      const emptySources = health.sources.filter(s => s.status === 'empty');
      if (emptySources.length > 0) {
        alerts.push({
          level: 'info',
          source: 'health',
          message: `${emptySources.length} sources have no documents`,
          details: {
            emptySources: emptySources.map(s => s.sourceName),
          },
        });
      }

      // Check for unscored claims
      if (stats.claimsWithoutMetrics > 0) {
        const pct = Math.round((stats.claimsWithoutMetrics / stats.claims) * 100);
        const level = pct > 20 ? 'warning' : 'info';
        alerts.push({
          level,
          source: 'health',
          message: `${stats.claimsWithoutMetrics} claims (${pct}%) have no metrics`,
          details: {
            claimsWithoutMetrics: stats.claimsWithoutMetrics,
            totalClaims: stats.claims,
          },
        });
      }

      // Check for pending reviews
      if (stats.pendingReviews > 10) {
        alerts.push({
          level: 'warning',
          source: 'health',
          message: `${stats.pendingReviews} items pending review`,
          details: { pendingReviews: stats.pendingReviews },
        });
      }

      // Check for active conflicts
      if (stats.activeConflicts > 5) {
        alerts.push({
          level: 'info',
          source: 'health',
          message: `${stats.activeConflicts} active conflicts detected`,
          details: { activeConflicts: stats.activeConflicts },
        });
      }

      const completedAt = new Date();

      await this.recordJobRun('health_check', true, {
        totalSources: health.totalSources,
        activeSources: health.activeSources,
        staleSources: health.staleSources,
        emptySources: health.emptySources,
        metricsCompletion: stats.metricsCompletion,
        pendingReviews: stats.pendingReviews,
        activeConflicts: stats.activeConflicts,
      });

      return {
        jobName: 'health',
        success: true,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        summary: `Sources: ${health.activeSources} active, ${health.staleSources} stale. Metrics: ${stats.metricsCompletion}% complete.`,
        alerts,
      };
    } catch (error) {
      const completedAt = new Date();
      await this.recordJobRun('health_check', false, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        jobName: 'health',
        success: false,
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        summary: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        alerts: [{
          level: 'critical',
          source: 'health',
          message: 'Health check job failed',
          details: { error: error instanceof Error ? error.message : String(error) },
        }],
      };
    }
  }

  /**
   * Record job run in sync_status
   */
  private async recordJobRun(
    jobType: string,
    success: boolean,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      const sql = getConnection();
      await sql`
        INSERT INTO truth_ledger.sync_status (
          sync_type,
          status,
          started_at,
          completed_at,
          records_processed,
          error_message,
          metadata
        ) VALUES (
          ${jobType},
          ${success ? 'completed' : 'failed'},
          NOW(),
          NOW(),
          0,
          ${success ? null : details.error as string || 'Unknown error'},
          ${sql.json(details as unknown as postgres.JSONValue)}
        )
      `;
    } catch (error) {
      logger.error({ error }, 'Failed to record job run');
    }
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const scheduler = new Scheduler();

  if (args.includes('--daemon')) {
    await scheduler.runDaemon();
    // Keep process alive
    await new Promise(() => {});
  } else {
    const jobs = args.filter(a => !a.startsWith('--'));
    const results = await scheduler.runOnce(jobs.length > 0 ? jobs : undefined);

    // Print summary
    console.log('\n=== Scheduler Results ===');
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.jobName}: ${result.summary} (${result.duration}ms)`);

      if (result.alerts.length > 0) {
        console.log('   Alerts:');
        for (const alert of result.alerts) {
          const icon = alert.level === 'critical' ? '🚨' :
                       alert.level === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`   ${icon} ${alert.message}`);
        }
      }
    }

    const hasFailures = results.some(r => !r.success);
    const hasCritical = results.some(r => r.alerts.some(a => a.level === 'critical'));

    process.exit(hasFailures || hasCritical ? 1 : 0);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Scheduler error:', error);
    process.exit(1);
  });
}
