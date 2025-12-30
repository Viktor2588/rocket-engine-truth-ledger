-- Migration: 001_domain_tables
-- Description: Create core domain tables for aerospace entities (engines, launch_vehicles, countries)
-- These tables use BIGSERIAL PKs and are referenced by truth_ledger entities

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    iso_code VARCHAR(3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_countries_iso_code ON countries(iso_code);

-- Engines table
CREATE TABLE IF NOT EXISTS engines (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    origin VARCHAR(100),  -- Legacy field, deprecated in favor of country_id
    country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,
    designer VARCHAR(200),
    vehicle VARCHAR(200),
    status VARCHAR(50),
    use VARCHAR(100),
    propellant VARCHAR(100) NOT NULL,
    power_cycle VARCHAR(100),
    isp_s DOUBLE PRECISION,            -- Specific impulse (seconds)
    thrust_n BIGINT,                   -- Thrust in Newtons
    chamber_pressure_bar DOUBLE PRECISION,
    mass_kg DOUBLE PRECISION,
    thrust_to_weight_ratio DOUBLE PRECISION,
    of_ratio DOUBLE PRECISION,         -- Oxidizer-to-fuel ratio
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engines_designer ON engines(designer);
CREATE INDEX IF NOT EXISTS idx_engines_propellant ON engines(propellant);
CREATE INDEX IF NOT EXISTS idx_engines_origin ON engines(origin);
CREATE INDEX IF NOT EXISTS idx_engines_country_id ON engines(country_id);
CREATE INDEX IF NOT EXISTS idx_engines_status ON engines(status);

-- Launch vehicles table
CREATE TABLE IF NOT EXISTS launch_vehicles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    family VARCHAR(100),
    variant VARCHAR(100),
    full_name VARCHAR(200),
    country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,
    manufacturer VARCHAR(200),

    -- Physical specs
    height_meters DOUBLE PRECISION,
    diameter_meters DOUBLE PRECISION,
    mass_kg DOUBLE PRECISION,
    stages INTEGER,

    -- Performance
    payload_to_leo_kg INTEGER,
    payload_to_gto_kg INTEGER,
    payload_to_moon_kg INTEGER,
    payload_to_mars_kg INTEGER,

    -- Propulsion
    first_stage_engines VARCHAR(100),
    first_stage_engine_count INTEGER,
    second_stage_engines VARCHAR(100),
    second_stage_engine_count INTEGER,
    propellant VARCHAR(100),
    thrust_at_liftoff_kn BIGINT,

    -- Status & History
    status VARCHAR(50),
    first_flight_year INTEGER,
    last_flight_year INTEGER,
    total_launches INTEGER,
    successful_launches INTEGER,
    failed_launches INTEGER,
    success_rate DOUBLE PRECISION,

    -- Capabilities
    reusable BOOLEAN,
    human_rated BOOLEAN,
    active BOOLEAN,

    -- Economics
    cost_per_launch_usd NUMERIC(15, 2),
    cost_per_kg_to_leo_usd NUMERIC(15, 2),

    description TEXT,
    image_url TEXT,
    wiki_url TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lv_country_id ON launch_vehicles(country_id);
CREATE INDEX IF NOT EXISTS idx_lv_manufacturer ON launch_vehicles(manufacturer);
CREATE INDEX IF NOT EXISTS idx_lv_status ON launch_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_lv_reusable ON launch_vehicles(reusable);
CREATE INDEX IF NOT EXISTS idx_lv_human_rated ON launch_vehicles(human_rated);

-- Sync status table for tracking pipeline runs
CREATE TABLE IF NOT EXISTS sync_status (
    id BIGSERIAL PRIMARY KEY,
    sync_type VARCHAR(50) NOT NULL,
    state VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, running, success, failed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_status_type ON sync_status(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_status_state ON sync_status(state);
CREATE INDEX IF NOT EXISTS idx_sync_status_started ON sync_status(started_at DESC);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_countries_updated_at
    BEFORE UPDATE ON countries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_engines_updated_at
    BEFORE UPDATE ON engines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_launch_vehicles_updated_at
    BEFORE UPDATE ON launch_vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
