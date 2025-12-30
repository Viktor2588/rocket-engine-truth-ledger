v3.1 “Truth‑Ledger” — Complete Implementation Details (build-ready)

You said “start implementing now”, so below is a concrete, end-to-end build plan: what services/jobs to write, exact DB write patterns, required invariants, scoring/display logic, and the quickest path to a working vertical slice in your existing same Postgres DB (with your domain tables like engines, launch_vehicles, etc. from database-schema.sql).

I’m assuming:

    Same DB (so we can use FKs).
    Truth-Ledger tables use UUID PKs.
    Domain tables remain unchanged (BIGSERIAL PKs).
    truth_slider is query-only and affects display only (never stored / never changes RAW).

0) What you are building (runtime components)

Implement these as separate modules/services (can be one repo):

    Ingestor (scheduled job)

    Fetches documents (HTML/PDF/etc.)
    Creates/updates documents, snippets
    Records runs in sync_status

    Extractor (scheduled job)

    Reads new/changed documents
    Extracts claims + evidence
    Creates conflict_groups, claims, evidence

    Deriver (Domain Default Mapper) (scheduled job)

    Converts high-quality raw claims into your domain-default buckets
    This is what makes field_links work reliably for your existing columns like engines.isp_s

    Scorer (scheduled job)

    Computes truth_metrics (RAW) per conflict group + claim

    API (online)

    Resolves a query (entity+attribute or claim_key_hash)
    Returns alternatives always
    Returns best_answer only if display gates pass
    Computes truth_display from truth_raw + truth_slider (no DB writes)

1) Data contract: invariants you must enforce

These are the “ledger must never violate” rules:

    No claim without provenance

    Every claims.id must have ≥1 row in evidence
    You cannot enforce this purely with FK constraints; enforce via pipeline + integrity checks.

    Every claim belongs to a bucket

    claims.claim_key_hash must exist in conflict_groups.claim_key_hash
    Enforced via FK (DEFERRABLE).

    Evidence is traceable to source

    evidence.snippet_id → snippets.document_id → documents.source_id must be valid.

    RAW metrics are reproducible and mode-independent

    truth_metrics.truth_raw changes only if underlying evidence/documents change
    Slider never writes to DB.

    Table-qualified fields

    field_links.field_name is exactly table.column (e.g., engines.isp_s)

2) Database setup (do this first)
2.1 Apply the UUID migration

Use the UUID-based schema we discussed (in truth_ledger schema) with pgcrypto.
2.2 Add the deterministic claim key hash function (important)

Use one canonical implementation everywhere:

sql

Copy
CREATE OR REPLACE FUNCTION truth_ledger.compute_claim_key_hash(
  p_entity_id UUID,
  p_attribute_id UUID,
  p_scope_json JSONB
) RETURNS CHAR(64)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      jsonb_build_object(
        'entity_id', p_entity_id::text,
        'attribute_id', p_attribute_id::text,
        'scope', COALESCE(jsonb_strip_nulls(p_scope_json), '{}'::jsonb)
      )::text,
      'sha256'
    ),
    'hex'
  )::char(64);
$$;

2.3 Seed entities for existing domain rows (one-time backfill)

Because you want FK integrity and easy joins:

sql

Copy
INSERT INTO truth_ledger.entities (entity_type, engine_id, canonical_name)
SELECT 'engine', e.id, e.name
FROM engines e
ON CONFLICT (engine_id) WHERE engine_id IS NOT NULL DO NOTHING;

INSERT INTO truth_ledger.entities (entity_type, launch_vehicle_id, canonical_name)
SELECT 'launch_vehicle', lv.id, lv.name
FROM launch_vehicles lv
ON CONFLICT (launch_vehicle_id) WHERE launch_vehicle_id IS NOT NULL DO NOTHING;

INSERT INTO truth_ledger.entities (entity_type, country_id, canonical_name)
SELECT 'country', c.id, c.name
FROM countries c
ON CONFLICT (country_id) WHERE country_id IS NOT NULL DO NOTHING;

2.4 Seed attributes using table-qualified names

Strongly recommended: make attributes.canonical_name match field_links.field_name.

Example (start small):

sql

Copy
INSERT INTO truth_ledger.attributes (canonical_name, value_type, description)
VALUES
  ('engines.thrustn', 'number', 'Engine thrust in Newtons'),
  ('engines.isp_s', 'number', 'Specific impulse in seconds'),
  ('engines.mass_kg', 'number', 'Engine mass in kg'),
  ('engines.chamber_pressure_bar', 'number', 'Chamber pressure in bar'),
  ('launch_vehicles.payload_to_leo_kg', 'number', 'Payload to LEO in kg'),
  ('launch_vehicles.payload_to_gto_kg', 'number', 'Payload to GTO in kg'),
  ('launch_vehicles.height_meters', 'number', 'Vehicle height in meters'),
  ('launch_vehicles.reusable', 'boolean', 'Reusable flag')
