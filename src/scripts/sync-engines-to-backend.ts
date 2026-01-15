/**
 * Sync truth_ledger engine entities to public.engines table
 * Extracts best claim values and upserts into backend format
 */

import 'dotenv/config';
import postgres from 'postgres';
import { getDatabaseUrl } from '../config/database.js';

const sql = postgres(getDatabaseUrl());

interface EngineData {
  entity_id: string;
  canonical_name: string;
  thrust_n: number | null;
  isp_s: number | null;
  mass_kg: number | null;
  chamber_pressure_bar: number | null;
}

interface PublicEngine {
  id: number;
  name: string;
  propellant: string;
  power_cycle: string | null;
  thrust_n: number | null;
  isp_s: number | null;
  mass_kg: number | null;
  chamber_pressure_bar: number | null;
}

async function extractEngineData(): Promise<EngineData[]> {
  console.log('Extracting engine data from truth_ledger...');

  const result = await sql`
    WITH ranked_claims AS (
      SELECT
        e.id as entity_id,
        e.canonical_name,
        a.canonical_name as attr_name,
        c.value_json,
        (SELECT COUNT(*) FROM truth_ledger.evidence ev WHERE ev.claim_id = c.id) as evidence_count,
        ROW_NUMBER() OVER (
          PARTITION BY e.id, a.canonical_name
          ORDER BY (SELECT COUNT(*) FROM truth_ledger.evidence ev WHERE ev.claim_id = c.id) DESC, c.created_at DESC
        ) as rn
      FROM truth_ledger.entities e
      JOIN truth_ledger.claims c ON c.entity_id = e.id
      JOIN truth_ledger.attributes a ON c.attribute_id = a.id
      WHERE e.entity_type = 'engine'
    ),
    best_claims AS (
      SELECT entity_id, canonical_name, attr_name, value_json
      FROM ranked_claims
      WHERE rn = 1
    )
    SELECT
      b.entity_id,
      b.canonical_name,
      (SELECT bc.value_json->>'value' FROM best_claims bc WHERE bc.entity_id = b.entity_id AND bc.attr_name = 'engines.thrust_n')::numeric as thrust_n,
      (SELECT bc.value_json->>'value' FROM best_claims bc WHERE bc.entity_id = b.entity_id AND bc.attr_name = 'engines.isp_s')::numeric as isp_s,
      (SELECT bc.value_json->>'value' FROM best_claims bc WHERE bc.entity_id = b.entity_id AND bc.attr_name = 'engines.mass_kg')::numeric as mass_kg,
      (SELECT bc.value_json->>'value' FROM best_claims bc WHERE bc.entity_id = b.entity_id AND bc.attr_name = 'engines.chamber_pressure_bar')::numeric as chamber_pressure_bar
    FROM (SELECT DISTINCT entity_id, canonical_name FROM best_claims) b
    ORDER BY b.canonical_name
  `;

  console.log(`Found ${result.length} engines with claims`);
  return result as unknown as EngineData[];
}

async function getExistingEngines(): Promise<Map<string, PublicEngine>> {
  console.log('Loading existing public.engines...');

  const result = await sql`
    SELECT id, name, propellant, power_cycle, thrust_n, isp_s, mass_kg, chamber_pressure_bar
    FROM public.engines
  `;

  const engines = new Map<string, PublicEngine>();
  for (const row of result) {
    // Normalize name for matching (lowercase, trim)
    const normalizedName = (row.name as string).toLowerCase().replace(/[-\s]+/g, '');
    engines.set(normalizedName, row as unknown as PublicEngine);
  }

  console.log(`Found ${engines.size} existing engines`);
  return engines;
}

function normalizeEngineName(name: string): string {
  return name.toLowerCase().replace(/[-\s]+/g, '');
}

function matchEngine(truthLedgerName: string, existingEngines: Map<string, PublicEngine>): PublicEngine | null {
  const normalized = normalizeEngineName(truthLedgerName);

  // Direct match
  if (existingEngines.has(normalized)) {
    return existingEngines.get(normalized)!;
  }

  // Try partial matches for common variants
  for (const [key, engine] of existingEngines) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return engine;
    }
  }

  return null;
}

async function syncEngines() {
  console.log('=== Syncing Truth Ledger Engines to Backend ===\n');

  try {
    const truthLedgerEngines = await extractEngineData();
    const existingEngines = await getExistingEngines();

    let updated = 0;
    let inserted = 0;
    let skipped = 0;

    for (const engine of truthLedgerEngines) {
      const existing = matchEngine(engine.canonical_name, existingEngines);

      // Skip if no meaningful data
      if (!engine.thrust_n && !engine.isp_s && !engine.mass_kg && !engine.chamber_pressure_bar) {
        console.log(`  Skipping ${engine.canonical_name}: no claim data`);
        skipped++;
        continue;
      }

      // Filter out obviously wrong values (e.g., mass_kg > 100000 kg is likely wrong)
      const validMassKg = engine.mass_kg && engine.mass_kg < 100000 ? engine.mass_kg : null;
      const validThrustN = engine.thrust_n && engine.thrust_n > 1000 && engine.thrust_n < 100000000 ? engine.thrust_n : null;

      if (existing) {
        // Update existing engine with truth ledger data
        await sql`
          UPDATE public.engines
          SET
            thrust_n = COALESCE(${validThrustN ? Math.round(validThrustN) : null}, thrust_n),
            isp_s = COALESCE(${engine.isp_s}, isp_s),
            mass_kg = COALESCE(${validMassKg}, mass_kg),
            chamber_pressure_bar = COALESCE(${engine.chamber_pressure_bar}, chamber_pressure_bar),
            updated_at = NOW()
          WHERE id = ${existing.id}
        `;
        console.log(`  Updated: ${engine.canonical_name} (id=${existing.id})`);
        updated++;
      } else {
        // Insert new engine
        await sql`
          INSERT INTO public.engines (
            name, propellant, power_cycle, thrust_n, isp_s, mass_kg, chamber_pressure_bar
          ) VALUES (
            ${engine.canonical_name},
            'Unknown',
            NULL,
            ${validThrustN ? Math.round(validThrustN) : null},
            ${engine.isp_s},
            ${validMassKg},
            ${engine.chamber_pressure_bar}
          )
        `;
        console.log(`  Inserted: ${engine.canonical_name}`);
        inserted++;
      }
    }

    console.log(`\n=== Sync Complete ===`);
    console.log(`Updated: ${updated}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Skipped: ${skipped}`);

    // Show final count
    const finalCount = await sql`SELECT COUNT(*) as count FROM public.engines`;
    console.log(`\nTotal engines in public.engines: ${finalCount[0].count}`);

  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

syncEngines().catch(console.error);
