/**
 * Seed All Entities
 * Populates the database with rocket engines, launch vehicles, and launch sites
 *
 * Usage: npx tsx src/scripts/seed-all-entities.ts [--force]
 *
 * Options:
 *   --force    Clear existing entities before seeding (use with caution!)
 */

import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';
import { ALL_ENTITY_SEEDS, SEED_STATS, type EntitySeed } from '../config/entity-seeds.js';

const ENTITY_TYPES = ['engine', 'launch_vehicle', 'launch_site', 'space_mission'];

async function seedEntities(force = false) {
  const sql = getConnection();

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           Truth Ledger Entity Seeder                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`📊 Seed data contains:`);
  console.log(`   • ${SEED_STATS.engines} engines`);
  console.log(`   • ${SEED_STATS.launchVehicles} launch vehicles`);
  console.log(`   • ${SEED_STATS.launchSites} launch sites`);
  console.log(`   • ${SEED_STATS.missions} missions`);
  console.log(`   • ${SEED_STATS.total} total entities`);
  console.log();

  if (force) {
    console.log('⚠️  Force mode enabled - clearing existing entities...');
    await sql`DELETE FROM truth_ledger_claude.entities WHERE entity_type = ANY(${ENTITY_TYPES})`;
    console.log('   ✓ Cleared existing engines, launch vehicles, launch sites, and missions');
    console.log();
  }

  // Get existing entities to avoid duplicates
  const existing = await sql`
    SELECT LOWER(canonical_name) as name, entity_type
    FROM truth_ledger_claude.entities
    WHERE entity_type = ANY(${ENTITY_TYPES})
  `;
  const existingSet = new Set(existing.map(e => `${e.entity_type}:${e.name}`));

  console.log(`📋 Found ${existingSet.size} existing entities in database`);
  console.log();

  let added = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches for better performance
  const batchSize = 50;
  const batches = Math.ceil(ALL_ENTITY_SEEDS.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const batch = ALL_ENTITY_SEEDS.slice(i * batchSize, (i + 1) * batchSize);
    const toInsert: EntitySeed[] = [];

    for (const seed of batch) {
      const key = `${seed.entityType}:${seed.canonicalName.toLowerCase()}`;
      if (existingSet.has(key)) {
        skipped++;
        continue;
      }
      toInsert.push(seed);
      existingSet.add(key); // Prevent duplicates within batch
    }

    if (toInsert.length > 0) {
      try {
        // Insert batch
        for (const seed of toInsert) {
          await sql`
            INSERT INTO truth_ledger_claude.entities (
              entity_type,
              canonical_name,
              aliases
            ) VALUES (
              ${seed.entityType},
              ${seed.canonicalName},
              ${seed.aliases}
            )
          `;
          added++;
        }
      } catch (error) {
        console.error(`   ❌ Error in batch ${i + 1}:`, error);
        errors += toInsert.length;
      }
    }

    // Progress indicator
    const progress = Math.round(((i + 1) / batches) * 100);
    process.stdout.write(`\r   Processing: ${progress}% (batch ${i + 1}/${batches})`);
  }

  console.log('\n');

  // Final counts
  const counts = await sql`
    SELECT entity_type, COUNT(*)::int as count
    FROM truth_ledger_claude.entities
    WHERE entity_type = ANY(${ENTITY_TYPES})
    GROUP BY entity_type
    ORDER BY entity_type
  `;

  const labelMap: Record<string, string> = {
    engine: 'Engines',
    launch_site: 'Launch Sites',
    launch_vehicle: 'Launch Vehicles',
    space_mission: 'Missions',
  };

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Summary                               ║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log(`║  ✅ Added:   ${String(added).padStart(4)}                                        ║`);
  console.log(`║  ⏭️  Skipped: ${String(skipped).padStart(4)} (already exist)                      ║`);
  if (errors > 0) {
    console.log(`║  ❌ Errors:  ${String(errors).padStart(4)}                                        ║`);
  }
  console.log('╠════════════════════════════════════════════════════════════╣');
  console.log('║  Database totals:                                          ║');
  for (const row of counts) {
    const label = labelMap[row.entity_type] || row.entity_type;
    console.log(`║    ${label.padEnd(16)} ${String(row.count).padStart(4)}                             ║`);
  }
  const total = counts.reduce((sum, row) => sum + row.count, 0);
  console.log(`║    ${'Total'.padEnd(16)} ${String(total).padStart(4)}                             ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');

  await closeConnection();
}

// Parse command line args
const force = process.argv.includes('--force');

seedEntities(force).catch(console.error);
