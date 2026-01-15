/**
 * Truth Ledger Configuration Constants
 * Core settings for scoring, source trust, and display policies
 */

// ============================================================================
// DOCUMENT TYPE MULTIPLIERS
// ============================================================================
// These multiply the source base_trust to get effective document weight
// Higher = more reliable document type

export const DOC_TYPE_MULTIPLIER: Record<string, number> = {
  regulation: 1.20,           // Official regulations (FAA, etc.)
  standard: 1.15,             // Industry standards (ISO, ECSS)
  standard_or_policy: 1.10,   // Agency standards/policies
  peer_reviewed_paper: 1.05,  // Peer-reviewed academic papers
  technical_report: 1.00,     // Technical reports, white papers
  manufacturer_datasheet: 0.95, // Official manufacturer specs
  company_news: 0.75,         // Company press releases, updates
  news_article: 0.65,         // General news coverage
  blog_post: 0.50,            // Blog posts, informal sources
  wiki: 0.45,                 // Wikipedia and similar
  forum_post: 0.35,           // Forum discussions
  social_media: 0.25,         // Social media posts
  other: 0.60,                // Uncategorized
};

// Low-quality document types (subject to the 30% cap)
export const LOW_QUALITY_DOC_TYPES = new Set([
  'blog_post',
  'social_media',
  'news_article',
  'company_news',
  'forum_post',
  'wiki',
]);

// Maximum contribution from low-quality sources to support_score
export const LOW_QUALITY_CAP_RATIO = 0.30;

// ============================================================================
// SOURCE TYPE BASE TRUST RANGES
// ============================================================================
// These are defaults; actual trust is stored in the sources table

export const SOURCE_TYPE_TRUST_RANGES: Record<string, { min: number; max: number; default: number }> = {
  regulator: { min: 0.90, max: 1.00, default: 0.95 },
  government_agency: { min: 0.85, max: 0.98, default: 0.92 },
  standards_body: { min: 0.85, max: 0.95, default: 0.90 },
  manufacturer: { min: 0.70, max: 0.90, default: 0.85 },
  peer_reviewed: { min: 0.70, max: 0.92, default: 0.85 },
  research: { min: 0.60, max: 0.85, default: 0.75 },
  news: { min: 0.40, max: 0.70, default: 0.55 },
  blog: { min: 0.30, max: 0.60, default: 0.45 },
  wiki: { min: 0.35, max: 0.55, default: 0.50 },
  forum: { min: 0.15, max: 0.40, default: 0.25 },
  social_media: { min: 0.10, max: 0.30, default: 0.20 },
  other: { min: 0.30, max: 0.70, default: 0.50 },
};

// ============================================================================
// INDEPENDENCE CLUSTER WEIGHTS
// ============================================================================
// Diminishing returns for multiple sources in the same cluster
// Prevents copy-paste chains from inflating scores

export function computeIndependenceWeight(positionInCluster: number): number {
  // First source: 100%, Second: 50%, Third+: 25% each
  if (positionInCluster === 1) return 1.0;
  if (positionInCluster === 2) return 0.5;
  return 0.25;
}

// Alternative formula: 1 / (1 + 0.5 * (count - 1))
export function computeClusterWeight(clusterCount: number): number {
  return 1 / (1 + 0.5 * Math.max(0, clusterCount - 1));
}

// ============================================================================
// RECENCY SCORING
// ============================================================================
// How document age affects its weight

export interface RecencyConfig {
  halfLifeDays: number;      // Days until score drops to 50%
  minScore: number;          // Floor for very old documents
  supersededPenalty: number; // Penalty when newer version exists
}

export const RECENCY_CONFIG: RecencyConfig = {
  halfLifeDays: 365 * 2,     // 2-year half-life
  minScore: 0.3,             // Old docs still count for 30%
  supersededPenalty: 0.5,    // Superseded docs get 50% penalty
};

