/**
 * Ground Truth Data for Benchmark Validation
 *
 * Known correct values from official sources for validating extraction accuracy.
 * Sources: SpaceX official specs, NASA documentation, manufacturer data sheets
 */

export interface GroundTruthValue {
  entityName: string;
  attributeName: string;
  value: number;
  unit: string;
  scope: {
    altitude?: 'sl' | 'vac';
    variant?: string;
  };
  source: string;
  tolerance: number; // Acceptable % deviation (e.g., 0.05 = 5%)
}

/**
 * Official engine specifications from reliable sources
 */
export const GROUND_TRUTH: GroundTruthValue[] = [
  // ========================================
  // SpaceX Merlin Family
  // ========================================

  // Merlin 1D (current version)
  {
    entityName: 'Merlin 1D',
    attributeName: 'engines.thrust_n',
    value: 845000, // 845 kN sea level
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'SpaceX official (2023)',
    tolerance: 0.05,
  },
  {
    entityName: 'Merlin 1D',
    attributeName: 'engines.thrust_n',
    value: 914000, // 914 kN vacuum
    unit: 'N',
    scope: { altitude: 'vac' },
    source: 'SpaceX official (2023)',
    tolerance: 0.05,
  },
  {
    entityName: 'Merlin 1D',
    attributeName: 'engines.isp_s',
    value: 282, // sea level
    unit: 's',
    scope: { altitude: 'sl' },
    source: 'SpaceX official',
    tolerance: 0.03,
  },
  {
    entityName: 'Merlin 1D',
    attributeName: 'engines.isp_s',
    value: 311, // vacuum
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'SpaceX official',
    tolerance: 0.03,
  },

  // Merlin 1D Vacuum
  {
    entityName: 'Merlin 1D Vacuum',
    attributeName: 'engines.thrust_n',
    value: 981000, // 981 kN vacuum
    unit: 'N',
    scope: { altitude: 'vac' },
    source: 'SpaceX official',
    tolerance: 0.05,
  },
  {
    entityName: 'Merlin 1D Vacuum',
    attributeName: 'engines.isp_s',
    value: 348,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'SpaceX official',
    tolerance: 0.03,
  },

  // ========================================
  // SpaceX Raptor
  // ========================================
  {
    entityName: 'Raptor',
    attributeName: 'engines.thrust_n',
    value: 2256000, // ~2.26 MN sea level (Raptor 2)
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'SpaceX 2023 updates',
    tolerance: 0.10, // Higher tolerance due to ongoing development
  },
  {
    entityName: 'Raptor',
    attributeName: 'engines.isp_s',
    value: 327,
    unit: 's',
    scope: { altitude: 'sl' },
    source: 'SpaceX estimates',
    tolerance: 0.05,
  },
  {
    entityName: 'Raptor',
    attributeName: 'engines.isp_s',
    value: 356,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'SpaceX estimates',
    tolerance: 0.05,
  },

  // ========================================
  // Blue Origin BE-4
  // ========================================
  {
    entityName: 'BE-4',
    attributeName: 'engines.thrust_n',
    value: 2400000, // 2.4 MN sea level
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'Blue Origin official',
    tolerance: 0.05,
  },
  {
    entityName: 'BE-4',
    attributeName: 'engines.isp_s',
    value: 310,
    unit: 's',
    scope: { altitude: 'sl' },
    source: 'Blue Origin official',
    tolerance: 0.05,
  },

  // ========================================
  // Rocketdyne RS-25 (SSME)
  // ========================================
  {
    entityName: 'RS-25',
    attributeName: 'engines.thrust_n',
    value: 1860000, // 1.86 MN sea level at 109% throttle
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'NASA official',
    tolerance: 0.03,
  },
  {
    entityName: 'RS-25',
    attributeName: 'engines.thrust_n',
    value: 2279000, // 2.28 MN vacuum at 109%
    unit: 'N',
    scope: { altitude: 'vac' },
    source: 'NASA official',
    tolerance: 0.03,
  },
  {
    entityName: 'RS-25',
    attributeName: 'engines.isp_s',
    value: 366,
    unit: 's',
    scope: { altitude: 'sl' },
    source: 'NASA official',
    tolerance: 0.02,
  },
  {
    entityName: 'RS-25',
    attributeName: 'engines.isp_s',
    value: 452,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'NASA official',
    tolerance: 0.02,
  },

  // ========================================
  // RD-180
  // ========================================
  {
    entityName: 'RD-180',
    attributeName: 'engines.thrust_n',
    value: 3830000, // 3.83 MN sea level
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'NPO Energomash official',
    tolerance: 0.03,
  },
  {
    entityName: 'RD-180',
    attributeName: 'engines.isp_s',
    value: 311,
    unit: 's',
    scope: { altitude: 'sl' },
    source: 'NPO Energomash official',
    tolerance: 0.03,
  },
  {
    entityName: 'RD-180',
    attributeName: 'engines.isp_s',
    value: 338,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'NPO Energomash official',
    tolerance: 0.03,
  },
  {
    entityName: 'RD-180',
    attributeName: 'engines.mass_kg',
    value: 5480,
    unit: 'kg',
    scope: {},
    source: 'NPO Energomash official',
    tolerance: 0.05,
  },

  // ========================================
  // RD-191
  // ========================================
  {
    entityName: 'RD-191',
    attributeName: 'engines.thrust_n',
    value: 2090000,
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'NPO Energomash official',
    tolerance: 0.05,
  },
  {
    entityName: 'RD-191',
    attributeName: 'engines.mass_kg',
    value: 2290,
    unit: 'kg',
    scope: {},
    source: 'NPO Energomash official',
    tolerance: 0.05,
  },

  // ========================================
  // RS-68 / RS-68A
  // ========================================
  {
    entityName: 'RS-68',
    attributeName: 'engines.thrust_n',
    value: 2950000,
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'Aerojet Rocketdyne',
    tolerance: 0.05,
  },
  {
    entityName: 'RS-68',
    attributeName: 'engines.isp_s',
    value: 365,
    unit: 's',
    scope: { altitude: 'sl' },
    source: 'Aerojet Rocketdyne',
    tolerance: 0.03,
  },
  {
    entityName: 'RS-68',
    attributeName: 'engines.isp_s',
    value: 410,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'Aerojet Rocketdyne',
    tolerance: 0.03,
  },
  {
    entityName: 'RS-68',
    attributeName: 'engines.mass_kg',
    value: 6600,
    unit: 'kg',
    scope: {},
    source: 'Aerojet Rocketdyne',
    tolerance: 0.05,
  },

  // ========================================
  // F-1 (Saturn V)
  // ========================================
  {
    entityName: 'F-1',
    attributeName: 'engines.thrust_n',
    value: 6770000,
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'NASA historical',
    tolerance: 0.03,
  },
  {
    entityName: 'F-1',
    attributeName: 'engines.isp_s',
    value: 263,
    unit: 's',
    scope: { altitude: 'sl' },
    source: 'NASA historical',
    tolerance: 0.03,
  },
  {
    entityName: 'F-1',
    attributeName: 'engines.mass_kg',
    value: 8400,
    unit: 'kg',
    scope: {},
    source: 'NASA historical',
    tolerance: 0.05,
  },

  // ========================================
  // RL-10 Family
  // ========================================
  {
    entityName: 'RL-10',
    attributeName: 'engines.thrust_n',
    value: 110000,
    unit: 'N',
    scope: { altitude: 'vac' },
    source: 'Aerojet Rocketdyne',
    tolerance: 0.10,
  },
  {
    entityName: 'RL-10',
    attributeName: 'engines.isp_s',
    value: 465,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'Aerojet Rocketdyne',
    tolerance: 0.03,
  },
  {
    entityName: 'RL-10',
    attributeName: 'engines.mass_kg',
    value: 168,
    unit: 'kg',
    scope: {},
    source: 'Aerojet Rocketdyne',
    tolerance: 0.10,
  },

  // ========================================
  // Raptor Vacuum
  // ========================================
  {
    entityName: 'Raptor Vacuum',
    attributeName: 'engines.thrust_n',
    value: 2500000, // ~2.5 MN vacuum
    unit: 'N',
    scope: { altitude: 'vac' },
    source: 'SpaceX estimates',
    tolerance: 0.10,
  },
  {
    entityName: 'Raptor Vacuum',
    attributeName: 'engines.isp_s',
    value: 380,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'SpaceX estimates',
    tolerance: 0.05,
  },

  // ========================================
  // BE-4 Mass
  // ========================================
  {
    entityName: 'BE-4',
    attributeName: 'engines.mass_kg',
    value: 2300,
    unit: 'kg',
    scope: {},
    source: 'Blue Origin official',
    tolerance: 0.10,
  },

  // ========================================
  // Japanese LE-7A
  // ========================================
  {
    entityName: 'LE-7A',
    attributeName: 'engines.thrust_n',
    value: 1098000,
    unit: 'N',
    scope: { altitude: 'vac' },
    source: 'JAXA official',
    tolerance: 0.03,
  },
  {
    entityName: 'LE-7A',
    attributeName: 'engines.isp_s',
    value: 440,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'JAXA official',
    tolerance: 0.03,
  },
  {
    entityName: 'LE-7A',
    attributeName: 'engines.mass_kg',
    value: 1800,
    unit: 'kg',
    scope: {},
    source: 'JAXA official',
    tolerance: 0.10,
  },

  // ========================================
  // Vulcain 2
  // ========================================
  {
    entityName: 'Vulcain 2',
    attributeName: 'engines.thrust_n',
    value: 1390000,
    unit: 'N',
    scope: { altitude: 'vac' },
    source: 'ArianeGroup official',
    tolerance: 0.03,
  },
  {
    entityName: 'Vulcain 2',
    attributeName: 'engines.isp_s',
    value: 434,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'ArianeGroup official',
    tolerance: 0.03,
  },
  {
    entityName: 'Vulcain 2',
    attributeName: 'engines.mass_kg',
    value: 2100,
    unit: 'kg',
    scope: {},
    source: 'ArianeGroup official',
    tolerance: 0.10,
  },

  // ========================================
  // NK-33
  // ========================================
  {
    entityName: 'NK-33',
    attributeName: 'engines.thrust_n',
    value: 1680000,
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'NPO Energomash historical',
    tolerance: 0.05,
  },
  {
    entityName: 'NK-33',
    attributeName: 'engines.isp_s',
    value: 331,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'NPO Energomash historical',
    tolerance: 0.03,
  },
  {
    entityName: 'NK-33',
    attributeName: 'engines.mass_kg',
    value: 1240,
    unit: 'kg',
    scope: {},
    source: 'NPO Energomash historical',
    tolerance: 0.05,
  },

  // ========================================
  // Rutherford
  // ========================================
  {
    entityName: 'Rutherford',
    attributeName: 'engines.thrust_n',
    value: 25000,
    unit: 'N',
    scope: { altitude: 'sl' },
    source: 'Rocket Lab official',
    tolerance: 0.05,
  },
  {
    entityName: 'Rutherford',
    attributeName: 'engines.isp_s',
    value: 311,
    unit: 's',
    scope: { altitude: 'vac' },
    source: 'Rocket Lab official',
    tolerance: 0.03,
  },
  {
    entityName: 'Rutherford',
    attributeName: 'engines.mass_kg',
    value: 35,
    unit: 'kg',
    scope: {},
    source: 'Rocket Lab official',
    tolerance: 0.10,
  },
];

