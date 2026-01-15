/**
 * Cleanup script to remove or flag bad claims in truth_ledger
 * Also fixes incorrect values in public.engines
 */

import 'dotenv/config';
import postgres from 'postgres';
import { getDatabaseUrl } from '../config/database.js';
import { GROUND_TRUTH, GroundTruthValue, validateAgainstGroundTruth } from '../config/ground-truth.js';

const sql = postgres(getDatabaseUrl());

// Validation rules for engine claims
const VALIDATION_RULES = {
  'engines.thrust_n': {
    min: 10000,           // 10 kN minimum
    max: 10000000,        // 10 MN maximum (F-1 is ~6.7 MN)
    description: 'Single engine thrust in Newtons',
  },
  'engines.isp_s': {
    min: 150,             // Minimum practical ISP
    max: 470,             // Maximum for chemical rockets (LH2/LOX)
    description: 'Specific impulse in seconds',
  },
  'engines.mass_kg': {
    min: 15,              // Smallest practical engine
    max: 10000,           // Largest engine (RD-170 ~9500kg)
    description: 'Engine dry mass in kg',
  },
  'engines.chamber_pressure_bar': {
    min: 10,              // Low pressure engines
    max: 400,             // High performance engines
    description: 'Chamber pressure in bar',
  },
};

interface BadClaim {
  claim_id: string;
  entity_name: string;
  attribute_name: string;
  value: number;
  issue: string;
  action: 'delete' | 'flag' | 'fix';
  suggested_value?: number;
}

async function findBadClaims(): Promise<BadClaim[]> {
  console.log('Scanning for bad claims...\n');

  const badClaims: BadClaim[] = [];

  // Get all claims with their entity and attribute info
  const claims = await sql`
    SELECT
      c.id as claim_id,
      e.canonical_name as entity_name,
      a.canonical_name as attribute_name,
      c.value_json
    FROM truth_ledger.claims c
    JOIN truth_ledger.entities e ON c.entity_id = e.id
    JOIN truth_ledger.attributes a ON c.attribute_id = a.id
    WHERE e.entity_type = 'engine'
      AND a.canonical_name IN (
        'engines.thrust_n', 'engines.isp_s', 'engines.mass_kg', 'engines.chamber_pressure_bar'
      )
  `;

  for (const claim of claims) {
    const value = claim.value_json?.value;
    if (typeof value !== 'number' || isNaN(value)) continue;

    const attrName = claim.attribute_name as keyof typeof VALIDATION_RULES;
    const rules = VALIDATION_RULES[attrName];
    if (!rules) continue;

    let issue: string | null = null;
    let action: 'delete' | 'flag' | 'fix' = 'flag';
    let suggestedValue: number | undefined;

    // Check against validation rules
    if (value < rules.min) {
      issue = `Value ${value} is below minimum ${rules.min}`;
      action = 'delete';
    } else if (value > rules.max) {
      issue = `Value ${value} exceeds maximum ${rules.max}`;
      action = 'delete';
    }

    // Check against ground truth if available
    const gtCheck = validateAgainstGroundTruth(
      claim.entity_name,
      claim.attribute_name,
      value
    );

    if (gtCheck.matched && !gtCheck.withinTolerance && gtCheck.deviation !== null) {
      if (gtCheck.deviation > 0.5) {
        // More than 50% off - likely wrong
        issue = `Value ${value} deviates ${(gtCheck.deviation * 100).toFixed(1)}% from ground truth ${gtCheck.groundTruth?.value}`;
        action = 'delete';
        suggestedValue = gtCheck.groundTruth?.value;
      } else if (gtCheck.deviation > 0.2) {
        // 20-50% off - flag for review
        issue = `Value ${value} deviates ${(gtCheck.deviation * 100).toFixed(1)}% from ground truth ${gtCheck.groundTruth?.value}`;
        action = 'flag';
        suggestedValue = gtCheck.groundTruth?.value;
      }
    }

    // Special checks for common errors
    if (claim.attribute_name === 'engines.thrust_n') {
      const entityLower = claim.entity_name.toLowerCase();

      // Check for stage thrust confusion
      if (entityLower.includes('merlin') && value > 3000000) {
        issue = `Thrust ${(value/1e6).toFixed(1)} MN is likely total Falcon 9 stage thrust, not single Merlin (~845 kN)`;
        action = 'delete';
      } else if (entityLower.includes('raptor') && value > 5000000) {
        issue = `Thrust ${(value/1e6).toFixed(1)} MN is likely total stage thrust, not single Raptor (~2.2 MN)`;
        action = 'delete';
      } else if ((entityLower.includes('rs-25') || entityLower.includes('ssme')) && value > 5000000) {
        issue = `Thrust ${(value/1e6).toFixed(1)} MN is likely total SLS core stage thrust, not single RS-25 (~2 MN)`;
        action = 'delete';
      }
    }

    if (claim.attribute_name === 'engines.isp_s' && value > 500) {
      issue = `ISP ${value}s is impossible for chemical rockets (max ~470s)`;
      action = 'delete';
    }

    if (claim.attribute_name === 'engines.mass_kg' && value > 12000) {
      issue = `Mass ${value} kg exceeds largest known engine (RD-170 at ~9500 kg)`;
      action = 'delete';
    }

    if (issue) {
      badClaims.push({
        claim_id: claim.claim_id,
        entity_name: claim.entity_name,
        attribute_name: claim.attribute_name,
        value,
        issue,
        action,
        suggested_value: suggestedValue,
      });
    }
  }

  return badClaims;
}

