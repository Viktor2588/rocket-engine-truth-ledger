import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

// Improved extractor patterns based on actual Wikipedia data
const IMPROVED_EXTRACTORS = [
  {
    name: 'Thrust Extractor (Enhanced)',
    description: 'Extracts thrust values in various formats including parenthetical units',
    attributePattern: 'engines.thrust_n',
    entityType: 'engine',
    patterns: [
      // "340 kN (76,000 lbf) of thrust"
      '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kn|kN|MN|mn)\\s*\\([^)]+\\)\\s*(?:of\\s+)?thrust',
      // "thrust of 690 kN (155,000 lbf)"
      'thrust\\s+of\\s+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kn|kN|MN|mn)',
      // "producing 380 kN of thrust"
      'produc(?:e|es|ing)\\s+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kn|kN|MN|mn)\\s+(?:of\\s+)?thrust',
      // "vacuum thrust of 411 kN"
      '(?:vacuum|sea\\s*level|sl|vac)\\s+thrust\\s+(?:of\\s+)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kn|kN|MN|mn)',
      // Standard patterns
      '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kn|kN|MN|mn|lbf|klbf)\\s+(?:of\\s+)?thrust',
      'thrust[:\\s]+(?:of\\s+)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(n|kn|kN|MN|mn|lbf)',
      // Numbers with units
      '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kilonewtons?|kN)(?:\\s|\\.|,|$)',
    ],
    targetUnit: 'N',
    unitConversions: { n: 1, kn: 1000, mn: 1000000, lbf: 4.44822, klbf: 4448.22, kilonewtons: 1000, kilonewton: 1000 },
    priority: 150,
    isActive: true,
  },
  {
    name: 'ISP Extractor (Enhanced)',
    description: 'Extracts specific impulse in various formats',
    attributePattern: 'engines.isp_s',
    entityType: 'engine',
    patterns: [
      // "specific impulse of 261 s (2.56 km/s)"
      'specific\\s+impulse\\s+of\\s+(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)',
      // "Isp of 310 s"
      'I(?:sp|SP)\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)',
      // "vacuum specific impulse of 342 s"
      '(?:vacuum|sea\\s*level|sl|vac)\\s+(?:specific\\s+)?(?:impulse|Isp)\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)',
      // "( Isp ) of 310 s"
      '\\(\\s*I(?:sp|SP)\\s*\\)\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)',
      // "261 s specific impulse"
      '(\\d{2,3}(?:\\.\\d+)?)\\s*(s|seconds?)\\s+(?:specific\\s+)?impulse',
      // Standard patterns
      '(?:isp|specific\\s+impulse)[:\\s]+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)?',
    ],
    targetUnit: 's',
    unitConversions: { s: 1, seconds: 1, second: 1 },
    priority: 140,
    isActive: true,
  },
  {
    name: 'Chamber Pressure Extractor (Enhanced)',
    description: 'Extracts chamber pressure values',
    attributePattern: 'engines.chamber_pressure_bar',
    entityType: 'engine',
    patterns: [
      // "chamber pressure of 270 bar"
      'chamber\\s+pressure\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(bar|mpa|psi)',
      // "270 bar chamber pressure"
      '(\\d+(?:\\.\\d+)?)\\s*(bar|mpa|psi)\\s+chamber\\s+pressure',
      // "pressure: 300 bar"
      'pressure[:\\s]+(\\d+(?:\\.\\d+)?)\\s*(bar|mpa|psi)',
    ],
    targetUnit: 'bar',
    unitConversions: { bar: 1, mpa: 10, psi: 0.0689476 },
    priority: 130,
    isActive: true,
  },
  {
    name: 'Engine Mass Extractor',
    description: 'Extracts engine dry mass',
    attributePattern: 'engines.mass_kg',
    entityType: 'engine',
    patterns: [
      // "dry mass of 470 kg"
      '(?:dry\\s+)?mass\\s+(?:of\\s+)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t|lb|lbs)',
      // "470 kg dry mass"
      '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)\\s+(?:dry\\s+)?mass',
      // "weight: 1,500 kg"
      'weight[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t|lb)',
    ],
    targetUnit: 'kg',
    unitConversions: { kg: 1, t: 1000, lb: 0.453592, lbs: 0.453592 },
    priority: 120,
    isActive: true,
  },
  {
    name: 'Burn Time Extractor (Enhanced)',
    description: 'Extracts burn/firing duration',
    attributePattern: 'engines.burn_time_s',
    entityType: 'engine',
    patterns: [
      // "firing of 170 seconds"
      '(?:firing|burn(?:ing)?)\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(s|seconds?|min|minutes?)',
      // "170 seconds burn"
      '(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)\\s+(?:burn|firing)',
      // "burn time of 329 seconds"
      'burn\\s+(?:time|duration)\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(s|seconds?|min)',
      // "full-duration firing (329 seconds)"
      'full[- ]duration\\s+(?:firing|burn)[^)]*\\((\\d+(?:\\.\\d+)?)\\s*(s|seconds?)\\)',
    ],
    targetUnit: 's',
    unitConversions: { s: 1, seconds: 1, second: 1, min: 60, minutes: 60, minute: 60 },
    priority: 110,
    isActive: true,
  },
  {
    name: 'Expansion Ratio Extractor',
    description: 'Extracts nozzle expansion ratio',
    attributePattern: 'engines.expansion_ratio',
    entityType: 'engine',
    patterns: [
      // "expansion ratio of 16"
      'expansion\\s+ratio\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)',
      // "nozzle ratio: 165"
      'nozzle\\s+(?:expansion\\s+)?ratio[:\\s]+(\\d+(?:\\.\\d+)?)',
      // "area ratio of 21"
      'area\\s+ratio\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)',
    ],
    targetUnit: null,
    unitConversions: {},
    priority: 100,
    isActive: true,
  },
  {
    name: 'Payload to LEO Extractor (Enhanced)',
    description: 'Extracts payload capacity to Low Earth Orbit',
    attributePattern: 'launch_vehicles.payload_to_leo_kg',
    entityType: 'launch_vehicle',
    patterns: [
      // "payload to LEO: 22,800 kg"
      'payload\\s+(?:to\\s+)?(?:leo|low\\s+earth\\s+orbit)[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)',
      // "22,800 kg to LEO"
      '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)\\s+(?:to\\s+)?(?:leo|low\\s+earth\\s+orbit)',
      // "LEO capacity of 63,800 kg"
      '(?:leo|low\\s+earth\\s+orbit)\\s+(?:capacity|payload)\\s+(?:of\\s+)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)',
    ],
    targetUnit: 'kg',
    unitConversions: { kg: 1, t: 1000 },
    priority: 135,
    isActive: true,
  },
  {
    name: 'Payload to GTO Extractor (Enhanced)',
    description: 'Extracts payload capacity to GTO',
    attributePattern: 'launch_vehicles.payload_to_gto_kg',
    entityType: 'launch_vehicle',
    patterns: [
      // "payload to GTO: 8,300 kg"
      'payload\\s+(?:to\\s+)?(?:gto|geostationary\\s+transfer)[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)',
      // "8,300 kg to GTO"
      '(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)\\s+(?:to\\s+)?(?:gto|geostationary)',
      // "GTO capacity of 26,700 kg"
      '(?:gto|geostationary)\\s+(?:capacity|payload)\\s+(?:of\\s+)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)',
    ],
    targetUnit: 'kg',
    unitConversions: { kg: 1, t: 1000 },
    priority: 125,
    isActive: true,
  },
  {
    name: 'Vehicle Height Extractor',
    description: 'Extracts launch vehicle height',
    attributePattern: 'launch_vehicles.height_m',
    entityType: 'launch_vehicle',
    patterns: [
      // "height: 70 m"
      '(?:height|length|tall)[:\\s]+(\\d+(?:\\.\\d+)?)\\s*(m|meters?|ft|feet)',
      // "70 m tall"
      '(\\d+(?:\\.\\d+)?)\\s*(m|meters?)\\s+(?:tall|high|long)',
      // "stands 70 meters"
      'stands?\\s+(\\d+(?:\\.\\d+)?)\\s*(m|meters?)\\s+(?:tall)?',
    ],
    targetUnit: 'm',
    unitConversions: { m: 1, meters: 1, meter: 1, ft: 0.3048, feet: 0.3048 },
    priority: 105,
    isActive: true,
  },
  {
    name: 'Diameter Extractor (Enhanced)',
    description: 'Extracts diameter measurements',
    attributePattern: 'engines.diameter_m',
    entityType: null,
    patterns: [
      // "diameter of 3.7 m"
      'diameter\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(m|cm|mm|ft|meters?)',
      // "3.7 m diameter"
      '(\\d+(?:\\.\\d+)?)\\s*(m|meters?)\\s+(?:in\\s+)?diameter',
      // "3.7 m wide"
      '(\\d+(?:\\.\\d+)?)\\s*(m|meters?)\\s+wide',
    ],
    targetUnit: 'm',
    unitConversions: { m: 1, meters: 1, meter: 1, cm: 0.01, mm: 0.001, ft: 0.3048 },
    priority: 95,
    isActive: true,
  },
  {
    name: 'Throttle Range Extractor',
    description: 'Extracts throttle percentage range',
    attributePattern: 'engines.throttle_range_percent',
    entityType: 'engine',
    patterns: [
      // "throttle between 100% and 70%"
      'throttle\\s+(?:between\\s+)?(\\d+)\\s*%\\s+(?:and|to)\\s+(\\d+)\\s*%',
      // "throttle to 40%"
      'throttle\\s+to\\s+(\\d+)\\s*%',
      // "40% throttle"
      '(\\d+)\\s*%\\s+(?:of\\s+)?(?:max(?:imal)?\\s+)?throttle',
    ],
    targetUnit: '%',
    unitConversions: {},
    priority: 90,
    isActive: true,
  },
  {
    name: 'Propellant Extractor',
    description: 'Extracts propellant type',
    attributePattern: 'engines.propellant',
    entityType: 'engine',
    patterns: [
      // "Propellant LOX / RP-1"
      'propellant[:\\s]+(LOX|LH2|RP-1|kerosene|methane|CH4)\\s*/\\s*(LOX|LH2|RP-1|kerosene|methane|CH4)',
      // "uses LOX/RP-1"
      'uses?\\s+(LOX|LH2|RP-1|kerosene|methane|CH4)\\s*/\\s*(LOX|LH2|RP-1|kerosene)',
      // "liquid oxygen and methane"
      '(liquid\\s+oxygen|LOX)\\s+(?:and|/)\\s+(methane|kerosene|RP-1|liquid\\s+hydrogen)',
    ],
    targetUnit: null,
    unitConversions: {},
    priority: 85,
    isActive: true,
  },
  {
    name: 'Engine Cycle Extractor',
    description: 'Extracts engine cycle type',
    attributePattern: 'engines.cycle',
    entityType: 'engine',
    patterns: [
      // "Cycle Gas-generator"
      'cycle[:\\s]+(gas[- ]generator|staged\\s+combustion|full[- ]flow|expander|pressure[- ]fed)',
      // "gas-generator cycle"
      '(gas[- ]generator|staged\\s+combustion|full[- ]flow|expander|pressure[- ]fed)\\s+cycle',
    ],
    targetUnit: null,
    unitConversions: {},
    priority: 80,
    isActive: true,
  },
];

