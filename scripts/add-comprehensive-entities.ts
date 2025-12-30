import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

// Comprehensive list of rocket engines from Wikipedia comparison pages
const ENGINES_TO_ADD = [
  // SpaceX variants
  { name: 'Merlin 1A', aliases: ['Merlin 1A', 'Merlin-1A', 'M1A'] },
  { name: 'Merlin 1B', aliases: ['Merlin 1B', 'Merlin-1B', 'M1B'] },
  { name: 'Merlin Vacuum', aliases: ['Merlin Vacuum', 'MVac', 'Merlin 1D Vacuum', 'M1D Vac'] },
  { name: 'Raptor Vacuum', aliases: ['Raptor Vacuum', 'RVac', 'Raptor 2 Vacuum'] },

  // Rocketdyne engines
  { name: 'F-1', aliases: ['F-1', 'F1', 'Rocketdyne F-1'] },
  { name: 'F-1B', aliases: ['F-1B', 'F1B'] },
  { name: 'J-2', aliases: ['J-2', 'J2', 'Rocketdyne J-2'] },
  { name: 'J-2X', aliases: ['J-2X', 'J2X'] },
  { name: 'RS-68', aliases: ['RS-68', 'RS68', 'Aerojet RS-68'] },
  { name: 'RS-68A', aliases: ['RS-68A', 'RS68A'] },
  { name: 'RS-27', aliases: ['RS-27', 'RS27'] },
  { name: 'RS-27A', aliases: ['RS-27A', 'RS27A'] },
  { name: 'SSME', aliases: ['SSME', 'Space Shuttle Main Engine', 'RS-25D'] },

  // Aerojet Rocketdyne
  { name: 'RL-10A-4-2', aliases: ['RL-10A-4-2', 'RL10A-4-2'] },
  { name: 'RL-10B-2', aliases: ['RL-10B-2', 'RL10B-2'] },
  { name: 'AJ-26', aliases: ['AJ-26', 'AJ26', 'NK-33 AJ-26'] },
  { name: 'AJ10', aliases: ['AJ10', 'AJ-10', 'AJ10-118K'] },

  // Russian engines
  { name: 'RD-107', aliases: ['RD-107', 'RD107'] },
  { name: 'RD-108', aliases: ['RD-108', 'RD108'] },
  { name: 'RD-120', aliases: ['RD-120', 'RD120'] },
  { name: 'RD-0110', aliases: ['RD-0110', 'RD0110'] },
  { name: 'RD-0120', aliases: ['RD-0120', 'RD0120'] },
  { name: 'RD-275', aliases: ['RD-275', 'RD275'] },
  { name: 'RD-843', aliases: ['RD-843', 'RD843'] },
  { name: 'RD-58', aliases: ['RD-58', 'RD58', 'RD-58M'] },
  { name: 'RD-191M', aliases: ['RD-191M', 'RD191M'] },
  { name: 'RD-193', aliases: ['RD-193', 'RD193'] },

  // European engines
  { name: 'Vulcain', aliases: ['Vulcain', 'Vulcain 1'] },
  { name: 'Vulcain 2.1', aliases: ['Vulcain 2.1'] },
  { name: 'P120C', aliases: ['P120C', 'P120'] },
  { name: 'Viking 5C', aliases: ['Viking 5C', 'Viking-5C'] },
  { name: 'Viking 6', aliases: ['Viking 6', 'Viking-6'] },

  // Japanese engines
  { name: 'LE-5', aliases: ['LE-5', 'LE5'] },
  { name: 'LE-5B', aliases: ['LE-5B', 'LE5B'] },
  { name: 'LE-7', aliases: ['LE-7', 'LE7'] },
  { name: 'LE-7A', aliases: ['LE-7A', 'LE7A'] },
  { name: 'LE-9', aliases: ['LE-9', 'LE9'] },

  // Chinese engines
  { name: 'YF-20', aliases: ['YF-20', 'YF20'] },
  { name: 'YF-21', aliases: ['YF-21', 'YF21'] },
  { name: 'YF-22', aliases: ['YF-22', 'YF22'] },
  { name: 'YF-23', aliases: ['YF-23', 'YF23'] },
  { name: 'YF-24', aliases: ['YF-24', 'YF24'] },
  { name: 'YF-40', aliases: ['YF-40', 'YF40'] },
  { name: 'YF-73', aliases: ['YF-73', 'YF73'] },
  { name: 'YF-115', aliases: ['YF-115', 'YF115'] },

  // Indian engines
  { name: 'Vikas', aliases: ['Vikas', 'Vikas engine'] },
  { name: 'CE-20', aliases: ['CE-20', 'CE20', 'Cryogenic Engine 20'] },
  { name: 'CE-7.5', aliases: ['CE-7.5', 'CE7.5'] },

  // Other notable engines
  { name: 'Kestrel', aliases: ['Kestrel', 'SpaceX Kestrel'] },
  { name: 'Curie', aliases: ['Curie', 'Curie engine'] },
  { name: 'Archimedes', aliases: ['Archimedes', 'Rocket Lab Archimedes'] },
  { name: 'Newton', aliases: ['Newton', 'Newton engine'] },
  { name: 'Hadley', aliases: ['Hadley', 'Astra Hadley'] },
  { name: 'Delphin', aliases: ['Delphin'] },
  { name: 'E-2', aliases: ['E-2', 'E2', 'Firefly E-2'] },
  { name: 'Miranda', aliases: ['Miranda', 'Relativity Miranda'] },
  { name: 'Aeon', aliases: ['Aeon', 'Relativity Aeon'] },
];

