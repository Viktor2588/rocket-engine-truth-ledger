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
  // SpaceX
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
    aliases: ['Starship Super Heavy', 'SpaceX Starship', 'BFR', 'Starship Block 3'],
  },
  // ULA
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Atlas V',
    aliases: ['Atlas 5', 'Atlas V 551', 'Atlas V 401'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Vulcan Centaur',
    aliases: ['Vulcan', 'Vulcan VC2', 'Vulcan VC4', 'Vulcan VC6'],
  },
  // Rocket Lab
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Electron',
    aliases: ['Rocket Lab Electron'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Neutron',
    aliases: ['Rocket Lab Neutron'],
  },
  // Blue Origin
  {
    entityType: 'launch_vehicle',
    canonicalName: 'New Glenn',
    aliases: ['Blue Origin New Glenn', 'New Glenn 7x2', 'New Glenn 9x4'],
  },
  // NASA
  {
    entityType: 'launch_vehicle',
    canonicalName: 'SLS',
    aliases: ['Space Launch System', 'SLS Block 1', 'SLS Block 1B', 'SLS Block 2'],
  },
  // Relativity Space
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Terran R',
    aliases: ['Terran', 'Relativity Terran R'],
  },
  // Firefly Aerospace
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Firefly Alpha',
    aliases: ['Alpha', 'Firefly Alpha'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Firefly MLV',
    aliases: ['MLV', 'Medium Launch Vehicle'],
  },
  // Northrop Grumman
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Antares',
    aliases: ['Antares 230+', 'Antares 330'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Minotaur',
    aliases: ['Minotaur I', 'Minotaur IV', 'Minotaur V'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Pegasus XL',
    aliases: ['Pegasus'],
  },
  // Stoke Space
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Nova',
    aliases: ['Stoke Nova', 'Stoke Space Nova'],
  },
  // Russia
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Soyuz-2',
    aliases: ['Soyuz 2', 'Soyuz-2.1a', 'Soyuz-2.1b', 'Soyuz-2.1v'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Angara',
    aliases: ['Angara A5', 'Angara A5M', 'Angara A5V', 'Angara 1.2'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Proton-M',
    aliases: ['Proton', 'Proton M'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Soyuz-5',
    aliases: ['Irtysh'],
  },
  // China Government
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Long March 5',
    aliases: ['CZ-5', 'Long March 5B', 'Chang Zheng 5'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Long March 9',
    aliases: ['CZ-9', 'Chang Zheng 9'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Long March 10',
    aliases: ['CZ-10', 'Chang Zheng 10', 'Long March 10A'],
  },
  // China Private
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Zhuque-2',
    aliases: ['ZQ-2', 'Zhuque 2', 'Landspace 2'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Zhuque-3',
    aliases: ['ZQ-3', 'Zhuque 3'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Tianlong-3',
    aliases: ['TL-3', 'Tianlong 3', 'Space Pioneer Tianlong'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Gravity-1',
    aliases: ['Yinli-1', 'OrienSpace Gravity'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Ceres-1',
    aliases: ['Galactic Energy Ceres', 'Ceres-2'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Hyperbola',
    aliases: ['Hyperbola-1', 'Hyperbola-2', 'Hyperbola-3', 'iSpace'],
  },
  // Europe - Established
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Ariane 6',
    aliases: ['Ariane 62', 'Ariane 64', 'A6', 'A62', 'A64'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Vega',
    aliases: ['Vega C', 'Vega-C', 'Vega-E'],
  },
  // Europe - New Space
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Spectrum',
    aliases: ['Isar Aerospace Spectrum'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'RFA One',
    aliases: ['RFA-1', 'Rocket Factory Augsburg'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Prime',
    aliases: ['Orbex Prime'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Miura 5',
    aliases: ['Miura-5', 'PLD Space Miura'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Skyrora XL',
    aliases: ['Skyrora'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Maia',
    aliases: ['Maia Space', 'ArianeGroup Maia'],
  },
  // Japan
  {
    entityType: 'launch_vehicle',
    canonicalName: 'H3',
    aliases: ['H3-22', 'H3-24', 'H3-30'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Epsilon',
    aliases: ['Epsilon S', 'IHI Epsilon'],
  },
  // India
  {
    entityType: 'launch_vehicle',
    canonicalName: 'LVM3',
    aliases: ['GSLV Mk III', 'GSLV Mark 3'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'PSLV',
    aliases: ['PSLV-XL', 'PSLV-CA'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'SSLV',
    aliases: ['Small Satellite Launch Vehicle'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'NGLV',
    aliases: ['Soorya', 'Next Generation Launch Vehicle'],
  },
  // Korea
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Nuri',
    aliases: ['KSLV-II', 'KSLV-2'],
  },
  {
    entityType: 'launch_vehicle',
    canonicalName: 'KSLV-III',
    aliases: ['KSLV-3'],
  },
  // Australia
  {
    entityType: 'launch_vehicle',
    canonicalName: 'Eris',
    aliases: ['Gilmour Eris', 'Gilmour Space Eris'],
  },
];

const SPACE_MISSION_SEEDS: EntitySeed[] = [
  // Artemis Program
  {
    entityType: 'space_mission',
    canonicalName: 'Artemis II',
    aliases: ['Artemis 2'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Artemis III',
    aliases: ['Artemis 3'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Artemis IV',
    aliases: ['Artemis 4'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Artemis V',
    aliases: ['Artemis 5'],
  },
  // Deep Space
  {
    entityType: 'space_mission',
    canonicalName: 'JUICE',
    aliases: ['Jupiter Icy Moons Explorer'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Europa Clipper',
    aliases: ['Europa Mission'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Dragonfly',
    aliases: ['Titan Dragonfly'],
  },
  // Lunar
  {
    entityType: 'space_mission',
    canonicalName: 'Lunar Gateway',
    aliases: ['Gateway', 'Deep Space Gateway'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Griffin Mission One',
    aliases: ['Griffin', 'VIPER Mission'],
  },
  // China Lunar
  {
    entityType: 'space_mission',
    canonicalName: 'Chang\'e 7',
    aliases: ['CE-7'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Chang\'e 8',
    aliases: ['CE-8'],
  },
  // Russia Lunar
  {
    entityType: 'space_mission',
    canonicalName: 'Luna 26',
    aliases: ['Luna-26'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Luna 27',
    aliases: ['Luna-27'],
  },
  // India
  {
    entityType: 'space_mission',
    canonicalName: 'Gaganyaan',
    aliases: ['ISRO Crewed Mission'],
  },
  {
    entityType: 'space_mission',
    canonicalName: 'Chandrayaan-4',
    aliases: ['Chandrayaan 4'],
  },
  // Japan
  {
    entityType: 'space_mission',
    canonicalName: 'MMX',
    aliases: ['Martian Moons eXploration', 'Phobos Sample Return'],
  },
];

const LAUNCH_SITE_SEEDS: EntitySeed[] = [
  // USA
  {
    entityType: 'launch_site',
    canonicalName: 'Kennedy Space Center',
    aliases: ['KSC', 'LC-39A', 'LC-39B'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Cape Canaveral',
    aliases: ['CCSFS', 'Cape Canaveral SFS', 'SLC-40', 'SLC-41'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Vandenberg',
    aliases: ['Vandenberg SFB', 'VSFB', 'SLC-4'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Starbase',
    aliases: ['SpaceX Starbase', 'Boca Chica'],
  },
  // Russia
  {
    entityType: 'launch_site',
    canonicalName: 'Baikonur',
    aliases: ['Baikonur Cosmodrome'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Vostochny',
    aliases: ['Vostochny Cosmodrome'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Plesetsk',
    aliases: ['Plesetsk Cosmodrome'],
  },
  // China
  {
    entityType: 'launch_site',
    canonicalName: 'Wenchang',
    aliases: ['Wenchang Space Launch Site'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Jiuquan',
    aliases: ['Jiuquan Satellite Launch Center'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Xichang',
    aliases: ['Xichang Satellite Launch Center'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Taiyuan',
    aliases: ['Taiyuan Satellite Launch Center'],
  },
  // Europe
  {
    entityType: 'launch_site',
    canonicalName: 'Guiana Space Centre',
    aliases: ['Kourou', 'CSG', 'ELA-3', 'ELA-4'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'SaxaVord',
    aliases: ['SaxaVord Spaceport', 'Unst'],
  },
  {
    entityType: 'launch_site',
    canonicalName: 'Esrange',
    aliases: ['Esrange Space Center', 'Kiruna'],
  },
  // Japan
  {
    entityType: 'launch_site',
    canonicalName: 'Tanegashima',
    aliases: ['Tanegashima Space Center', 'TNSC'],
  },
  // India
  {
    entityType: 'launch_site',
    canonicalName: 'Satish Dhawan',
    aliases: ['SDSC', 'Sriharikota', 'SHAR'],
  },
  // Korea
  {
    entityType: 'launch_site',
    canonicalName: 'Naro Space Center',
    aliases: ['Naro', 'Goheung'],
  },
  // New Zealand
  {
    entityType: 'launch_site',
    canonicalName: 'Rocket Lab LC-1',
    aliases: ['Mahia Peninsula', 'LC-1'],
  },
];

async function seedEntities() {
  const sql = getConnection();

  console.log('Seeding test entities...\n');

  const allSeeds = [
    ...ENGINE_SEEDS,
    ...LAUNCH_VEHICLE_SEEDS,
    ...SPACE_MISSION_SEEDS,
    ...LAUNCH_SITE_SEEDS,
  ];
  let created = 0;
  let skipped = 0;

  for (const seed of allSeeds) {
    try {
      // Check if entity already exists
      const existing = await sql`
        SELECT id FROM truth_ledger.entities
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
        INSERT INTO truth_ledger.entities (
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
    FROM truth_ledger.entities
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
