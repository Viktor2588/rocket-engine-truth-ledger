/**
 * Tests for Extractor Service
 * Validates regex patterns, unit conversions, and claim extraction
 */

import { describe, it, expect } from 'vitest';
import {
  NumericExtractor,
  IspExtractor,
  ThrustExtractor,
  MassExtractor,
  ChamberPressureExtractor,
  PayloadLeoExtractor,
} from './extractor.js';
import type { Entity, Attribute, Snippet } from '../types/index.js';

// Mock entity for testing
const mockEngine: Entity = {
  id: 'test-engine-id',
  entityType: 'engine',
  canonicalName: 'Raptor 2',
  engineId: 1,
  launchVehicleId: null,
  countryId: null,
  aliases: ['Raptor', 'SpaceX Raptor'],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAttribute: Attribute = {
  id: 'test-attr-id',
  canonicalName: 'engines.isp_s',
  displayName: 'Specific Impulse',
  valueType: 'number',
  unit: 's',
  description: 'Engine specific impulse in seconds',
  toleranceAbs: 1.0,
  toleranceRel: 0.01,
  metadata: {},
  createdAt: new Date(),
};

// Helper to create mock snippets
function createSnippet(text: string, type: 'text' | 'table' = 'text'): Snippet {
  return {
    id: 'test-snippet-id',
    documentId: 'test-doc-id',
    locator: 'section:test',
    text,
    snippetHash: 'test-hash',
    snippetType: type,
    metadata: {},
    createdAt: new Date(),
  };
}

describe('IspExtractor', () => {
  describe('basic ISP patterns', () => {
    it('should extract "ISP: 350 s" format', () => {
      const snippet = createSnippet('The Raptor 2 engine has an ISP: 350 s in vacuum conditions.');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBe(350);
      expect(claims[0].unit).toBe('s');
    });

    it('should extract "specific impulse: 327 seconds" format', () => {
      const snippet = createSnippet('Raptor 2 achieves a specific impulse: 327 seconds at sea level.');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBe(327);
    });

    it('should extract "Isp of 363 s" format', () => {
      const snippet = createSnippet('The engine delivers an Isp of 363 s.');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBe(363);
    });

    it('should extract "330 s specific impulse" format', () => {
      const snippet = createSnippet('With a 330 s specific impulse, the Raptor 2 is efficient.');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBe(330);
    });

    it('should extract decimal ISP values', () => {
      const snippet = createSnippet('ISP: 335.1 seconds');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBeCloseTo(335.1, 1);
    });
  });

  describe('scope inference', () => {
    it('should detect vacuum context', () => {
      // Pattern needs "ISP" keyword with value
      const snippet = createSnippet('Vacuum: 363 s specific impulse for the Raptor 2.');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].scope).toHaveProperty('altitude', 'vac');
    });

    it('should detect sea level context', () => {
      const snippet = createSnippet('Sea level: 327 s ISP rating.');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].scope).toHaveProperty('altitude', 'sl');
    });

    it('should detect throttle context', () => {
      // Throttle is detected from text context, not from the match itself
      const snippet = createSnippet('ISP: 340 s at 80% throttle.');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].scope).toHaveProperty('throttle', '80%');
    });
  });

  describe('confidence scoring', () => {
    it('should have higher confidence when entity name is nearby', () => {
      const withName = createSnippet('The Raptor 2 engine has an ISP of 350 s.');
      const withoutName = createSnippet('This engine has an ISP of 350 s.');

      const claimsWithName = IspExtractor.extract(withName, mockEngine, mockAttribute);
      const claimsWithoutName = IspExtractor.extract(withoutName, mockEngine, mockAttribute);

      expect(claimsWithName[0].confidence).toBeGreaterThan(claimsWithoutName[0].confidence);
    });

    it('should have higher confidence for table snippets', () => {
      const tableSnippet = createSnippet('ISP: 350 s', 'table');
      const paragraphSnippet = createSnippet('ISP: 350 s', 'text');

      const tableClaims = IspExtractor.extract(tableSnippet, mockEngine, mockAttribute);
      const paragraphClaims = IspExtractor.extract(paragraphSnippet, mockEngine, mockAttribute);

      expect(tableClaims[0].confidence).toBeGreaterThan(paragraphClaims[0].confidence);
    });

    it('should cap confidence at 0.95', () => {
      const snippet = createSnippet('Raptor 2 ISP: 350 s', 'table');
      const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

      expect(claims[0].confidence).toBeLessThanOrEqual(0.95);
    });
  });
});

