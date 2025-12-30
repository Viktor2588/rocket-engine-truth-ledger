-- Migration: 002_truth_ledger_schema
-- Description: Create truth_ledger schema with all core tables for the fact-checking system
-- Uses UUID PKs for truth_ledger tables, references domain tables with BIGSERIAL

-- Create the truth_ledger schema
CREATE SCHEMA IF NOT EXISTS truth_ledger;

-- ============================================================================
-- SOURCES: Publishers/origins of documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL UNIQUE,
    source_type VARCHAR(50) NOT NULL,  -- regulator, standards_body, manufacturer, research, news, blog, wiki, forum, other
    base_url TEXT,
    base_trust DECIMAL(3, 2) NOT NULL DEFAULT 0.50,  -- Prior trust 0.00-1.00
    independence_cluster_id VARCHAR(100),  -- For deduplication of copy/paste sources
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_base_trust CHECK (base_trust >= 0.00 AND base_trust <= 1.00),
    CONSTRAINT chk_source_type CHECK (source_type IN (
        'regulator', 'standards_body', 'government_agency',
        'manufacturer', 'research', 'peer_reviewed',
        'news', 'blog', 'wiki', 'forum', 'social_media', 'other'
    ))
);

CREATE INDEX IF NOT EXISTS idx_sources_type ON truth_ledger.sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_cluster ON truth_ledger.sources(independence_cluster_id);

