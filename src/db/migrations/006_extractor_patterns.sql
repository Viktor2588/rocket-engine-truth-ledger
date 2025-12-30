-- Migration: Add extractor patterns table for configurable extraction
-- This allows users to add/edit extraction patterns without code changes

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS truth_ledger_claude;

-- Create extractor_patterns table
CREATE TABLE IF NOT EXISTS truth_ledger_claude.extractor_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  attribute_pattern VARCHAR(100) NOT NULL,  -- e.g., 'engines.thrust_n', 'launch_vehicles.payload_to_leo_kg'
  entity_type VARCHAR(50),  -- 'engine', 'launch_vehicle', or NULL for all
  patterns JSONB NOT NULL DEFAULT '[]',  -- Array of regex patterns
  target_unit VARCHAR(20),  -- e.g., 'N', 's', 'kg'
  unit_conversions JSONB DEFAULT '{}',  -- Map of unit -> conversion factor
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,  -- Higher priority patterns checked first
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_extractor_patterns_attribute ON truth_ledger_claude.extractor_patterns(attribute_pattern);
CREATE INDEX IF NOT EXISTS idx_extractor_patterns_active ON truth_ledger_claude.extractor_patterns(is_active);
CREATE INDEX IF NOT EXISTS idx_extractor_patterns_entity_type ON truth_ledger_claude.extractor_patterns(entity_type);

-- Insert default patterns (matching current hardcoded extractors)
INSERT INTO truth_ledger_claude.extractor_patterns (name, description, attribute_pattern, entity_type, patterns, target_unit, unit_conversions, priority) VALUES
-- ISP Extractor
('ISP Extractor', 'Extracts specific impulse (ISP) values in seconds', 'engines.isp_s', 'engine',
 '[
   "(?:isp|specific\\s+impulse)[:\\s]+(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)?",
   "(\\d{2,3}(?:\\.\\d+)?)\\s*(s|seconds?)\\s+(?:isp|specific\\s+impulse)",
   "isp\\s*(?:sl|sea\\s*level|vac|vacuum)?[:\\s]*(\\d+(?:\\.\\d+)?)\\s*(s)?",
   "specific\\s+impulse[^:]*:\\s*(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)",
   "(?:sea\\s*level|vacuum|vac|sl):\\s*(\\d{2,3}(?:\\.\\d+)?)\\s*(s|seconds?)(?:\\s*\\(|$|\\s)",
   "isp\\s+(?:of\\s+)?(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)"
 ]'::jsonb,
 's',
 '{"s": 1, "seconds": 1, "second": 1}'::jsonb,
 100),

-- Thrust Extractor
('Thrust Extractor', 'Extracts thrust values and converts to Newtons', 'engines.thrust_n', 'engine',
 '[
   "(?:thrust)[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(n|kn|mn|lbf|klbf)?",
   "(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(n|kn|mn|lbf|klbf)\\s+(?:thrust|of\\s+thrust)",
   "(?:maximum\\s+)?thrust[^:]*:\\s*(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(n|kn|mn|lbf)?",
   "(?:total\\s+)?thrust\\s+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(n|kn|mn|lbf)?",
   "(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kn|mn)\\s*(?:\\(|thrust|$)",
   "thrust\\s+(?:of\\s+)?(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kilonewtons?|meganewtons?|newtons?)",
   "(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kilonewtons?|meganewtons?|newtons?|kn|mn|lbf)",
   "\\((\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(lbf)\\)"
 ]'::jsonb,
 'N',
 '{"n": 1, "kn": 1000, "mn": 1000000, "lbf": 4.44822, "klbf": 4448.22, "newtons": 1, "kilonewtons": 1000, "kilonewton": 1000, "meganewtons": 1000000, "meganewton": 1000000}'::jsonb,
 100),

-- Mass Extractor
('Mass Extractor', 'Extracts mass/weight values and converts to kg', 'engines.mass_kg', 'engine',
 '[
   "(?:mass|weight)[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t|lb|lbs)?",
   "(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t|lb|lbs)\\s+(?:mass|weight|dry)"
 ]'::jsonb,
 'kg',
 '{"kg": 1, "t": 1000, "lb": 0.453592, "lbs": 0.453592}'::jsonb,
 100),

