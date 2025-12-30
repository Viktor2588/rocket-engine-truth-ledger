/**
 * Integrity Checker Service
 * Daily validation checks for the Truth Ledger
 *
 * Responsibilities:
 * - Verify claims have evidence (no orphaned claims)
 * - Verify evidence has full provenance chain
 * - Verify claims have metrics coverage
 * - Check for data consistency issues
 * - Report violations for remediation
 */

import { getConnection } from '../db/connection.js';

// ============================================================================
// TYPES
// ============================================================================

export interface IntegrityViolation {
  checkName: string;
  severity: 'critical' | 'warning' | 'info';
  affectedTable: string;
  affectedIds: string[];
  description: string;
  remediation: string;
}

export interface IntegrityReport {
  timestamp: Date;
  checksRun: number;
  checksPassed: number;
  checksFailed: number;
  violations: IntegrityViolation[];
  summary: Record<string, {
    passed: boolean;
    count: number;
    message: string;
  }>;
}

// ============================================================================
// INTEGRITY CHECKER SERVICE
// ============================================================================

export class IntegrityChecker {
  /**
   * Run all integrity checks
   */
  async runAllChecks(): Promise<IntegrityReport> {
    const report: IntegrityReport = {
      timestamp: new Date(),
      checksRun: 0,
      checksPassed: 0,
      checksFailed: 0,
      violations: [],
      summary: {},
    };

    // Define all checks
    const checks = [
      this.checkClaimsWithoutEvidence,
      this.checkClaimsWithoutMetrics,
      this.checkEvidenceWithoutProvenance,
      this.checkOrphanedSnippets,
      this.checkOrphanedDocuments,
      this.checkConflictGroupCounts,
      this.checkFieldLinkValidity,
      this.checkDerivedClaimIntegrity,
      this.checkScopeConsistency,
      this.checkDuplicateClaims,
    ];

    for (const check of checks) {
      report.checksRun++;

      try {
        const result = await check.call(this);

        if (result.violations.length === 0) {
          report.checksPassed++;
          report.summary[result.checkName] = {
            passed: true,
            count: 0,
            message: result.message || 'Passed',
          };
        } else {
          report.checksFailed++;
          report.violations.push(...result.violations);
          report.summary[result.checkName] = {
            passed: false,
            count: result.violations.length,
            message: result.message || `Found ${result.violations.length} violations`,
          };
        }
      } catch (error) {
        report.checksFailed++;
        report.summary['error'] = {
          passed: false,
          count: 1,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return report;
  }

  /**
   * Check 1: Claims without evidence
   * Every claim must have at least one evidence row
   */
  private async checkClaimsWithoutEvidence(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const orphanedClaims = await sql<{ id: string }[]>`
      SELECT c.id
      FROM truth_ledger_claude.claims c
      LEFT JOIN truth_ledger_claude.evidence e ON e.claim_id = c.id
      WHERE e.id IS NULL
    `;

    if (orphanedClaims.length === 0) {
      return {
        checkName: 'claims_without_evidence',
        violations: [],
        message: 'All claims have evidence',
      };
    }

    return {
      checkName: 'claims_without_evidence',
      violations: [{
        checkName: 'claims_without_evidence',
        severity: 'critical',
        affectedTable: 'claims',
        affectedIds: orphanedClaims.map(c => c.id),
        description: `Found ${orphanedClaims.length} claims without any evidence`,
        remediation: 'Delete orphaned claims or add evidence',
      }],
    };
  }

  /**
   * Check 2: Claims without metrics
   * Every claim should have computed metrics
   */
  private async checkClaimsWithoutMetrics(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const unscoredClaims = await sql<{ id: string }[]>`
      SELECT c.id
      FROM truth_ledger_claude.claims c
      LEFT JOIN truth_ledger_claude.truth_metrics tm ON tm.claim_id = c.id
      WHERE tm.claim_id IS NULL
    `;

    if (unscoredClaims.length === 0) {
      return {
        checkName: 'claims_without_metrics',
        violations: [],
        message: 'All claims have metrics',
      };
    }

    return {
      checkName: 'claims_without_metrics',
      violations: [{
        checkName: 'claims_without_metrics',
        severity: 'warning',
        affectedTable: 'claims',
        affectedIds: unscoredClaims.map(c => c.id),
        description: `Found ${unscoredClaims.length} claims without computed metrics`,
        remediation: 'Run the Scorer to compute missing metrics',
      }],
    };
  }

  /**
   * Check 3: Evidence without full provenance chain
   * Evidence → Snippet → Document → Source must be valid
   */
  private async checkEvidenceWithoutProvenance(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const brokenEvidence = await sql<{ id: string }[]>`
      SELECT e.id
      FROM truth_ledger_claude.evidence e
      LEFT JOIN truth_ledger_claude.snippets s ON s.id = e.snippet_id
      LEFT JOIN truth_ledger_claude.documents d ON d.id = s.document_id
      LEFT JOIN truth_ledger_claude.sources src ON src.id = d.source_id
      WHERE s.id IS NULL OR d.id IS NULL OR src.id IS NULL
    `;

    if (brokenEvidence.length === 0) {
      return {
        checkName: 'evidence_without_provenance',
        violations: [],
        message: 'All evidence has complete provenance',
      };
    }

    return {
      checkName: 'evidence_without_provenance',
      violations: [{
        checkName: 'evidence_without_provenance',
        severity: 'critical',
        affectedTable: 'evidence',
        affectedIds: brokenEvidence.map(e => e.id),
        description: `Found ${brokenEvidence.length} evidence rows with broken provenance chain`,
        remediation: 'Investigate and fix broken references or delete orphaned evidence',
      }],
    };
  }

  /**
   * Check 4: Orphaned snippets
   * Snippets without any evidence referencing them
   */
  private async checkOrphanedSnippets(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const orphanedSnippets = await sql<{ id: string }[]>`
      SELECT s.id
      FROM truth_ledger_claude.snippets s
      LEFT JOIN truth_ledger_claude.evidence e ON e.snippet_id = s.id
      WHERE e.id IS NULL
      AND s.created_at < NOW() - INTERVAL '7 days'
    `;

    if (orphanedSnippets.length === 0) {
      return {
        checkName: 'orphaned_snippets',
        violations: [],
        message: 'No orphaned snippets older than 7 days',
      };
    }

    return {
      checkName: 'orphaned_snippets',
      violations: [{
        checkName: 'orphaned_snippets',
        severity: 'info',
        affectedTable: 'snippets',
        affectedIds: orphanedSnippets.slice(0, 100).map(s => s.id),  // Limit to first 100
        description: `Found ${orphanedSnippets.length} snippets not referenced by any evidence (older than 7 days)`,
        remediation: 'These may be pending extraction or can be cleaned up',
      }],
    };
  }

  /**
   * Check 5: Orphaned documents
   * Documents without any snippets
   */
  private async checkOrphanedDocuments(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const orphanedDocs = await sql<{ id: string }[]>`
      SELECT d.id
      FROM truth_ledger_claude.documents d
      LEFT JOIN truth_ledger_claude.snippets s ON s.document_id = d.id
      WHERE s.id IS NULL
      AND d.created_at < NOW() - INTERVAL '7 days'
    `;

    if (orphanedDocs.length === 0) {
      return {
        checkName: 'orphaned_documents',
        violations: [],
        message: 'No orphaned documents older than 7 days',
      };
    }

    return {
      checkName: 'orphaned_documents',
      violations: [{
        checkName: 'orphaned_documents',
        severity: 'info',
        affectedTable: 'documents',
        affectedIds: orphanedDocs.slice(0, 100).map(d => d.id),
        description: `Found ${orphanedDocs.length} documents without snippets (older than 7 days)`,
        remediation: 'Re-run snippetization or clean up failed ingests',
      }],
    };
  }

  /**
   * Check 6: Conflict group claim counts
   * Verify claim_count matches actual claim count
   */
  private async checkConflictGroupCounts(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const mismatchedGroups = await sql<{ id: string; stored_count: number; actual_count: number }[]>`
      SELECT cg.id, cg.claim_count as stored_count, COUNT(c.id)::int as actual_count
      FROM truth_ledger_claude.conflict_groups cg
      LEFT JOIN truth_ledger_claude.claims c ON c.claim_key_hash = cg.claim_key_hash
      GROUP BY cg.id, cg.claim_count
      HAVING cg.claim_count != COUNT(c.id)
    `;

    if (mismatchedGroups.length === 0) {
      return {
        checkName: 'conflict_group_counts',
        violations: [],
        message: 'All conflict group counts are accurate',
      };
    }

    return {
      checkName: 'conflict_group_counts',
      violations: [{
        checkName: 'conflict_group_counts',
        severity: 'warning',
        affectedTable: 'conflict_groups',
        affectedIds: mismatchedGroups.map(g => g.id),
        description: `Found ${mismatchedGroups.length} conflict groups with incorrect claim counts`,
        remediation: 'Run the conflict group count fix query',
      }],
    };
  }

  /**
   * Check 7: Field link validity
   * Verify field links point to valid conflict groups
   */
  private async checkFieldLinkValidity(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const invalidLinks = await sql<{ id: string }[]>`
      SELECT fl.id
      FROM truth_ledger_claude.field_links fl
      LEFT JOIN truth_ledger_claude.conflict_groups cg ON cg.claim_key_hash = fl.claim_key_hash
      WHERE fl.claim_key_hash IS NOT NULL AND cg.id IS NULL
    `;

    if (invalidLinks.length === 0) {
      return {
        checkName: 'field_link_validity',
        violations: [],
        message: 'All field links are valid',
      };
    }

    return {
      checkName: 'field_link_validity',
      violations: [{
        checkName: 'field_link_validity',
        severity: 'warning',
        affectedTable: 'field_links',
        affectedIds: invalidLinks.map(l => l.id),
        description: `Found ${invalidLinks.length} field links pointing to non-existent conflict groups`,
        remediation: 'Delete invalid field links or re-derive them',
      }],
    };
  }

  /**
   * Check 8: Derived claim integrity
   * Verify derived claims point to valid source claims
   */
  private async checkDerivedClaimIntegrity(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const brokenDerived = await sql<{ id: string }[]>`
      SELECT c.id
      FROM truth_ledger_claude.claims c
      WHERE c.is_derived = true
        AND c.derived_from_claim_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM truth_ledger_claude.claims src
          WHERE src.id = c.derived_from_claim_id
        )
    `;

    if (brokenDerived.length === 0) {
      return {
        checkName: 'derived_claim_integrity',
        violations: [],
        message: 'All derived claims have valid sources',
      };
    }

    return {
      checkName: 'derived_claim_integrity',
      violations: [{
        checkName: 'derived_claim_integrity',
        severity: 'warning',
        affectedTable: 'claims',
        affectedIds: brokenDerived.map(c => c.id),
        description: `Found ${brokenDerived.length} derived claims with missing source claims`,
        remediation: 'Clear derived_from_claim_id or delete derived claims',
      }],
    };
  }

  /**
   * Check 9: Scope consistency
   * Verify scope_json is consistent across related records
   */
  private async checkScopeConsistency(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const inconsistentScopes = await sql<{ claim_key_hash: string }[]>`
      SELECT c.claim_key_hash
      FROM truth_ledger_claude.claims c
      JOIN truth_ledger_claude.conflict_groups cg ON cg.claim_key_hash = c.claim_key_hash
      WHERE c.scope_json != cg.scope_json
    `;

    if (inconsistentScopes.length === 0) {
      return {
        checkName: 'scope_consistency',
        violations: [],
        message: 'All scopes are consistent',
      };
    }

    return {
      checkName: 'scope_consistency',
      violations: [{
        checkName: 'scope_consistency',
        severity: 'warning',
        affectedTable: 'claims',
        affectedIds: inconsistentScopes.map(s => s.claim_key_hash),
        description: `Found ${inconsistentScopes.length} claim/conflict_group pairs with inconsistent scopes`,
        remediation: 'Verify and sync scope_json values',
      }],
    };
  }

  /**
   * Check 10: Duplicate claims
   * Find claims with identical values in the same conflict group
   */
  private async checkDuplicateClaims(): Promise<{
    checkName: string;
    violations: IntegrityViolation[];
    message?: string;
  }> {
    const sql = getConnection();

    const duplicates = await sql<{ claim_key_hash: string; value_json: unknown; count: number }[]>`
      SELECT claim_key_hash, value_json, COUNT(*) as count
      FROM truth_ledger_claude.claims
      GROUP BY claim_key_hash, value_json
      HAVING COUNT(*) > 1
    `;

    if (duplicates.length === 0) {
      return {
        checkName: 'duplicate_claims',
        violations: [],
        message: 'No duplicate claims found',
      };
    }

    return {
      checkName: 'duplicate_claims',
      violations: [{
        checkName: 'duplicate_claims',
        severity: 'info',
        affectedTable: 'claims',
        affectedIds: duplicates.map(d => d.claim_key_hash),
        description: `Found ${duplicates.length} sets of duplicate claims (same bucket + value)`,
        remediation: 'Consider merging duplicate claims and consolidating evidence',
      }],
    };
  }

  /**
   * Fix: Update conflict group claim counts
   */
  async fixConflictGroupCounts(): Promise<number> {
    const sql = getConnection();

    const result = await sql`
      UPDATE truth_ledger_claude.conflict_groups cg
      SET claim_count = (
        SELECT COUNT(*) FROM truth_ledger_claude.claims c
        WHERE c.claim_key_hash = cg.claim_key_hash
      )
      WHERE claim_count != (
        SELECT COUNT(*) FROM truth_ledger_claude.claims c
        WHERE c.claim_key_hash = cg.claim_key_hash
      )
    `;

    return result.count;
  }

  /**
   * Fix: Delete orphaned claims
   */
  async deleteOrphanedClaims(): Promise<number> {
    const sql = getConnection();

    const result = await sql`
      DELETE FROM truth_ledger_claude.claims c
      WHERE NOT EXISTS (
        SELECT 1 FROM truth_ledger_claude.evidence e
        WHERE e.claim_id = c.id
      )
    `;

    return result.count;
  }

  /**
   * Fix: Clear invalid field links
   */
  async clearInvalidFieldLinks(): Promise<number> {
    const sql = getConnection();

    const result = await sql`
      UPDATE truth_ledger_claude.field_links
      SET claim_key_hash = NULL
      WHERE claim_key_hash IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM truth_ledger_claude.conflict_groups cg
          WHERE cg.claim_key_hash = field_links.claim_key_hash
        )
    `;

    return result.count;
  }
}