// More launch vehicles
const VEHICLES_TO_ADD = [
  { name: 'Saturn V', aliases: ['Saturn V', 'Saturn 5'] },
  { name: 'Saturn IB', aliases: ['Saturn IB', 'Saturn 1B'] },
  { name: 'Space Shuttle', aliases: ['Space Shuttle', 'STS', 'Shuttle'] },
  { name: 'Delta II', aliases: ['Delta II', 'Delta 2'] },
  { name: 'Delta III', aliases: ['Delta III', 'Delta 3'] },
  { name: 'Delta IV Heavy', aliases: ['Delta IV Heavy', 'Delta 4 Heavy', 'DIV Heavy'] },
  { name: 'Atlas II', aliases: ['Atlas II', 'Atlas 2'] },
  { name: 'Atlas III', aliases: ['Atlas III', 'Atlas 3'] },
  { name: 'Titan II', aliases: ['Titan II', 'Titan 2'] },
  { name: 'Titan III', aliases: ['Titan III', 'Titan 3'] },
  { name: 'Titan IV', aliases: ['Titan IV', 'Titan 4'] },
  { name: 'Antares', aliases: ['Antares', 'Northrop Antares'] },
  { name: 'Minotaur', aliases: ['Minotaur', 'Minotaur IV'] },
  { name: 'Pegasus', aliases: ['Pegasus', 'Orbital Pegasus'] },
  { name: 'LauncherOne', aliases: ['LauncherOne', 'Launcher One', 'Virgin Orbit LauncherOne'] },
  { name: 'Firefly Alpha', aliases: ['Firefly Alpha', 'Alpha rocket'] },
  { name: 'Zenit', aliases: ['Zenit', 'Zenit-2', 'Zenit-3'] },
  { name: 'Energia', aliases: ['Energia', 'Energia rocket'] },
  { name: 'N1', aliases: ['N1', 'N-1', 'Soviet N1'] },
  { name: 'Long March 2', aliases: ['Long March 2', 'CZ-2', 'Chang Zheng 2'] },
  { name: 'Long March 3', aliases: ['Long March 3', 'CZ-3', 'Chang Zheng 3'] },
  { name: 'Long March 4', aliases: ['Long March 4', 'CZ-4', 'Chang Zheng 4'] },
  { name: 'Long March 6', aliases: ['Long March 6', 'CZ-6', 'Chang Zheng 6'] },
  { name: 'Long March 11', aliases: ['Long March 11', 'CZ-11', 'Chang Zheng 11'] },
  { name: 'Kuaizhou', aliases: ['Kuaizhou', 'KZ-1', 'KZ-11'] },
  { name: 'H-IIB', aliases: ['H-IIB', 'H2B', 'HII-B'] },
  { name: 'Vega C', aliases: ['Vega C', 'Vega-C'] },
];

async function main() {
  let addedEngines = 0;
  let addedVehicles = 0;
  let skipped = 0;
  let updated = 0;

  // Add engines
  for (const engine of ENGINES_TO_ADD) {
    try {
      // Check if exists
      const existing = await sql`
        SELECT id FROM truth_ledger_claude.entities
        WHERE entity_type = 'engine' AND canonical_name = ${engine.name}
      `;

      if (existing.length > 0) {
        // Update aliases
        await sql`
          UPDATE truth_ledger_claude.entities
          SET aliases = ${engine.aliases}
          WHERE id = ${existing[0].id}
        `;
        updated++;
      } else {
        // Insert new
        await sql`
          INSERT INTO truth_ledger_claude.entities (entity_type, canonical_name, aliases)
          VALUES ('engine', ${engine.name}, ${engine.aliases})
        `;
        addedEngines++;
      }
    } catch (e: any) {
      console.error(`Error adding ${engine.name}:`, e.message);
    }
  }

  // Add vehicles
  for (const vehicle of VEHICLES_TO_ADD) {
    try {
      const existing = await sql`
        SELECT id FROM truth_ledger_claude.entities
        WHERE entity_type = 'launch_vehicle' AND canonical_name = ${vehicle.name}
      `;

      if (existing.length > 0) {
        await sql`
          UPDATE truth_ledger_claude.entities
          SET aliases = ${vehicle.aliases}
          WHERE id = ${existing[0].id}
        `;
        updated++;
      } else {
        await sql`
          INSERT INTO truth_ledger_claude.entities (entity_type, canonical_name, aliases)
          VALUES ('launch_vehicle', ${vehicle.name}, ${vehicle.aliases})
        `;
        addedVehicles++;
      }
    } catch (e: any) {
      console.error(`Error adding ${vehicle.name}:`, e.message);
    }
  }

  // Count totals
  const counts = await sql`
    SELECT entity_type, COUNT(*)::int as count
    FROM truth_ledger_claude.entities
    GROUP BY entity_type
  `;

  console.log(`\nAdded ${addedEngines} engines, ${addedVehicles} vehicles, updated ${updated} existing`);
  console.log('\nTotal entities:');
  counts.forEach(c => console.log(`  ${c.entity_type}: ${c.count}`));

  await sql.end();
}

main();
