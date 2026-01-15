import postgres from 'postgres';
import { getConnection } from '../db/connection.js';
import type { SyncType, SyncStatus } from '../types/index.js';

export class SyncManager {
  /**
   * Starts a new sync job.
   */
  static async start(syncType: SyncType, metadata: Record<string, unknown> = {}): Promise<number> {
    const sql = getConnection();
    const result = await sql<SyncStatus[]>`
      INSERT INTO sync_status (
        sync_type,
        state,
        started_at,
        metadata
      ) VALUES (
        ${syncType},
        'running',
        NOW(),
        ${sql.json(metadata as postgres.JSONValue)}
      )
      RETURNING id
    `;
    return result[0].id;
  }

  /**
   * Updates the progress of a sync job.
   */
  static async progress(id: number, recordsSynced: number): Promise<void> {
    const sql = getConnection();
    await sql`
      UPDATE sync_status
      SET records_synced = ${recordsSynced},
          updated_at = NOW()
      WHERE id = ${id}
    `;
  }

  /**
   * Completes a sync job successfully.
   */
  static async complete(id: number, recordsSynced: number): Promise<void> {
    const sql = getConnection();
    await sql`
      UPDATE sync_status
      SET state = 'success',
          completed_at = NOW(),
          records_synced = ${recordsSynced}
      WHERE id = ${id}
    `;
  }

  /**
   * Fails a sync job with an error message.
   */
  static async fail(id: number, error: Error | string): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const sql = getConnection();
    await sql`
      UPDATE sync_status
      SET state = 'failed',
          completed_at = NOW(),
          error_message = ${errorMessage}
      WHERE id = ${id}
    `;
  }
}
