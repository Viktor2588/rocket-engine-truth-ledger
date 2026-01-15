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