export function computeRecencyScore(
  publishedAt: Date | null,
  now: Date = new Date(),
  isSuperseded: boolean = false
): number {
  if (!publishedAt) return RECENCY_CONFIG.minScore;

  const daysSincePublished = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay with half-life
  let score = Math.pow(0.5, daysSincePublished / RECENCY_CONFIG.halfLifeDays);

  // Apply superseded penalty
  if (isSuperseded) {
    score *= RECENCY_CONFIG.supersededPenalty;
  }

  // Apply floor
  return Math.max(RECENCY_CONFIG.minScore, score);
}

// ============================================================================
// RAW SCORING PARAMETERS
// ============================================================================

export interface RawScoringConfig {
  k: number;                          // Regularization constant
  lowQualityCapRatio: number;         // Max contribution from low-quality sources
  minEvidenceForConfidence: number;   // Minimum evidence pieces for high confidence
}

export const RAW_SCORING_CONFIG: RawScoringConfig = {
  k: 0.5,                    // Prevents overconfidence on tiny evidence
  lowQualityCapRatio: 0.30,  // 30% max from low-quality sources
  minEvidenceForConfidence: 2,
};

// ============================================================================
// TRUTH SLIDER & DISPLAY CONFIGURATION
// ============================================================================

export interface SliderPoint {
  slider: number;
  value: number;
}

// Linear interpolation between slider points
export function interpolateSliderValue(points: SliderPoint[], slider: number): number {
  // Find the two points to interpolate between
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (slider >= p1.slider && slider <= p2.slider) {
      const t = (slider - p1.slider) / (p2.slider - p1.slider);
      return p1.value + t * (p2.value - p1.value);
    }
  }
  // Edge cases
  if (slider <= points[0].slider) return points[0].value;
  return points[points.length - 1].value;
}

// Display policy thresholds (slider-dependent)
export const DISPLAY_POLICY = {
  // Minimum truth_display to show best_answer
  minTruthToShowBestAnswer: [
    { slider: 0.0, value: 0.85 },  // Conservative: high bar
    { slider: 0.5, value: 0.70 },  // Balanced
    { slider: 1.0, value: 0.45 },  // Assertive: low bar
  ],

  // Minimum independent sources required
  minIndependentSources: [
    { slider: 0.0, value: 2 },
    { slider: 0.5, value: 1 },
    { slider: 1.0, value: 0 },
  ],

  // Maximum allowed contradiction score
  maxAllowedContradiction: [
    { slider: 0.0, value: 0.15 },
    { slider: 0.5, value: 0.30 },
    { slider: 1.0, value: 0.60 },
  ],

  // Tie margin (distance between #1 and #2 to declare winner)
  tieMargin: [
    { slider: 0.0, value: 0.12 },
    { slider: 0.5, value: 0.07 },
    { slider: 1.0, value: 0.03 },
  ],
};

// Gamma curve for truth_display calibration
// slider=0 (conservative) => gamma high (compresses raw)
// slider=1 (assertive) => gamma low (expands raw)
export const GAMMA_CURVE = [
  { slider: 0.0, value: 2.2 },
  { slider: 0.5, value: 1.0 },
  { slider: 1.0, value: 0.6 },
];

export function computeGamma(slider: number): number {
  return interpolateSliderValue(GAMMA_CURVE, slider);
}

export function computeTruthDisplay(truthRaw: number, slider: number): number {
  const gamma = computeGamma(slider);
  return Math.pow(truthRaw, gamma);
}

// ============================================================================
// CONFLICT DETECTION TOLERANCE
// ============================================================================

export interface ToleranceConfig {
  absoluteTolerance: number | null;  // For small values
  relativeTolerance: number;         // For large values (e.g., 0.02 = 2%)
}