async function main() {
  let added = 0;
  let updated = 0;

  for (const extractor of IMPROVED_EXTRACTORS) {
    try {
      // Check if exists
      const existing = await sql`
        SELECT id FROM truth_ledger_claude.extractor_patterns
        WHERE name = ${extractor.name}
      `;

      if (existing.length > 0) {
        // Update existing
        await sql`
          UPDATE truth_ledger_claude.extractor_patterns
          SET
            description = ${extractor.description},
            attribute_pattern = ${extractor.attributePattern},
            entity_type = ${extractor.entityType},
            patterns = ${extractor.patterns},
            target_unit = ${extractor.targetUnit},
            unit_conversions = ${extractor.unitConversions},
            priority = ${extractor.priority},
            is_active = ${extractor.isActive}
          WHERE id = ${existing[0].id}
        `;
        updated++;
        console.log(`Updated: ${extractor.name}`);
      } else {
        // Insert new
        await sql`
          INSERT INTO truth_ledger_claude.extractor_patterns (
            name, description, attribute_pattern, entity_type,
            patterns, target_unit, unit_conversions, priority, is_active
          ) VALUES (
            ${extractor.name}, ${extractor.description}, ${extractor.attributePattern},
            ${extractor.entityType}, ${extractor.patterns}, ${extractor.targetUnit},
            ${extractor.unitConversions}, ${extractor.priority}, ${extractor.isActive}
          )
        `;
        added++;
        console.log(`Added: ${extractor.name}`);
      }
    } catch (e: any) {
      console.error(`Error with ${extractor.name}:`, e.message);
    }
  }

  console.log(`\nTotal: Added ${added}, Updated ${updated} extractors`);

  // Show all active extractors
  const allExtractors = await sql`
    SELECT name, attribute_pattern, priority, is_active
    FROM truth_ledger_claude.extractor_patterns
    ORDER BY priority DESC
  `;
  console.log('\n=== All Extractor Patterns ===');
  allExtractors.forEach(e => console.log(`${e.is_active ? '✓' : '✗'} [${e.priority}] ${e.name} -> ${e.attribute_pattern}`));

  await sql.end();
}

main();