describe('ThrustExtractor', () => {
  const thrustAttribute: Attribute = {
    ...mockAttribute,
    id: 'thrust-attr-id',
    canonicalName: 'engines.thrust_n',
    displayName: 'Thrust',
    unit: 'N',
  };

  describe('basic thrust patterns', () => {
    it('should extract "thrust: 2,400 kN" format', () => {
      const snippet = createSnippet('The Raptor 2 produces thrust: 2,400 kN at sea level.');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBe(2400000); // 2400 kN = 2,400,000 N
      expect(claims[0].unit).toBe('N');
    });

    it('should extract "2.23 MN thrust" format', () => {
      const snippet = createSnippet('Producing 2.23 MN thrust, the Raptor 2 is powerful.');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBe(2230000);
    });

    it('should convert lbf to Newtons', () => {
      const snippet = createSnippet('Thrust: 500,000 lbf');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims.length).toBeGreaterThan(0);
      // 500,000 lbf * 4.44822 = 2,224,110 N
      expect(claims[0].value).toBeCloseTo(2224110, -2);
    });

    it('should handle parenthetical conversions', () => {
      const snippet = createSnippet('The engine produces 2.23 MN (501,000 lbf) of thrust.');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('unit conversions', () => {
    it('should correctly convert kN to N', () => {
      const snippet = createSnippet('Thrust: 1000 kN');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims[0].value).toBe(1000000);
    });

    it('should correctly convert MN to N', () => {
      const snippet = createSnippet('Thrust: 2 MN');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims[0].value).toBe(2000000);
    });

    it('should handle raw Newtons', () => {
      const snippet = createSnippet('Thrust: 2000000 N');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims[0].value).toBe(2000000);
    });
  });

  describe('comma-separated numbers', () => {
    it('should handle large numbers with commas', () => {
      const snippet = createSnippet('Maximum thrust: 2,224,000 N');
      const claims = ThrustExtractor.extract(snippet, mockEngine, thrustAttribute);

      expect(claims.length).toBeGreaterThan(0);
      expect(claims[0].value).toBe(2224000);
    });
  });
});

describe('MassExtractor', () => {
  const massAttribute: Attribute = {
    ...mockAttribute,
    id: 'mass-attr-id',
    canonicalName: 'engines.mass_kg',
    displayName: 'Mass',
    unit: 'kg',
  };

  it('should extract "mass: 1,600 kg" format', () => {
    const snippet = createSnippet('The Raptor 2 has a mass: 1,600 kg dry weight.');
    const claims = MassExtractor.extract(snippet, mockEngine, massAttribute);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].value).toBe(1600);
  });

  it('should convert tonnes to kg', () => {
    const snippet = createSnippet('Mass: 1.6 t');
    const claims = MassExtractor.extract(snippet, mockEngine, massAttribute);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].value).toBe(1600);
  });

  it('should convert pounds to kg', () => {
    const snippet = createSnippet('The engine weighs 3,500 lbs dry.');
    const claims = MassExtractor.extract(snippet, mockEngine, massAttribute);

    expect(claims.length).toBeGreaterThan(0);
    // 3500 lbs * 0.453592 = 1587.572 kg
    expect(claims[0].value).toBeCloseTo(1587.57, 0);
  });
});

