/**
 * Tests for Truth Ledger configuration constants and scoring functions
 */

import { describe, it, expect } from 'vitest';
import {
  computeClusterWeight,
  computeRecencyScore,
  computeTruthDisplay,
  computeGamma,
  computeDisplayStatus,
  valuesAreConflicting,
  interpolateSliderValue,
  DOC_TYPE_MULTIPLIER,
  LOW_QUALITY_DOC_TYPES,
  RECENCY_CONFIG,
} from './constants.js';

describe('computeClusterWeight', () => {
  it('should return 1.0 for first source in cluster', () => {
    expect(computeClusterWeight(1)).toBe(1.0);
  });

  it('should return diminishing weight for subsequent sources', () => {
    expect(computeClusterWeight(2)).toBeCloseTo(0.667, 2);
    expect(computeClusterWeight(3)).toBe(0.5);
    expect(computeClusterWeight(4)).toBeCloseTo(0.4, 2);
  });

  it('should handle edge case of 0 or negative', () => {
    expect(computeClusterWeight(0)).toBe(1.0);
    expect(computeClusterWeight(-1)).toBe(1.0);
  });

  it('should always return positive weight', () => {
    for (let i = 1; i <= 100; i++) {
      expect(computeClusterWeight(i)).toBeGreaterThan(0);
    }
  });
});

describe('computeRecencyScore', () => {
  const now = new Date('2024-01-15');

  it('should return minimum score for null published date', () => {
    expect(computeRecencyScore(null, now)).toBe(RECENCY_CONFIG.minScore);
  });

  it('should return ~1.0 for recently published documents', () => {
    const yesterday = new Date('2024-01-14');
    const score = computeRecencyScore(yesterday, now);
    expect(score).toBeGreaterThan(0.99);
  });

  it('should return ~0.5 after one half-life', () => {
    const halfLifeAgo = new Date(now.getTime() - RECENCY_CONFIG.halfLifeDays * 24 * 60 * 60 * 1000);
    const score = computeRecencyScore(halfLifeAgo, now);
    expect(score).toBeCloseTo(0.5, 1);
  });

  it('should apply superseded penalty', () => {
    const recentDate = new Date('2024-01-10');
    const normalScore = computeRecencyScore(recentDate, now, false);
    const supersededScore = computeRecencyScore(recentDate, now, true);

    expect(supersededScore).toBe(normalScore * RECENCY_CONFIG.supersededPenalty);
  });

  it('should never drop below minimum score', () => {
    const veryOldDate = new Date('1990-01-01');
    const score = computeRecencyScore(veryOldDate, now);
    expect(score).toBe(RECENCY_CONFIG.minScore);
  });

  it('should handle superseded very old documents', () => {
    const veryOldDate = new Date('1990-01-01');
    const score = computeRecencyScore(veryOldDate, now, true);
    // Should still respect minimum after penalty
    expect(score).toBe(RECENCY_CONFIG.minScore);
  });
});

describe('computeGamma', () => {
  it('should return 2.2 for conservative slider (0)', () => {
    expect(computeGamma(0)).toBe(2.2);
  });

  it('should return 1.0 for balanced slider (0.5)', () => {
    expect(computeGamma(0.5)).toBe(1.0);
  });

  it('should return 0.6 for assertive slider (1)', () => {
    expect(computeGamma(1.0)).toBe(0.6);
  });

  it('should interpolate for intermediate values', () => {
    const gamma = computeGamma(0.25);
    expect(gamma).toBeCloseTo(1.6, 1);
  });
});

describe('computeTruthDisplay', () => {
  it('should return truth_raw when gamma is 1.0', () => {
    const truthRaw = 0.7;
    const display = computeTruthDisplay(truthRaw, 0.5); // gamma = 1.0
    expect(display).toBeCloseTo(truthRaw, 5);
  });

  it('should compress values with high gamma (conservative)', () => {
    const truthRaw = 0.8;
    const display = computeTruthDisplay(truthRaw, 0); // gamma = 2.2
    expect(display).toBeLessThan(truthRaw);
  });

  it('should expand values with low gamma (assertive)', () => {
    const truthRaw = 0.5;
    const display = computeTruthDisplay(truthRaw, 1.0); // gamma = 0.6
    expect(display).toBeGreaterThan(truthRaw);
  });

  it('should handle edge values', () => {
    expect(computeTruthDisplay(0, 0.5)).toBe(0);
    expect(computeTruthDisplay(1, 0.5)).toBe(1);
  });
});

