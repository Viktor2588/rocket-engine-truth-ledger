-- Migration: 003_claim_key_hash_function
-- Description: Create deterministic claim key hash function for consistent claim grouping
-- This function MUST be used everywhere to compute claim_key_hash values

-- ============================================================================
-- COMPUTE_CLAIM_KEY_HASH: Deterministic hash for claim grouping
-- ============================================================================
-- Claims with the same hash belong to the same conflict group
-- The hash is based on: entity_id, attribute_id, and normalized scope

CREATE OR REPLACE FUNCTION truth_ledger.compute_claim_key_hash(
    p_entity_id UUID,
    p_attribute_id UUID,
    p_scope_json JSONB
) RETURNS CHAR(64)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT encode(
        digest(
            jsonb_build_object(
                'entity_id', p_entity_id::text,
                'attribute_id', p_attribute_id::text,
                'scope', COALESCE(
                    jsonb_strip_nulls(
                        -- Remove volatile fields that shouldn't affect grouping
                        p_scope_json - 'retrieved_at' - 'job_id' - 'extraction_timestamp'
                    ),
                    '{}'::jsonb
                )
            )::text,
            'sha256'
        ),
        'hex'
    )::char(64);
$$;

-- ============================================================================
-- HELPER: Normalize scope JSON for consistent hashing
-- ============================================================================
CREATE OR REPLACE FUNCTION truth_ledger.normalize_scope_json(
    p_scope_json JSONB
) RETURNS JSONB
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT COALESCE(
        jsonb_strip_nulls(
            p_scope_json - 'retrieved_at' - 'job_id' - 'extraction_timestamp' - '_internal'
        ),
        '{}'::jsonb
    );
$$;

-- ============================================================================
-- HELPER: Compute content hash for documents
-- ============================================================================
CREATE OR REPLACE FUNCTION truth_ledger.compute_content_hash(
    p_content TEXT
) RETURNS CHAR(64)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT encode(
        digest(
            -- Normalize: trim, collapse whitespace, lowercase for hash stability
            lower(regexp_replace(trim(p_content), '\s+', ' ', 'g')),
            'sha256'
        ),
        'hex'
    )::char(64);
$$;

-- ============================================================================
-- HELPER: Compute snippet hash
-- ============================================================================
CREATE OR REPLACE FUNCTION truth_ledger.compute_snippet_hash(
    p_locator TEXT,
    p_text TEXT
) RETURNS CHAR(64)
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT encode(
        digest(
            p_locator || '::' || lower(regexp_replace(trim(p_text), '\s+', ' ', 'g')),
            'sha256'
        ),
        'hex'
    )::char(64);
$$;

-- ============================================================================
-- TRIGGER: Auto-compute claim_key_hash on claim insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION truth_ledger.claims_before_insert_update()
RETURNS TRIGGER AS $$
DECLARE
    v_claim_key_hash CHAR(64);
BEGIN
    -- Compute the claim key hash
    v_claim_key_hash := truth_ledger.compute_claim_key_hash(
        NEW.entity_id,
        NEW.attribute_id,
        NEW.scope_json
    );

    -- Ensure conflict group exists (upsert pattern)
    INSERT INTO truth_ledger.conflict_groups (
        claim_key_hash,
        entity_id,
        attribute_id,
        scope_json
    ) VALUES (
        v_claim_key_hash,
        NEW.entity_id,
        NEW.attribute_id,
        truth_ledger.normalize_scope_json(NEW.scope_json)
    )
    ON CONFLICT (claim_key_hash) DO UPDATE SET
        updated_at = NOW();

    -- Update claim count
    UPDATE truth_ledger.conflict_groups
    SET claim_count = (
        SELECT COUNT(*) FROM truth_ledger.claims
        WHERE claim_key_hash = v_claim_key_hash
    ) + 1
    WHERE claim_key_hash = v_claim_key_hash;

    -- Set the claim_key_hash on the claim
    NEW.claim_key_hash := v_claim_key_hash;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_ensure_conflict_group
    BEFORE INSERT ON truth_ledger.claims
    FOR EACH ROW EXECUTE FUNCTION truth_ledger.claims_before_insert_update();

-- ============================================================================
-- TRIGGER: Update conflict group claim count on claim delete
-- ============================================================================
CREATE OR REPLACE FUNCTION truth_ledger.claims_after_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE truth_ledger.conflict_groups
    SET
        claim_count = GREATEST(0, claim_count - 1),
        updated_at = NOW()
    WHERE claim_key_hash = OLD.claim_key_hash;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_update_count_on_delete
    AFTER DELETE ON truth_ledger.claims
    FOR EACH ROW EXECUTE FUNCTION truth_ledger.claims_after_delete();