-- ============================================================================
-- DOCUMENTS: Versioned content from sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES truth_ledger.sources(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    url TEXT,
    version_label VARCHAR(100),  -- Rev, Edition, Amendment number
    doc_type VARCHAR(50) NOT NULL DEFAULT 'other',  -- regulation, standard, technical_report, etc.
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content_hash CHAR(64) NOT NULL,  -- SHA-256 of normalized content
    raw_content TEXT,  -- Optional: store raw text for re-extraction
    supersedes_document_id UUID REFERENCES truth_ledger.documents(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_doc_type CHECK (doc_type IN (
        'regulation', 'standard', 'standard_or_policy', 'peer_reviewed_paper',
        'technical_report', 'manufacturer_datasheet', 'company_news',
        'news_article', 'blog_post', 'social_media', 'wiki', 'forum_post', 'other'
    ))
);

CREATE INDEX IF NOT EXISTS idx_documents_source ON truth_ledger.documents(source_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON truth_ledger.documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_published ON truth_ledger.documents(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_supersedes ON truth_ledger.documents(supersedes_document_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_source_hash ON truth_ledger.documents(source_id, content_hash);

-- ============================================================================
-- SNIPPETS: Extractable evidence units from documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.snippets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES truth_ledger.documents(id) ON DELETE CASCADE,
    locator TEXT NOT NULL,  -- page/section/table_cell reference
    text TEXT NOT NULL,
    snippet_hash CHAR(64) NOT NULL,  -- SHA-256 of locator + normalized text
    snippet_type VARCHAR(50) DEFAULT 'text',  -- text, table, figure, equation
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_snippet_type CHECK (snippet_type IN ('text', 'table', 'figure', 'equation', 'list', 'other'))
);

CREATE INDEX IF NOT EXISTS idx_snippets_document ON truth_ledger.snippets(document_id);
CREATE INDEX IF NOT EXISTS idx_snippets_hash ON truth_ledger.snippets(snippet_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_snippets_doc_hash ON truth_ledger.snippets(document_id, snippet_hash);

-- ============================================================================
-- ENTITIES: Subjects of claims (engines, launch vehicles, standards, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL,  -- engine, launch_vehicle, country, standard_clause, etc.
    canonical_name TEXT NOT NULL,

    -- FK references to domain tables (optional, one per entity_type)
    engine_id BIGINT REFERENCES engines(id) ON DELETE SET NULL,
    launch_vehicle_id BIGINT REFERENCES launch_vehicles(id) ON DELETE SET NULL,
    country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,

    aliases TEXT[],  -- Alternative names for matching
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_entity_type CHECK (entity_type IN (
        'engine', 'launch_vehicle', 'country', 'satellite', 'launch_site',
        'space_mission', 'standard_clause', 'organization', 'other'
    ))
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON truth_ledger.entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_name ON truth_ledger.entities(canonical_name);
CREATE INDEX IF NOT EXISTS idx_entities_engine ON truth_ledger.entities(engine_id) WHERE engine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_lv ON truth_ledger.entities(launch_vehicle_id) WHERE launch_vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_country ON truth_ledger.entities(country_id) WHERE country_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_engine_unique ON truth_ledger.entities(engine_id) WHERE engine_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_lv_unique ON truth_ledger.entities(launch_vehicle_id) WHERE launch_vehicle_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_country_unique ON truth_ledger.entities(country_id) WHERE country_id IS NOT NULL;

-- ============================================================================
-- ATTRIBUTES: Properties that can be claimed about entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name VARCHAR(200) NOT NULL UNIQUE,  -- e.g., 'engines.isp_s', 'launch_vehicles.payload_to_leo_kg'
    display_name TEXT,
    value_type VARCHAR(50) NOT NULL DEFAULT 'text',  -- number, text, boolean, range, enum, date
    unit VARCHAR(50),  -- Physical unit if applicable
    description TEXT,
    tolerance_abs DOUBLE PRECISION,  -- Absolute tolerance for conflict detection
    tolerance_rel DOUBLE PRECISION,  -- Relative tolerance (e.g., 0.02 for 2%)
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_value_type CHECK (value_type IN ('number', 'text', 'boolean', 'range', 'enum', 'date', 'json'))
);

CREATE INDEX IF NOT EXISTS idx_attributes_name ON truth_ledger.attributes(canonical_name);
CREATE INDEX IF NOT EXISTS idx_attributes_type ON truth_ledger.attributes(value_type);

-- ============================================================================
-- CONFLICT_GROUPS: Buckets for claims about the same question
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.conflict_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_key_hash CHAR(64) NOT NULL UNIQUE,  -- Deterministic hash of entity+attribute+scope
    entity_id UUID NOT NULL REFERENCES truth_ledger.entities(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES truth_ledger.attributes(id) ON DELETE CASCADE,
    scope_json JSONB NOT NULL DEFAULT '{}',
    conflict_present BOOLEAN NOT NULL DEFAULT FALSE,
    status_factual VARCHAR(50) NOT NULL DEFAULT 'unknown',  -- no_conflict, active_conflict, resolved_by_versioning
    claim_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_status_factual CHECK (status_factual IN (
        'unknown', 'no_conflict', 'active_conflict', 'resolved_by_versioning',
        'resolved_by_scope', 'needs_review'
    ))
);

CREATE INDEX IF NOT EXISTS idx_cg_entity ON truth_ledger.conflict_groups(entity_id);
CREATE INDEX IF NOT EXISTS idx_cg_attribute ON truth_ledger.conflict_groups(attribute_id);
CREATE INDEX IF NOT EXISTS idx_cg_hash ON truth_ledger.conflict_groups(claim_key_hash);
CREATE INDEX IF NOT EXISTS idx_cg_conflict ON truth_ledger.conflict_groups(conflict_present) WHERE conflict_present = TRUE;

-- ============================================================================
-- CLAIMS: Atomic assertions about entity attributes
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_key_hash CHAR(64) NOT NULL REFERENCES truth_ledger.conflict_groups(claim_key_hash) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
    entity_id UUID NOT NULL REFERENCES truth_ledger.entities(id) ON DELETE CASCADE,
    attribute_id UUID NOT NULL REFERENCES truth_ledger.attributes(id) ON DELETE CASCADE,
    value_json JSONB NOT NULL,  -- Typed value: {"value": X, "type": "number|string|..."}
    unit VARCHAR(50),
    scope_json JSONB NOT NULL DEFAULT '{}',
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    is_derived BOOLEAN NOT NULL DEFAULT FALSE,  -- True if derived from other claims
    derived_from_claim_id UUID REFERENCES truth_ledger.claims(id) ON DELETE SET NULL,
    parser_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_key_hash ON truth_ledger.claims(claim_key_hash);
CREATE INDEX IF NOT EXISTS idx_claims_entity ON truth_ledger.claims(entity_id);
CREATE INDEX IF NOT EXISTS idx_claims_attribute ON truth_ledger.claims(attribute_id);
CREATE INDEX IF NOT EXISTS idx_claims_valid_from ON truth_ledger.claims(valid_from);
CREATE INDEX IF NOT EXISTS idx_claims_derived ON truth_ledger.claims(is_derived) WHERE is_derived = TRUE;
CREATE INDEX IF NOT EXISTS idx_claims_value ON truth_ledger.claims USING gin(value_json);

-- ============================================================================
-- EVIDENCE: Links between claims and supporting/contradicting snippets
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES truth_ledger.claims(id) ON DELETE CASCADE,
    snippet_id UUID NOT NULL REFERENCES truth_ledger.snippets(id) ON DELETE CASCADE,
    quote TEXT,  -- Verbatim quote from snippet
    stance VARCHAR(20) NOT NULL DEFAULT 'support',  -- support, contradict, neutral
    extraction_confidence DECIMAL(4, 3) NOT NULL DEFAULT 1.000,  -- 0.000-1.000
    parser_notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_stance CHECK (stance IN ('support', 'contradict', 'neutral')),
    CONSTRAINT chk_extraction_confidence CHECK (extraction_confidence >= 0.000 AND extraction_confidence <= 1.000)
);

CREATE INDEX IF NOT EXISTS idx_evidence_claim ON truth_ledger.evidence(claim_id);
CREATE INDEX IF NOT EXISTS idx_evidence_snippet ON truth_ledger.evidence(snippet_id);
CREATE INDEX IF NOT EXISTS idx_evidence_stance ON truth_ledger.evidence(stance);
CREATE INDEX IF NOT EXISTS idx_evidence_confidence ON truth_ledger.evidence(extraction_confidence DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_evidence_claim_snippet ON truth_ledger.evidence(claim_id, snippet_id);

-- ============================================================================
-- TRUTH_METRICS: Computed scores for claims (RAW, slider-independent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.truth_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_group_id UUID NOT NULL REFERENCES truth_ledger.conflict_groups(id) ON DELETE CASCADE,
    claim_id UUID NOT NULL REFERENCES truth_ledger.claims(id) ON DELETE CASCADE,
    truth_raw DECIMAL(4, 3) NOT NULL,  -- 0.000-1.000, slider-independent
    support_score DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    contradiction_score DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    independent_sources INTEGER NOT NULL DEFAULT 0,
    recency_score DECIMAL(4, 3) DEFAULT 1.000,
    specificity_score DECIMAL(4, 3) DEFAULT 1.000,
    factors_json JSONB,  -- Debug/audit info: evidence weights, caps applied, etc.
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_truth_raw CHECK (truth_raw >= 0.000 AND truth_raw <= 1.000),
    CONSTRAINT unique_claim_metrics UNIQUE (claim_id)
);

CREATE INDEX IF NOT EXISTS idx_tm_conflict_group ON truth_ledger.truth_metrics(conflict_group_id);
CREATE INDEX IF NOT EXISTS idx_tm_claim ON truth_ledger.truth_metrics(claim_id);
CREATE INDEX IF NOT EXISTS idx_tm_truth_raw ON truth_ledger.truth_metrics(truth_raw DESC);
CREATE INDEX IF NOT EXISTS idx_tm_computed ON truth_ledger.truth_metrics(computed_at DESC);

-- ============================================================================
-- FIELD_LINKS: Mapping between domain table columns and truth_ledger claims
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.field_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES truth_ledger.entities(id) ON DELETE CASCADE,
    field_name VARCHAR(200) NOT NULL,  -- Table-qualified: 'engines.isp_s'
    claim_key_hash CHAR(64) REFERENCES truth_ledger.conflict_groups(claim_key_hash) ON DELETE SET NULL,
    auto_update BOOLEAN NOT NULL DEFAULT FALSE,  -- If true, domain field is updated from best claim
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_entity_field UNIQUE (entity_id, field_name)
);

CREATE INDEX IF NOT EXISTS idx_fl_entity ON truth_ledger.field_links(entity_id);
CREATE INDEX IF NOT EXISTS idx_fl_field ON truth_ledger.field_links(field_name);
CREATE INDEX IF NOT EXISTS idx_fl_claim_key ON truth_ledger.field_links(claim_key_hash);

-- ============================================================================
-- REVIEW_QUEUE: Items needing human review
-- ============================================================================
CREATE TABLE IF NOT EXISTS truth_ledger.review_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(50) NOT NULL,  -- claim, conflict_group, evidence
    item_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,  -- low_confidence, extreme_conflict, needs_curation
    priority INTEGER NOT NULL DEFAULT 5,  -- 1=highest, 10=lowest
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, in_review, resolved, dismissed
    notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_item_type CHECK (item_type IN ('claim', 'conflict_group', 'evidence', 'document')),
    CONSTRAINT chk_status CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_rq_type ON truth_ledger.review_queue(item_type);
CREATE INDEX IF NOT EXISTS idx_rq_status ON truth_ledger.review_queue(status);
CREATE INDEX IF NOT EXISTS idx_rq_priority ON truth_ledger.review_queue(priority ASC, created_at ASC);

-- ============================================================================
-- Apply updated_at triggers to truth_ledger tables
-- ============================================================================
CREATE TRIGGER update_sources_updated_at
    BEFORE UPDATE ON truth_ledger.sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON truth_ledger.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON truth_ledger.entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conflict_groups_updated_at
    BEFORE UPDATE ON truth_ledger.conflict_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON truth_ledger.claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_field_links_updated_at
    BEFORE UPDATE ON truth_ledger.field_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