async function cleanupBadClaims(badClaims: BadClaim[], dryRun = true): Promise<void> {
  console.log(`\nFound ${badClaims.length} problematic claims\n`);

  const toDelete = badClaims.filter(c => c.action === 'delete');
  const toFlag = badClaims.filter(c => c.action === 'flag');

  console.log(`Claims to delete: ${toDelete.length}`);
  console.log(`Claims to flag for review: ${toFlag.length}\n`);

  // Group by issue type
  console.log('=== Claims to DELETE ===');
  for (const claim of toDelete) {
    console.log(`  ${claim.entity_name} | ${claim.attribute_name}`);
    console.log(`    Value: ${claim.value}`);
    console.log(`    Issue: ${claim.issue}`);
    if (claim.suggested_value) {
      console.log(`    Suggested: ${claim.suggested_value}`);
    }
    console.log('');
  }

  if (!dryRun && toDelete.length > 0) {
    console.log('\nDeleting bad claims...');
    for (const claim of toDelete) {
      // First delete evidence for this claim
      await sql`DELETE FROM truth_ledger.evidence WHERE claim_id = ${claim.claim_id}`;
      // Then delete the claim
      await sql`DELETE FROM truth_ledger.claims WHERE id = ${claim.claim_id}`;
    }
    console.log(`Deleted ${toDelete.length} claims and their evidence`);
  }

  console.log('\n=== Claims to FLAG ===');
  for (const claim of toFlag) {
    console.log(`  ${claim.entity_name} | ${claim.attribute_name}`);
    console.log(`    Value: ${claim.value}`);
    console.log(`    Issue: ${claim.issue}`);
    if (claim.suggested_value) {
      console.log(`    Suggested: ${claim.suggested_value}`);
    }
    console.log('');
  }
}