// Default tolerances by attribute type
export const DEFAULT_TOLERANCES: Record<string, ToleranceConfig> = {
  // Engine attributes
  'engines.thrust_n': { absoluteTolerance: null, relativeTolerance: 0.02 },
  'engines.isp_s': { absoluteTolerance: 1.0, relativeTolerance: 0.01 },
  'engines.mass_kg': { absoluteTolerance: null, relativeTolerance: 0.05 },
  'engines.chamber_pressure_bar': { absoluteTolerance: null, relativeTolerance: 0.03 },

  // Launch vehicle attributes
  'launch_vehicles.payload_to_leo_kg': { absoluteTolerance: null, relativeTolerance: 0.05 },
  'launch_vehicles.payload_to_gto_kg': { absoluteTolerance: null, relativeTolerance: 0.05 },
  'launch_vehicles.height_meters': { absoluteTolerance: 0.1, relativeTolerance: 0.01 },

  // Default for unspecified numeric attributes
  default: { absoluteTolerance: null, relativeTolerance: 0.02 },
};

export function valuesAreConflicting(
  value1: number,
  value2: number,
  attributeName: string
): boolean {
  const tolerance = DEFAULT_TOLERANCES[attributeName] || DEFAULT_TOLERANCES.default;

  const absDiff = Math.abs(value1 - value2);
  const maxVal = Math.max(Math.abs(value1), Math.abs(value2));

  // Apply tolerance: values are same if within max(abs_tol, rel_tol * max)
  const threshold = Math.max(
    tolerance.absoluteTolerance || 0,
    tolerance.relativeTolerance * maxVal
  );

  return absDiff > threshold;
}

// ============================================================================
// STATUS LABELS
// ============================================================================

export type DisplayStatus = 'verified' | 'supported' | 'disputed' | 'insufficient' | 'unknown';

export function computeDisplayStatus(
  truthDisplay: number,
  independentSources: number,
  contradictionScore: number,
  slider: number
): DisplayStatus {
  const minTruth = interpolateSliderValue(DISPLAY_POLICY.minTruthToShowBestAnswer, slider);
  const minSources = interpolateSliderValue(DISPLAY_POLICY.minIndependentSources, slider);
  const maxContradiction = interpolateSliderValue(DISPLAY_POLICY.maxAllowedContradiction, slider);

  if (independentSources < 1) {
    return 'insufficient';
  }

  if (contradictionScore > maxContradiction) {
    return 'disputed';
  }

  if (truthDisplay >= minTruth && independentSources >= minSources) {
    if (truthDisplay >= 0.9 && independentSources >= 2) {
      return 'verified';
    }
    return 'supported';
  }

  if (truthDisplay < 0.3) {
    return 'insufficient';
  }

  return 'disputed';
}

// ============================================================================
// SCOPE TEMPLATES
// ============================================================================
// Standard scope structures for different claim types

export const SCOPE_TEMPLATES = {
  engine_performance: {
    profile: 'engine_perf',
    fields: ['altitude', 'throttle', 'configuration', 'as_of'],
    required: ['altitude'],
    example: {
      profile: 'engine_perf',
      altitude: 'vac',       // 'vac' | 'sl' (vacuum | sea level)
      throttle: '100%',
      configuration: 'baseline',
      as_of: '2024-01-01',
    },
  },

  launch_vehicle_payload: {
    profile: 'lv_payload',
    fields: ['orbit', 'inclination_deg', 'reusability', 'as_of'],
    required: ['orbit'],
    example: {
      profile: 'lv_payload',
      orbit: 'LEO',          // 'LEO' | 'SSO' | 'GTO' | 'TLI' | 'TMI'
      inclination_deg: 28.5,
      reusability: 'expendable', // 'expendable' | 'reusable'
      as_of: '2024-01-01',
    },
  },

  standard_requirement: {
    profile: 'standard_req',
    fields: ['standard_id', 'clause', 'edition', 'as_of'],
    required: ['standard_id', 'clause'],
    example: {
      profile: 'standard_req',
      standard_id: 'ISO-14620',
      clause: '5.2.1',
      edition: '2020',
      as_of: '2024-01-01',
    },
  },

  domain_default: {
    profile: 'domain_default_v1',
    fields: ['field'],
    required: ['field'],
    example: {
      profile: 'domain_default_v1',
      field: 'engines.isp_s',
    },
  },
};
