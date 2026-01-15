/**
 * Seed Test Entities for Vertical Slice
 * Creates rocket engines and launch vehicles for testing the pipeline
 */

import 'dotenv/config';
import { getConnection, closeConnection } from '../db/connection.js';

interface EntitySeed {
  entityType: string;
  canonicalName: string;
  aliases: string[];
}

const ENGINE_SEEDS: EntitySeed[] = [
  {
    entityType: 'engine',
    canonicalName: 'Merlin 1D',
    aliases: ['Merlin-1D', 'M1D', 'Merlin 1D+', 'Merlin 1D++'],
  },
  {
    entityType: 'engine',
    canonicalName: 'Raptor 2',
    aliases: ['Raptor', 'Raptor V2', 'Raptor 2.0'],
  },
  {
    entityType: 'engine',
    canonicalName: 'RS-25',
    aliases: ['RS25', 'SSME', 'Space Shuttle Main Engine'],
  },
  {
    entityType: 'engine',
    canonicalName: 'RD-180',
    aliases: ['RD180'],
  },
  {
    entityType: 'engine',
    canonicalName: 'BE-4',
    aliases: ['BE4', 'Blue Engine 4'],
  },
  {
    entityType: 'engine',
    canonicalName: 'Rutherford',
    aliases: ['Rutherford Engine'],
  },
  {
    entityType: 'engine',
    canonicalName: 'RL-10',
    aliases: ['RL10', 'RL-10A', 'RL-10B', 'RL-10C'],
  },
];

const LAUNCH_VEHICLE_SEEDS: EntitySeed[] = [
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Falcon 9',
    aliases: ['F9', 'Falcon 9 v1.2', 'Falcon 9 Block 5', 'Falcon 9 Full Thrust'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Falcon Heavy',
    aliases: ['FH', 'Falcon Heavy Block 5'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Starship',
    aliases: ['Starship Super Heavy', 'SpaceX Starship', 'BFR'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Atlas V',
    aliases: ['Atlas 5', 'Atlas V 551', 'Atlas V 401'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Vulcan Centaur',
    aliases: ['Vulcan', 'Vulcan VC2S', 'Vulcan VC4L'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Electron',
    aliases: ['Rocket Lab Electron'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'New Glenn',
    aliases: ['Blue Origin New Glenn'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'SLS',
    aliases: ['Space Launch System', 'SLS Block 1', 'SLS Block 2'],
  },
];

async function seedEntities() {
  const sql = getConnection();

  console.log('Seeding test entities...\n');

  const allSeeds = [...ENGINE_SEEDS, ...LAUNCH_VEHICLE_SEEDS];
  let created = 0;
  let skipped = 0;

  for (const seed of allSeeds) {
    try {
      // Check if entity already exists
      const existing = await sql`
        SELECT id FROM truth_ledger_claude.entities
        WHERE canonical_name = ${seed.canonicalName}
        LIMIT 1
      `;

      if (existing.length > 0) {
        console.log(`  ⏭️  Skipped: ${seed.canonicalName} (already exists)`);
        skipped++;
        continue;
      }

      // Insert new entity
      const result = await sql`
        INSERT INTO truth_ledger_claude.entities (
          entity_type,
          canonical_name,
          aliases
        ) VALUES (
          ${seed.entityType},
          ${seed.canonicalName},
          ${seed.aliases}
        )
        RETURNING id
      `;

      if (result.length > 0) {
        console.log(`  ✅ Created: ${seed.canonicalName} (${seed.entityType})`);
        created++;
      }
    } catch (error) {
      console.error(`  ❌ Error creating ${seed.canonicalName}:`, error);
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);

  // Show current counts
  const counts = await sql`
    SELECT entity_type, COUNT(*)::int as count
    FROM truth_ledger_claude.entities
    GROUP BY entity_type
    ORDER BY entity_type
  `;

  console.log('\n📋 Entity counts:');
  for (const row of counts) {
    console.log(`  ${row.entity_type}: ${row.count}`);
  }

  await closeConnection();
}

seedEntities().catch(console.error);