-- Chamber Pressure Extractor
('Chamber Pressure Extractor', 'Extracts chamber pressure values and converts to bar', 'engines.chamber_pressure_bar', 'engine',
 '[
   "(?:chamber\\s+pressure)[:\\s]+(\\d+(?:\\.\\d+)?)\\s*(bar|mpa|psi)?",
   "(\\d+(?:\\.\\d+)?)\\s*(bar|mpa|psi)\\s+(?:chamber\\s+pressure)"
 ]'::jsonb,
 'bar',
 '{"bar": 1, "mpa": 10, "psi": 0.0689476}'::jsonb,
 100),

-- Payload to LEO Extractor
('Payload to LEO Extractor', 'Extracts payload capacity to Low Earth Orbit', 'launch_vehicles.payload_to_leo_kg', 'launch_vehicle',
 '[
   "(?:payload|capacity)\\s+(?:to\\s+)?(?:leo|low\\s+earth\\s+orbit)[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)?",
   "(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)\\s+(?:to\\s+)?(?:leo|low\\s+earth\\s+orbit)",
   "payload[^)]*leo[^)]*\\)[^~]*~?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)?",
   "~?\\s*(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)\\s+(?:to\\s+)?leo"
 ]'::jsonb,
 'kg',
 '{"kg": 1, "t": 1000}'::jsonb,
 100),

-- Payload to GTO Extractor (NEW)
('Payload to GTO Extractor', 'Extracts payload capacity to Geostationary Transfer Orbit', 'launch_vehicles.payload_to_gto_kg', 'launch_vehicle',
 '[
   "(?:payload|capacity)\\s+(?:to\\s+)?(?:gto|geostationary\\s+transfer)[:\\s]+(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)?",
   "(\\d+(?:,\\d{3})*(?:\\.\\d+)?)\\s*(kg|t)\\s+(?:to\\s+)?(?:gto|geostationary)"
 ]'::jsonb,
 'kg',
 '{"kg": 1, "t": 1000}'::jsonb,
 90),

-- Diameter Extractor (NEW)
('Diameter Extractor', 'Extracts rocket/engine diameter', 'engines.diameter_m', NULL,
 '[
   "(?:diameter)[:\\s]+(\\d+(?:\\.\\d+)?)\\s*(m|cm|mm|ft)?",
   "(\\d+(?:\\.\\d+)?)\\s*(m|meters?)\\s+(?:diameter|wide)"
 ]'::jsonb,
 'm',
 '{"m": 1, "cm": 0.01, "mm": 0.001, "ft": 0.3048, "meters": 1, "meter": 1}'::jsonb,
 80),

-- Height/Length Extractor (NEW)
('Height Extractor', 'Extracts rocket/stage height or length', 'launch_vehicles.height_m', 'launch_vehicle',
 '[
   "(?:height|length|tall)[:\\s]+(\\d+(?:\\.\\d+)?)\\s*(m|ft)?",
   "(\\d+(?:\\.\\d+)?)\\s*(m|meters?)\\s+(?:tall|high|long)"
 ]'::jsonb,
 'm',
 '{"m": 1, "ft": 0.3048, "meters": 1, "meter": 1}'::jsonb,
 80),

-- Burn Time Extractor (NEW)
('Burn Time Extractor', 'Extracts engine burn duration', 'engines.burn_time_s', 'engine',
 '[
   "(?:burn\\s+time|burn\\s+duration)[:\\s]+(\\d+(?:\\.\\d+)?)\\s*(s|seconds?|min|minutes?)?",
   "(\\d+(?:\\.\\d+)?)\\s*(s|seconds?)\\s+(?:burn|firing)"
 ]'::jsonb,
 's',
 '{"s": 1, "seconds": 1, "second": 1, "min": 60, "minutes": 60, "minute": 60}'::jsonb,
 80),

-- Thrust-to-Weight Ratio Extractor (NEW)
('TWR Extractor', 'Extracts thrust-to-weight ratio', 'engines.twr', 'engine',
 '[
   "(?:thrust[\\s-]to[\\s-]weight|t/w|twr)[:\\s]+(\\d+(?:\\.\\d+)?)",
   "(\\d+(?:\\.\\d+)?)\\s*(?:thrust[\\s-]to[\\s-]weight|t/w)"
 ]'::jsonb,
 NULL,
 '{}'::jsonb,
 70)

ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_extractor_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS extractor_patterns_updated_at ON truth_ledger_claude.extractor_patterns;
CREATE TRIGGER extractor_patterns_updated_at
  BEFORE UPDATE ON truth_ledger_claude.extractor_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_extractor_patterns_updated_at();