describe('ChamberPressureExtractor', () => {
  const pressureAttribute: Attribute = {
    ...mockAttribute,
    id: 'pressure-attr-id',
    canonicalName: 'engines.chamber_pressure_bar',
    displayName: 'Chamber Pressure',
    unit: 'bar',
  };

  it('should extract "chamber pressure: 300 bar" format', () => {
    const snippet = createSnippet('Raptor 2 operates at a chamber pressure: 300 bar.');
    const claims = ChamberPressureExtractor.extract(snippet, mockEngine, pressureAttribute);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].value).toBe(300);
  });

  it('should convert MPa to bar', () => {
    const snippet = createSnippet('Chamber pressure: 30 MPa');
    const claims = ChamberPressureExtractor.extract(snippet, mockEngine, pressureAttribute);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].value).toBe(300); // 30 MPa = 300 bar
  });

  it('should convert PSI to bar', () => {
    const snippet = createSnippet('Chamber pressure: 4350 PSI');
    const claims = ChamberPressureExtractor.extract(snippet, mockEngine, pressureAttribute);

    expect(claims.length).toBeGreaterThan(0);
    // 4350 PSI * 0.0689476 = 299.92 bar
    expect(claims[0].value).toBeCloseTo(300, 0);
  });
});

describe('PayloadLeoExtractor', () => {
  const payloadAttribute: Attribute = {
    ...mockAttribute,
    id: 'payload-attr-id',
    canonicalName: 'launch_vehicles.payload_to_leo_kg',
    displayName: 'Payload to LEO',
    unit: 'kg',
  };

  const mockLaunchVehicle: Entity = {
    id: 'test-lv-id',
    entityType: 'launch_vehicle',
    canonicalName: 'Falcon 9',
    engineId: null,
    launchVehicleId: 1,
    countryId: null,
    aliases: ['F9'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should extract "payload to LEO: 22,800 kg" format', () => {
    const snippet = createSnippet('Falcon 9 payload to LEO: 22,800 kg reusable.');
    const claims = PayloadLeoExtractor.extract(snippet, mockLaunchVehicle, payloadAttribute);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].value).toBe(22800);
  });

  it('should extract "~25,000 kg to LEO" format', () => {
    const snippet = createSnippet('Capable of lifting ~25,000 kg to LEO.');
    const claims = PayloadLeoExtractor.extract(snippet, mockLaunchVehicle, payloadAttribute);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].value).toBe(25000);
  });

  it('should convert tonnes to kg', () => {
    const snippet = createSnippet('Payload capacity to low Earth orbit: 22.8 t');
    const claims = PayloadLeoExtractor.extract(snippet, mockLaunchVehicle, payloadAttribute);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0].value).toBe(22800);
  });
});

describe('NumericExtractor edge cases', () => {
  it('should not extract invalid numbers', () => {
    const snippet = createSnippet('The ISP is approximately good.');
    const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

    expect(claims.length).toBe(0);
  });

  it('should handle multiple values in same snippet', () => {
    // Use multiple distinct patterns the extractor matches
    const snippet = createSnippet('ISP: 327 s at sea level. The engine also achieves specific impulse: 363 s in vacuum.');
    const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

    // Should extract at least 2 claims from different patterns
    expect(claims.length).toBeGreaterThanOrEqual(2);

    const values = claims.map((c) => c.value);
    expect(values).toContain(327);
    expect(values).toContain(363);
  });

  it('should include quote context in claims', () => {
    const snippet = createSnippet('The Raptor 2 engine has an ISP: 350 s in vacuum conditions.');
    const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

    expect(claims[0].quote).toContain('ISP');
    expect(claims[0].quote).toContain('350');
  });

  it('should set correct value type', () => {
    const snippet = createSnippet('ISP: 350 s');
    const claims = IspExtractor.extract(snippet, mockEngine, mockAttribute);

    expect(claims[0].valueType).toBe('number');
  });
});