describe('computeDisplayStatus', () => {
  it('should return verified for high confidence with multiple sources', () => {
    const status = computeDisplayStatus(0.95, 3, 0.05, 0.5);
    expect(status).toBe('verified');
  });

  it('should return supported for moderate confidence', () => {
    const status = computeDisplayStatus(0.75, 2, 0.1, 0.5);
    expect(status).toBe('supported');
  });

  it('should return disputed when contradiction is high', () => {
    const status = computeDisplayStatus(0.8, 2, 0.5, 0.5);
    expect(status).toBe('disputed');
  });

  it('should return insufficient for single source', () => {
    const status = computeDisplayStatus(0.9, 0, 0.0, 0.5);
    expect(status).toBe('insufficient');
  });

  it('should return insufficient for very low truth', () => {
    const status = computeDisplayStatus(0.2, 2, 0.1, 0.5);
    expect(status).toBe('insufficient');
  });

  it('should respect slider position (conservative)', () => {
    // With conservative slider, higher bar for verified
    const status = computeDisplayStatus(0.8, 2, 0.1, 0.0);
    expect(status).toBe('disputed'); // Needs 0.85+ for supported at slider=0
  });

  it('should respect slider position (assertive)', () => {
    // With assertive slider, lower bar for supported
    const status = computeDisplayStatus(0.5, 1, 0.2, 1.0);
    expect(status).toBe('supported');
  });
});

describe('valuesAreConflicting', () => {
  it('should not flag values within relative tolerance', () => {
    // ISP has 1% relative tolerance
    const result = valuesAreConflicting(300, 302, 'engines.isp_s');
    expect(result).toBe(false);
  });

  it('should flag values outside relative tolerance', () => {
    // ISP has 1% relative tolerance
    const result = valuesAreConflicting(300, 310, 'engines.isp_s');
    expect(result).toBe(true);
  });

  it('should use absolute tolerance when applicable', () => {
    // ISP has 1.0 absolute tolerance
    const result = valuesAreConflicting(50, 50.5, 'engines.isp_s');
    expect(result).toBe(false);
  });

  it('should handle thrust with 2% tolerance', () => {
    const baseThrustN = 2000000; // 2MN
    const withinTolerance = baseThrustN * 1.015; // 1.5% difference
    const outsideTolerance = baseThrustN * 1.03; // 3% difference

    expect(valuesAreConflicting(baseThrustN, withinTolerance, 'engines.thrust_n')).toBe(false);
    expect(valuesAreConflicting(baseThrustN, outsideTolerance, 'engines.thrust_n')).toBe(true);
  });

  it('should use default tolerance for unknown attributes', () => {
    // Default is 2% relative
    const result = valuesAreConflicting(100, 101, 'unknown.attribute');
    expect(result).toBe(false);

    const result2 = valuesAreConflicting(100, 105, 'unknown.attribute');
    expect(result2).toBe(true);
  });
});

describe('interpolateSliderValue', () => {
  const testPoints = [
    { slider: 0.0, value: 10 },
    { slider: 0.5, value: 5 },
    { slider: 1.0, value: 2 },
  ];

  it('should return exact value at defined points', () => {
    expect(interpolateSliderValue(testPoints, 0)).toBe(10);
    expect(interpolateSliderValue(testPoints, 0.5)).toBe(5);
    expect(interpolateSliderValue(testPoints, 1.0)).toBe(2);
  });

  it('should interpolate between points', () => {
    expect(interpolateSliderValue(testPoints, 0.25)).toBe(7.5);
    expect(interpolateSliderValue(testPoints, 0.75)).toBe(3.5);
  });

  it('should clamp at boundaries', () => {
    expect(interpolateSliderValue(testPoints, -0.5)).toBe(10);
    expect(interpolateSliderValue(testPoints, 1.5)).toBe(2);
  });
});

describe('DOC_TYPE_MULTIPLIER', () => {
  it('should have highest multiplier for regulations', () => {
    expect(DOC_TYPE_MULTIPLIER.regulation).toBeGreaterThan(DOC_TYPE_MULTIPLIER.news_article);
    expect(DOC_TYPE_MULTIPLIER.regulation).toBeGreaterThan(DOC_TYPE_MULTIPLIER.wiki);
  });

  it('should have lower multipliers for informal sources', () => {
    expect(DOC_TYPE_MULTIPLIER.blog_post).toBeLessThan(DOC_TYPE_MULTIPLIER.technical_report);
    expect(DOC_TYPE_MULTIPLIER.social_media).toBeLessThan(DOC_TYPE_MULTIPLIER.blog_post);
  });

  it('should have all values between 0 and 2', () => {
    for (const [type, multiplier] of Object.entries(DOC_TYPE_MULTIPLIER)) {
      expect(multiplier).toBeGreaterThan(0);
      expect(multiplier).toBeLessThanOrEqual(2);
    }
  });
});

describe('LOW_QUALITY_DOC_TYPES', () => {
  it('should contain informal source types', () => {
    expect(LOW_QUALITY_DOC_TYPES.has('blog_post')).toBe(true);
    expect(LOW_QUALITY_DOC_TYPES.has('social_media')).toBe(true);
    expect(LOW_QUALITY_DOC_TYPES.has('wiki')).toBe(true);
  });

  it('should not contain official sources', () => {
    expect(LOW_QUALITY_DOC_TYPES.has('regulation')).toBe(false);
    expect(LOW_QUALITY_DOC_TYPES.has('peer_reviewed_paper')).toBe(false);
    expect(LOW_QUALITY_DOC_TYPES.has('manufacturer_datasheet')).toBe(false);
  });
});
