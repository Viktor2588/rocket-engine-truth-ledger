/**
 * Add more entities (engines and launch vehicles) to the database
 */
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

// Valid entity types matching database CHECK constraint
type EntityType = 'engine' | 'launch_vehicle' | 'country' | 'satellite' | 'launch_site' |
  'space_mission' | 'standard_clause' | 'organization' | 'other';

interface NewEntity {
  canonicalName: string;
  entityType: EntityType;
  aliases: string[];
}

const NEW_ENGINES: NewEntity[] = [
  // SpaceX engines
  { canonicalName: 'Raptor 1', entityType: 'engine', aliases: ['Raptor V1', 'Raptor 1.0'] },
  { canonicalName: 'Raptor 3', entityType: 'engine', aliases: ['Raptor V3', 'Raptor 3.0'] },
  { canonicalName: 'Merlin 1C', entityType: 'engine', aliases: ['Merlin-1C', 'M1C'] },
  { canonicalName: 'Draco', entityType: 'engine', aliases: ['SpaceX Draco'] },
  { canonicalName: 'SuperDraco', entityType: 'engine', aliases: ['Super Draco', 'SpaceX SuperDraco'] },

  // Blue Origin engines
  { canonicalName: 'BE-3', entityType: 'engine', aliases: ['BE3', 'Blue Engine 3'] },
  { canonicalName: 'BE-7', entityType: 'engine', aliases: ['BE7', 'Blue Engine 7'] },

  // Aerojet Rocketdyne engines
  { canonicalName: 'RL-10A', entityType: 'engine', aliases: ['RL10A', 'RL-10A-4-2'] },
  { canonicalName: 'RL-10C', entityType: 'engine', aliases: ['RL10C', 'RL-10C-1'] },
  { canonicalName: 'AJ-60A', entityType: 'engine', aliases: ['AJ60A'] },
  { canonicalName: 'AR-22', entityType: 'engine', aliases: ['AR22'] },

  // Russian engines
  { canonicalName: 'RD-191', entityType: 'engine', aliases: ['RD191'] },
  { canonicalName: 'RD-181', entityType: 'engine', aliases: ['RD181'] },
  { canonicalName: 'RD-170', entityType: 'engine', aliases: ['RD170'] },
  { canonicalName: 'RD-171', entityType: 'engine', aliases: ['RD171'] },
  { canonicalName: 'NK-33', entityType: 'engine', aliases: ['NK33', 'AJ26'] },
  { canonicalName: 'RD-0124', entityType: 'engine', aliases: ['RD0124'] },
  { canonicalName: 'RD-253', entityType: 'engine', aliases: ['RD253'] },

  // European engines
  { canonicalName: 'Vulcain 2', entityType: 'engine', aliases: ['Vulcain-2', 'Vulcain2'] },
  { canonicalName: 'Vinci', entityType: 'engine', aliases: ['Vinci Engine'] },
  { canonicalName: 'HM7B', entityType: 'engine', aliases: ['HM7-B', 'HM-7B'] },
  { canonicalName: 'Prometheus', entityType: 'engine', aliases: ['ArianeGroup Prometheus'] },

  // ULA/Northrop engines
  { canonicalName: 'GEM 63', entityType: 'engine', aliases: ['GEM63', 'GEM-63', 'GEM 63XL'] },

  // Relativity engines
  { canonicalName: 'Aeon 1', entityType: 'engine', aliases: ['Aeon1', 'Aeon-1', 'Aeon'] },
  { canonicalName: 'Aeon R', entityType: 'engine', aliases: ['AeonR', 'Aeon-R'] },

  // Firefly engines
  { canonicalName: 'Reaver', entityType: 'engine', aliases: ['Reaver 1', 'Firefly Reaver'] },
  { canonicalName: 'Lightning', entityType: 'engine', aliases: ['Lightning 1', 'Firefly Lightning'] },

  // Chinese engines
  { canonicalName: 'YF-100', entityType: 'engine', aliases: ['YF100'] },
  { canonicalName: 'YF-77', entityType: 'engine', aliases: ['YF77'] },
  { canonicalName: 'YF-75D', entityType: 'engine', aliases: ['YF75D', 'YF-75'] },
];