async function fixPublicEngines(dryRun = true): Promise<void> {
  console.log('\n=== Fixing public.engines bad values ===\n');

  // Get all engines with potentially bad values
  const engines = await sql`
    SELECT id, name, thrust_n, isp_s, mass_kg, chamber_pressure_bar
    FROM public.engines
  `;

  const fixes: Array<{ id: number; name: string; field: string; oldValue: number; newValue: number | null; reason: string }> = [];

  for (const engine of engines) {
    const name = engine.name.toLowerCase();

    // Check ISP
    if (engine.isp_s && engine.isp_s > 500) {
      fixes.push({
        id: engine.id,
        name: engine.name,
        field: 'isp_s',
        oldValue: engine.isp_s,
        newValue: null,
        reason: `ISP ${engine.isp_s}s is impossible for chemical rockets`,
      });
    }

    // Check mass
    if (engine.mass_kg && engine.mass_kg > 12000) {
      fixes.push({
        id: engine.id,
        name: engine.name,
        field: 'mass_kg',
        oldValue: engine.mass_kg,
        newValue: null,
        reason: `Mass ${engine.mass_kg} kg exceeds largest known engine`,
      });
    }

    // Check thrust for known engines
    if (engine.thrust_n) {
      if (name.includes('raptor') && engine.thrust_n > 5000000) {
        fixes.push({
          id: engine.id,
          name: engine.name,
          field: 'thrust_n',
          oldValue: engine.thrust_n,
          newValue: null,
          reason: `Thrust ${(engine.thrust_n/1e6).toFixed(1)} MN is likely stage thrust, not single engine`,
        });
      }
      if ((name.includes('ssme') || name.includes('rs-25')) && engine.thrust_n > 5000000) {
        fixes.push({
          id: engine.id,
          name: engine.name,
          field: 'thrust_n',
          oldValue: engine.thrust_n,
          newValue: null,
          reason: `Thrust ${(engine.thrust_n/1e6).toFixed(1)} MN is likely stage thrust, not single RS-25`,
        });
      }
    }

    // Check for ground truth values and apply if close
    const gtValues = GROUND_TRUTH.filter((gt: GroundTruthValue) =>
      gt.entityName.toLowerCase() === name ||
      name.includes(gt.entityName.toLowerCase())
    );

    for (const gt of gtValues) {
      const currentValue = engine[gt.attributeName.replace('engines.', '') as keyof typeof engine] as number;
      if (currentValue) {
        const deviation = Math.abs(currentValue - gt.value) / gt.value;
        if (deviation > 0.5) {
          // More than 50% off - might want to fix with ground truth
          fixes.push({
            id: engine.id,
            name: engine.name,
            field: gt.attributeName.replace('engines.', ''),
            oldValue: currentValue,
            newValue: gt.value,
            reason: `Value ${currentValue} deviates ${(deviation*100).toFixed(0)}% from official value ${gt.value}`,
          });
        }
      }
    }
  }

  console.log(`Found ${fixes.length} values to fix:\n`);
  for (const fix of fixes) {
    console.log(`  ${fix.name} | ${fix.field}`);
    console.log(`    Current: ${fix.oldValue}`);
    console.log(`    New: ${fix.newValue ?? 'NULL'}`);
    console.log(`    Reason: ${fix.reason}`);
    console.log('');
  }

  if (!dryRun && fixes.length > 0) {
    console.log('\nApplying fixes...');
    for (const fix of fixes) {
      if (fix.field === 'thrust_n') {
        await sql`UPDATE public.engines SET thrust_n = ${fix.newValue}, updated_at = NOW() WHERE id = ${fix.id}`;
      } else if (fix.field === 'isp_s') {
        await sql`UPDATE public.engines SET isp_s = ${fix.newValue}, updated_at = NOW() WHERE id = ${fix.id}`;
      } else if (fix.field === 'mass_kg') {
        await sql`UPDATE public.engines SET mass_kg = ${fix.newValue}, updated_at = NOW() WHERE id = ${fix.id}`;
      } else if (fix.field === 'chamber_pressure_bar') {
        await sql`UPDATE public.engines SET chamber_pressure_bar = ${fix.newValue}, updated_at = NOW() WHERE id = ${fix.id}`;
      }
    }
    console.log(`Applied ${fixes.length} fixes`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  if (dryRun) {
    console.log('=== DRY RUN MODE (use --apply to make changes) ===\n');
  } else {
    console.log('=== APPLYING CHANGES ===\n');
  }

  try {
    // Find and cleanup bad claims
    const badClaims = await findBadClaims();
    await cleanupBadClaims(badClaims, dryRun);

    // Fix public.engines
    await fixPublicEngines(dryRun);

    if (dryRun) {
      console.log('\n=== Run with --apply to make changes ===');
    }
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
