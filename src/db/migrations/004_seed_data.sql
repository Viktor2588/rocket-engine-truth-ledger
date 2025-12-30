-- Migration: 004_seed_data
-- Description: Seed entities from domain tables and create initial attributes
-- This creates the bridge between domain tables and truth_ledger

-- ============================================================================
-- BACKFILL ENTITIES FROM DOMAIN TABLES
-- ============================================================================

-- Backfill entities from engines table
INSERT INTO truth_ledger.entities (entity_type, engine_id, canonical_name)
SELECT 'engine', e.id, e.name
FROM engines e
ON CONFLICT DO NOTHING;

-- Backfill entities from launch_vehicles table
INSERT INTO truth_ledger.entities (entity_type, launch_vehicle_id, canonical_name)
SELECT 'launch_vehicle', lv.id, lv.name
FROM launch_vehicles lv
ON CONFLICT DO NOTHING;

-- Backfill entities from countries table
INSERT INTO truth_ledger.entities (entity_type, country_id, canonical_name)
SELECT 'country', c.id, c.name
FROM countries c
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED ATTRIBUTES (table-qualified names matching field_links)
-- ============================================================================

INSERT INTO truth_ledger.attributes (canonical_name, display_name, value_type, unit, description, tolerance_abs, tolerance_rel)
VALUES
    -- Engine attributes
    ('engines.thrust_n', 'Thrust (N)', 'number', 'N', 'Engine thrust in Newtons', NULL, 0.02),
    ('engines.isp_s', 'Specific Impulse (s)', 'number', 's', 'Specific impulse in seconds', 1.0, 0.01),
    ('engines.mass_kg', 'Engine Mass (kg)', 'number', 'kg', 'Engine dry mass in kilograms', NULL, 0.05),
    ('engines.chamber_pressure_bar', 'Chamber Pressure (bar)', 'number', 'bar', 'Combustion chamber pressure in bar', NULL, 0.03),
    ('engines.thrust_to_weight_ratio', 'Thrust-to-Weight Ratio', 'number', NULL, 'Thrust divided by weight (dimensionless)', NULL, 0.05),
    ('engines.of_ratio', 'O/F Ratio', 'number', NULL, 'Oxidizer-to-fuel mass ratio', NULL, 0.02),
    ('engines.propellant', 'Propellant', 'text', NULL, 'Propellant combination (e.g., RP-1/LOX)', NULL, NULL),
    ('engines.power_cycle', 'Power Cycle', 'text', NULL, 'Engine cycle type (e.g., Gas Generator)', NULL, NULL),
    ('engines.status', 'Status', 'enum', NULL, 'Operational status', NULL, NULL),

    -- Launch vehicle attributes
    ('launch_vehicles.payload_to_leo_kg', 'Payload to LEO (kg)', 'number', 'kg', 'Payload capacity to Low Earth Orbit', NULL, 0.05),
    ('launch_vehicles.payload_to_gto_kg', 'Payload to GTO (kg)', 'number', 'kg', 'Payload capacity to Geostationary Transfer Orbit', NULL, 0.05),
    ('launch_vehicles.payload_to_moon_kg', 'Payload to Moon (kg)', 'number', 'kg', 'Payload capacity to lunar orbit/surface', NULL, 0.10),
    ('launch_vehicles.payload_to_mars_kg', 'Payload to Mars (kg)', 'number', 'kg', 'Payload capacity to Mars orbit/surface', NULL, 0.10),
    ('launch_vehicles.height_meters', 'Height (m)', 'number', 'm', 'Total vehicle height in meters', 0.1, 0.01),
    ('launch_vehicles.diameter_meters', 'Diameter (m)', 'number', 'm', 'Maximum diameter in meters', 0.01, 0.01),
    ('launch_vehicles.mass_kg', 'Mass (kg)', 'number', 'kg', 'Gross liftoff mass in kilograms', NULL, 0.03),
    ('launch_vehicles.thrust_at_liftoff_kn', 'Liftoff Thrust (kN)', 'number', 'kN', 'Total thrust at liftoff in kilonewtons', NULL, 0.02),
    ('launch_vehicles.stages', 'Number of Stages', 'number', NULL, 'Number of rocket stages', NULL, NULL),
    ('launch_vehicles.reusable', 'Reusable', 'boolean', NULL, 'Whether vehicle is designed for reuse', NULL, NULL),
    ('launch_vehicles.human_rated', 'Human-Rated', 'boolean', NULL, 'Certified for crewed missions', NULL, NULL),
    ('launch_vehicles.cost_per_launch_usd', 'Cost per Launch (USD)', 'number', 'USD', 'Estimated cost per launch', NULL, 0.20),
    ('launch_vehicles.success_rate', 'Success Rate', 'number', '%', 'Historical launch success rate', NULL, 0.01)