const NEW_LAUNCH_VEHICLES: NewEntity[] = [
  // SpaceX
  { canonicalName: 'Falcon 1', entityType: 'launch_vehicle', aliases: ['F1'] },
  { canonicalName: 'Dragon', entityType: 'launch_vehicle', aliases: ['Crew Dragon', 'Cargo Dragon', 'SpaceX Dragon'] },

  // Blue Origin
  { canonicalName: 'New Shepard', entityType: 'launch_vehicle', aliases: ['Blue Origin New Shepard'] },

  // ULA
  { canonicalName: 'Delta IV', entityType: 'launch_vehicle', aliases: ['Delta 4', 'Delta IV Heavy', 'Delta IV Medium'] },
  { canonicalName: 'Centaur', entityType: 'launch_vehicle', aliases: ['Centaur V', 'Centaur III'] },

  // Rocket Lab
  { canonicalName: 'Neutron', entityType: 'launch_vehicle', aliases: ['Rocket Lab Neutron'] },

  // Relativity
  { canonicalName: 'Terran 1', entityType: 'launch_vehicle', aliases: ['Terran1', 'Terran-1'] },
  { canonicalName: 'Terran R', entityType: 'launch_vehicle', aliases: ['TerranR', 'Terran-R'] },

  // Firefly
  { canonicalName: 'Alpha', entityType: 'launch_vehicle', aliases: ['Firefly Alpha'] },

  // European
  { canonicalName: 'Ariane 5', entityType: 'launch_vehicle', aliases: ['Ariane5', 'Ariane V'] },
  { canonicalName: 'Ariane 6', entityType: 'launch_vehicle', aliases: ['Ariane6', 'Ariane VI', 'A62', 'A64'] },
  { canonicalName: 'Vega', entityType: 'launch_vehicle', aliases: ['Vega C', 'Vega-C'] },

  // Russian
  { canonicalName: 'Soyuz', entityType: 'launch_vehicle', aliases: ['Soyuz 2', 'Soyuz-2', 'Soyuz 2.1a', 'Soyuz 2.1b'] },
  { canonicalName: 'Proton', entityType: 'launch_vehicle', aliases: ['Proton-M', 'Proton M', 'Proton Heavy'] },
  { canonicalName: 'Angara', entityType: 'launch_vehicle', aliases: ['Angara A5', 'Angara-A5', 'Angara 1.2'] },

  // Chinese
  { canonicalName: 'Long March 5', entityType: 'launch_vehicle', aliases: ['CZ-5', 'Chang Zheng 5', 'LM-5'] },
  { canonicalName: 'Long March 7', entityType: 'launch_vehicle', aliases: ['CZ-7', 'Chang Zheng 7', 'LM-7'] },
  { canonicalName: 'Long March 9', entityType: 'launch_vehicle', aliases: ['CZ-9', 'Chang Zheng 9', 'LM-9'] },

  // Indian
  { canonicalName: 'PSLV', entityType: 'launch_vehicle', aliases: ['Polar Satellite Launch Vehicle'] },
  { canonicalName: 'GSLV', entityType: 'launch_vehicle', aliases: ['Geosynchronous Satellite Launch Vehicle', 'GSLV Mk III', 'LVM3'] },

  // Japanese
  { canonicalName: 'H-IIA', entityType: 'launch_vehicle', aliases: ['H2A', 'H-2A'] },
  { canonicalName: 'H3', entityType: 'launch_vehicle', aliases: ['H-3', 'H3 Launch Vehicle'] },
  { canonicalName: 'Epsilon', entityType: 'launch_vehicle', aliases: ['Epsilon Rocket'] },
];

async function addEntities() {
  const allEntities = [...NEW_ENGINES, ...NEW_LAUNCH_VEHICLES];

  console.log(`Adding ${allEntities.length} new entities...`);

  let added = 0;
  let skipped = 0;

  for (const entity of allEntities) {
    // Check if entity already exists
    const existing = await sql`
      SELECT id FROM truth_ledger_claude.entities
      WHERE LOWER(canonical_name) = ${entity.canonicalName.toLowerCase()}
    `;

    if (existing.length > 0) {
      console.log(`  Skipping ${entity.canonicalName} (already exists)`);
      skipped++;
      continue;
    }

    // Insert new entity
    await sql`
      INSERT INTO truth_ledger_claude.entities (
        canonical_name, entity_type, aliases
      ) VALUES (
        ${entity.canonicalName},
        ${entity.entityType},
        ${entity.aliases}
      )
    `;

    console.log(`  Added ${entity.canonicalName} (${entity.entityType})`);
    added++;
  }

  console.log(`\nDone! Added ${added} new entities, skipped ${skipped} existing.`);

  // Show total count
  const total = await sql`SELECT COUNT(*) as cnt FROM truth_ledger_claude.entities`;
  console.log(`Total entities in database: ${total[0].cnt}`);

  await sql.end();
}

addEntities().catch(console.error);