/**
 * Get ground truth values for a specific entity
 */
export function getGroundTruthForEntity(entityName: string): GroundTruthValue[] {
  const normalized = entityName.toLowerCase();
  return GROUND_TRUTH.filter(gt =>
    gt.entityName.toLowerCase() === normalized ||
    gt.entityName.toLowerCase().includes(normalized) ||
    normalized.includes(gt.entityName.toLowerCase())
  );
}

/**
 * Check if an extracted value matches ground truth
 */
export function validateAgainstGroundTruth(
  entityName: string,
  attributeName: string,
  extractedValue: number,
  scope?: { altitude?: 'sl' | 'vac' }
): {
  matched: boolean;
  groundTruth: GroundTruthValue | null;
  deviation: number | null;
  withinTolerance: boolean;
} {
  const candidates = GROUND_TRUTH.filter(gt => {
    const entityMatch = gt.entityName.toLowerCase() === entityName.toLowerCase();
    const attrMatch = gt.attributeName === attributeName;
    const scopeMatch = !scope?.altitude || !gt.scope.altitude ||
                       scope.altitude === gt.scope.altitude;
    return entityMatch && attrMatch && scopeMatch;
  });

  if (candidates.length === 0) {
    return { matched: false, groundTruth: null, deviation: null, withinTolerance: false };
  }

  // Find best matching ground truth
  const gt = candidates[0];
  const deviation = Math.abs(extractedValue - gt.value) / gt.value;
  const withinTolerance = deviation <= gt.tolerance;

  return {
    matched: true,
    groundTruth: gt,
    deviation,
    withinTolerance,
  };
}