ON CONFLICT (canonical_name) DO NOTHING;

3) Config you need (write these as code constants / DB tables)
3.1 doc_type taxonomy + multiplier (used in RAW scoring)

A simple v1 (tune later):

text

Copy
regulation:           1.20
standard:             1.15
peer_reviewed_paper:  1.05
technical_report:     1.00
manufacturer_datasheet:0.95
company_news:         0.75
news_article:         0.65
blog_post:            0.50
social_media:         0.35
other:                0.60

3.2 Source registry fields (minimum)

For each source you ingest, you need:

    sources.name
    sources.base_trust (SpaceX updates = 0.55 per your decision)
    sources.source_type (e.g. regulatory, standards_body, company_news, news, blog, research)
    sources.independence_cluster_id (important to avoid double counting)

3.3 Scope templates (critical for aerospace data)

You must define consistent scope keys per attribute type.

Examples:

    Engines performance:
        {"profile":"engine_perf","altitude":"vac|sl","throttle":"100%|...","configuration":"baseline|...","as_of":"YYYY-MM-DD"}
    Launch vehicle payload:
        {"profile":"lv_payload","orbit":"LEO|SSO|GTO","inclination_deg":..., "reusability":"expendable|reusable", "as_of":...}
    Standards requirement:
        {"profile":"standard_req","standard_id":"ISO-...","clause":"5.2.1","edition":"2020","as_of":...}

Rule: scope must contain only stable, meaning-bearing fields. Never include retrieved_at, job IDs, etc.
4) Pipeline implementation (exact stages + DB writes)
Stage A — Watchlist & ingestion (HTML/PDF/anything)

Input: list of URLs per source
Output: rows in documents + snippets

Algorithm (document upsert):

    Fetch URL
    Extract main text (for PDF: extract text; for HTML: readability)
    Normalize text (whitespace, remove nav)
    Compute content_hash = sha256(normalized_text)
    Upsert documents on (source_id, content_hash) (idempotent)
    If the same URL now yields a new hash, create a new documents row and set supersedes_document_id by finding most recent previous doc for same URL/source.

Snippetization:

    Split into stable “evidence units”
    Insert into snippets with snippet_hash = sha256(locator + normalized_snippet_text)

Ops logging: write one row to sync_status per run (sync_type='truth_ingest').
Stage B — Claim extraction

Input: new/changed snippets
Output: conflict_groups, claims, evidence

Implement precision-first extractors (start with numeric + a few well-scoped attributes).

Extraction output contract (required fields):

    entity_id (link to truth_ledger.entities, prefer FK to domain)
    attribute_id
    value_json (typed JSON)
    unit (if applicable)
    scope_json (must follow template)
    valid_from/valid_to (optional)
    evidence:
        snippet_id
        quote
        stance (support usually for direct extraction; contradict for contradiction detection)
        extraction_confidence (0–1)

DB write sequence (transaction):

    claim_key_hash = compute_claim_key_hash(entity_id, attribute_id, scope_json)
    INSERT conflict_groups(claim_key_hash) ON CONFLICT DO NOTHING
    INSERT claims(...) (with claim_key_hash)
    INSERT evidence(...) for at least one snippet

Because the FK from claims.claim_key_hash to conflict_groups.claim_key_hash is DEFERRABLE, you can insert in either order inside the same transaction—but do the group first anyway.
Stage C — Conflict detection (bucket-level)

Conflict groups already collect alternatives. Conflict detection is then largely “analytics”:

    Two claims are in conflict if:
        same claim_key_hash (same bucket) AND
        values differ beyond tolerance OR definitions differ.

Tolerance rules (v1):

    Numeric:
        absolute tolerance for small values + relative for large:
            abs(a-b) <= max(abs_tol, rel_tol * max(|a|,|b|))
        Example: rel_tol=0.02 (2%), abs_tol depends on attribute.
    Enums/strings: exact match after normalization, else conflict.

Store conflict state as:

    conflict_groups.status_factual (e.g., active_conflict, no_conflict, resolved_by_versioning)
    This can be recomputed.

Stage D — Domain-default derivation (makes your existing schema “covered”)

Your domain columns often represent “a single number” without full aerospace scope. You should not pretend those missing conditions exist; instead you define a product meaning:

    “engines.isp_s in our database means best supported ISP for engine, as-of latest, default conditions defined by profile=domain_default_v1.”

So implement a derivation job:

Input: high-quality raw claims for a given entity+attribute family
Output: derived claims that map to domain field buckets referenced by field_links

Example mapping:

    Raw: profile=engine_perf, altitude=vac → Derived bucket: {"profile":"domain_default_v1","field":"engines.isp_s"}