ON CONFLICT (canonical_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    value_type = EXCLUDED.value_type,
    unit = EXCLUDED.unit,
    description = EXCLUDED.description,
    tolerance_abs = EXCLUDED.tolerance_abs,
    tolerance_rel = EXCLUDED.tolerance_rel;

-- ============================================================================
-- SEED INITIAL SOURCES (high-trust aerospace sources)
-- ============================================================================

INSERT INTO truth_ledger.sources (name, source_type, base_url, base_trust, independence_cluster_id, description)
VALUES
    -- Government Agencies (highest trust)
    ('NASA', 'government_agency', 'https://www.nasa.gov', 0.95, 'nasa', 'National Aeronautics and Space Administration'),
    ('ESA', 'government_agency', 'https://www.esa.int', 0.95, 'esa', 'European Space Agency'),
    ('FAA', 'regulator', 'https://www.faa.gov', 0.95, 'faa', 'Federal Aviation Administration - Commercial Space'),
    ('JAXA', 'government_agency', 'https://www.jaxa.jp', 0.92, 'jaxa', 'Japan Aerospace Exploration Agency'),
    ('Roscosmos', 'government_agency', 'https://www.roscosmos.ru', 0.88, 'roscosmos', 'Russian Federal Space Agency'),
    ('CNSA', 'government_agency', 'https://www.cnsa.gov.cn', 0.85, 'cnsa', 'China National Space Administration'),

    -- Standards Bodies
    ('ISO', 'standards_body', 'https://www.iso.org', 0.90, 'iso', 'International Organization for Standardization'),
    ('AIAA', 'standards_body', 'https://www.aiaa.org', 0.90, 'aiaa', 'American Institute of Aeronautics and Astronautics'),
    ('ECSS', 'standards_body', 'https://ecss.nl', 0.90, 'ecss', 'European Cooperation for Space Standardization'),
    ('SAE', 'standards_body', 'https://www.sae.org', 0.88, 'sae', 'SAE International Aerospace Standards'),

    -- Manufacturers (high trust for own products)
    ('SpaceX', 'manufacturer', 'https://www.spacex.com', 0.85, 'spacex', 'Space Exploration Technologies Corp'),
    ('Blue Origin', 'manufacturer', 'https://www.blueorigin.com', 0.85, 'blue_origin', 'Blue Origin LLC'),
    ('Rocket Lab', 'manufacturer', 'https://www.rocketlabusa.com', 0.85, 'rocket_lab', 'Rocket Lab USA Inc'),
    ('ULA', 'manufacturer', 'https://www.ulalaunch.com', 0.85, 'ula', 'United Launch Alliance'),
    ('Aerojet Rocketdyne', 'manufacturer', 'https://www.rocket.com', 0.85, 'aerojet', 'Aerojet Rocketdyne Holdings'),
    ('NPO Energomash', 'manufacturer', 'https://www.npoenergomash.ru', 0.82, 'energomash', 'NPO Energomash'),
    ('Arianespace', 'manufacturer', 'https://www.arianespace.com', 0.85, 'arianespace', 'Arianespace SA'),

    -- Research & Academia
    ('IEEE Aerospace', 'peer_reviewed', 'https://ieeexplore.ieee.org', 0.88, 'ieee', 'IEEE Aerospace Publications'),
    ('AIAA Journal', 'peer_reviewed', 'https://arc.aiaa.org', 0.88, 'aiaa_journal', 'AIAA Technical Journals'),

    -- Reference Databases
    ('Gunter''s Space Page', 'research', 'https://space.skyrocket.de', 0.75, 'independent', 'Comprehensive spaceflight encyclopedia'),
    ('Spaceflight101', 'news', 'https://spaceflight101.com', 0.70, 'independent', 'Spaceflight news and data'),
    ('Wikipedia Spaceflight', 'wiki', 'https://en.wikipedia.org', 0.50, 'wikipedia', 'Wikipedia spaceflight articles'),
    ('Everyday Astronaut', 'blog', 'https://everydayastronaut.com', 0.55, 'independent', 'Educational spaceflight content'),
    ('NASASpaceflight', 'news', 'https://www.nasaspaceflight.com', 0.65, 'nsf', 'L2 Community and News')
ON CONFLICT (name) DO UPDATE SET
    source_type = EXCLUDED.source_type,
    base_url = EXCLUDED.base_url,
    base_trust = EXCLUDED.base_trust,
    independence_cluster_id = EXCLUDED.independence_cluster_id,
    description = EXCLUDED.description;

-- ============================================================================
-- CREATE FUNCTION: Auto-backfill entities when domain rows are inserted
-- ============================================================================

CREATE OR REPLACE FUNCTION truth_ledger.sync_engine_entity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO truth_ledger.entities (entity_type, engine_id, canonical_name)
    VALUES ('engine', NEW.id, NEW.name)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION truth_ledger.sync_launch_vehicle_entity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO truth_ledger.entities (entity_type, launch_vehicle_id, canonical_name)
    VALUES ('launch_vehicle', NEW.id, NEW.name)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION truth_ledger.sync_country_entity()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO truth_ledger.entities (entity_type, country_id, canonical_name)
    VALUES ('country', NEW.id, NEW.name)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-sync
CREATE TRIGGER sync_engine_to_truth_ledger
    AFTER INSERT ON engines
    FOR EACH ROW EXECUTE FUNCTION truth_ledger.sync_engine_entity();

CREATE TRIGGER sync_launch_vehicle_to_truth_ledger
    AFTER INSERT ON launch_vehicles
    FOR EACH ROW EXECUTE FUNCTION truth_ledger.sync_launch_vehicle_entity();

CREATE TRIGGER sync_country_to_truth_ledger
    AFTER INSERT ON countries
    FOR EACH ROW EXECUTE FUNCTION truth_ledger.sync_country_entity();