-- ============================================================================
-- TRIGGER: Auto-compute snippet hash
-- ============================================================================
CREATE OR REPLACE FUNCTION truth_ledger.snippets_before_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.snippet_hash IS NULL THEN
        NEW.snippet_hash := truth_ledger.compute_snippet_hash(NEW.locator, NEW.text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER snippets_compute_hash
    BEFORE INSERT ON truth_ledger.snippets
    FOR EACH ROW EXECUTE FUNCTION truth_ledger.snippets_before_insert();

-- ============================================================================
-- TRIGGER: Update conflict detection status
-- ============================================================================
CREATE OR REPLACE FUNCTION truth_ledger.update_conflict_status()
RETURNS TRIGGER AS $$
DECLARE
    v_distinct_values INTEGER;
    v_claim_count INTEGER;
BEGIN
    -- Count distinct values in the conflict group
    SELECT
        COUNT(DISTINCT value_json),
        COUNT(*)
    INTO v_distinct_values, v_claim_count
    FROM truth_ledger.claims
    WHERE claim_key_hash = NEW.claim_key_hash;

    -- Update conflict status
    UPDATE truth_ledger.conflict_groups
    SET
        conflict_present = (v_distinct_values > 1),
        claim_count = v_claim_count,
        status_factual = CASE
            WHEN v_distinct_values <= 1 THEN 'no_conflict'
            ELSE 'active_conflict'
        END,
        updated_at = NOW()
    WHERE claim_key_hash = NEW.claim_key_hash;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER claims_update_conflict_status
    AFTER INSERT OR UPDATE ON truth_ledger.claims
    FOR EACH ROW EXECUTE FUNCTION truth_ledger.update_conflict_status();

-- ============================================================================
-- VIEWS: Useful query shortcuts
-- ============================================================================

-- View: Claims with full provenance chain
CREATE OR REPLACE VIEW truth_ledger.claims_with_provenance AS
SELECT
    c.id AS claim_id,
    c.claim_key_hash,
    c.value_json,
    c.unit,
    c.scope_json,
    c.valid_from,
    c.valid_to,
    c.is_derived,
    c.created_at AS claim_created_at,
    e.id AS entity_id,
    e.entity_type,
    e.canonical_name AS entity_name,
    a.id AS attribute_id,
    a.canonical_name AS attribute_name,
    a.value_type,
    cg.conflict_present,
    cg.status_factual,
    tm.truth_raw,
    tm.support_score,
    tm.contradiction_score,
    tm.independent_sources
FROM truth_ledger.claims c
JOIN truth_ledger.entities e ON c.entity_id = e.id
JOIN truth_ledger.attributes a ON c.attribute_id = a.id
JOIN truth_ledger.conflict_groups cg ON c.claim_key_hash = cg.claim_key_hash
LEFT JOIN truth_ledger.truth_metrics tm ON c.id = tm.claim_id;

-- View: Evidence with full source chain
CREATE OR REPLACE VIEW truth_ledger.evidence_with_sources AS
SELECT
    ev.id AS evidence_id,
    ev.claim_id,
    ev.quote,
    ev.stance,
    ev.extraction_confidence,
    s.id AS snippet_id,
    s.locator,
    s.text AS snippet_text,
    d.id AS document_id,
    d.title AS document_title,
    d.version_label,
    d.doc_type,
    d.published_at,
    src.id AS source_id,
    src.name AS source_name,
    src.source_type,
    src.base_trust,
    src.independence_cluster_id
FROM truth_ledger.evidence ev
JOIN truth_ledger.snippets s ON ev.snippet_id = s.id
JOIN truth_ledger.documents d ON s.document_id = d.id
JOIN truth_ledger.sources src ON d.source_id = src.id;

-- View: Active conflicts needing attention
CREATE OR REPLACE VIEW truth_ledger.active_conflicts AS
SELECT
    cg.id AS conflict_group_id,
    cg.claim_key_hash,
    cg.claim_count,
    cg.status_factual,
    e.canonical_name AS entity_name,
    a.canonical_name AS attribute_name,
    cg.scope_json,
    cg.created_at,
    cg.updated_at
FROM truth_ledger.conflict_groups cg
JOIN truth_ledger.entities e ON cg.entity_id = e.id
JOIN truth_ledger.attributes a ON cg.attribute_id = a.id
WHERE cg.conflict_present = TRUE
ORDER BY cg.claim_count DESC, cg.updated_at DESC;