Derived claim should:

    keep provenance: evidence points to original snippet(s)
    record in factors_json or parser_notes that it’s derived (recommended)

This is the clean bridge between “real aerospace scope” and “simple domain column”.
Stage E — RAW scoring engine (truth_metrics)

Compute stable mode-independent truth scores.

Core ideas to implement:

    Evidence-weighted support vs contradiction
    Independence clusters with diminishing returns
    Low-quality caps so a pile of blogs can’t inflate RAW

Suggested RAW computation (v1):

    For each claim candidate c in a conflict group:
        Gather all evidence rows for c
        For each evidence row e:
            w_source = sources.base_trust
            w_doc = DOC_TYPE_MULT[documents.doc_type]
            w_extract = evidence.extraction_confidence
            w_recency = recency_score(document.published_at, now)
            w = w_source * w_doc * w_extract * w_recency
        Apply independence: group evidence by independence_cluster_id and apply diminishing returns per cluster, e.g.:
            first item in cluster counts 1.0, second 0.5, third 0.25, …
    Compute:
        support_score = sum(w for stance=support)
        contradiction_score = sum(w for stance=contradict) (either from explicit contradict evidence or from other claims’ support treated as contradiction—pick one consistent method)
    Convert to bounded truth_raw:
        a simple conservative form:
            truth_raw = support_score / (support_score + contradiction_score + k)
            choose k (e.g., 0.5) to avoid overconfidence on tiny evidence

Persist into truth_ledger.truth_metrics with factors_json including:

    counts per cluster
    top evidence contributors
    doc_type multipliers used
    any caps applied

5) API implementation (what endpoints to build first)
5.1 Must-have endpoints (MVP)

    Resolve by claim key:

    GET /facts/{claim_key_hash}?truth_slider=0..1

    Resolve by domain object + field:

    GET /entities/engine/{engine_id}/field/engines.isp_s?truth_slider=...
        internally:
            lookup truth_ledger.entities by engine_id
            lookup field_links by (entity_id, field_name)
            call the conflict group endpoint

5.2 Response requirements

Always return:

    truth_raw for each candidate claim (from truth_metrics)
    computed truth_display
    alternatives[] including evidence + document metadata
    Return best_answer only if display gates pass.

6) Slider / display policy (query-only, no DB writes)

Implement:

    truth_display = calibrate(truth_raw, truth_slider)

A robust simple calibration is a gamma curve:

text

Copy
gamma = lerp(2.2, 0.6, truth_slider)   // slider=0 conservative => gamma high
truth_display = truth_raw ^ gamma

Then define display gates based on slider:

    Conservative (slider near 0): require
        high truth_display (e.g. ≥ 0.85)
        independent_sources >= 2
        contradiction_score low

    Assertive (slider near 1): relax thresholds and show “best available” more often, but still always show alternatives.

Important: You are not changing RAW; you’re changing what you’re willing to present as best.
7) Scheduling & job orchestration (use your existing sync_status)

Implement jobs in this order:

    truth_ingest (fetch + documents + snippets)
    truth_extract (claims + evidence)
    truth_derive (domain-default buckets)
    truth_score (truth_metrics)

Each job writes to sync_status:

    sync_type
    state = running|success|failed
    started_at, completed_at
    records_synced
    error_message

8) Integrity checks you should run daily (SQL)

These are non-negotiable if you want ledger correctness:

sql

Copy
-- 1) Claims without evidence
SELECT c.id
FROM truth_ledger.claims c
LEFT JOIN truth_ledger.evidence e ON e.claim_id = c.id
WHERE e.id IS NULL;

-- 2) Claims without metrics (if you require scoring coverage)
SELECT c.id
FROM truth_ledger.claims c
LEFT JOIN truth_ledger.truth_metrics tm ON tm.claim_id = c.id
WHERE tm.claim_id IS NULL;

-- 3) Evidence without full provenance chain
SELECT e.id
FROM truth_ledger.evidence e
JOIN truth_ledger.snippets s ON s.id = e.snippet_id
JOIN truth_ledger.documents d ON d.id = s.document_id
JOIN truth_ledger.sources so ON so.id = d.source_id
WHERE so.id IS NULL;

Fail CI/nightly if these return rows (or at least alert).
9) The fastest “vertical slice” to implement this week (do this in order)

    DB migration + hash function + entity backfill + attributes seed
    Implement truth_ingest for 2–3 sources (even one is fine)
    Implement snippetization + store documents/snippets
    Implement extractor for one attribute end-to-end, e.g. engines.isp_s
    Insert claims + evidence + conflict_groups
    Implement scorer for that conflict group
    Implement API endpoint: GET /entities/engine/{id}/field/engines.isp_s?truth_slider=...
    Add field_links for engines.isp_s (table-qualified)

Once one field works end-to-end, expanding is mostly adding extractors + scope templates.
