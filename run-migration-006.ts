import postgres from 'postgres';
import fs from 'fs';

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  // Run just the new migration
  const migration = fs.readFileSync('src/db/migrations/006_extractor_patterns.sql', 'utf-8');
  await sql.unsafe(migration);
  console.log('Migration 006 applied successfully!');

  // Check what was created
  const patterns = await sql`SELECT name, attribute_pattern FROM truth_ledger_claude.extractor_patterns`;
  console.log('Extractor patterns:', patterns.length);
  for (const p of patterns) {
    console.log('  -', p.name, '->', p.attribute_pattern);
  }

  await sql.end();
}

run().catch(console.error);
