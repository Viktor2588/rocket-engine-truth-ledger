-- Migration: 005_source_feeds.sql
-- Description: Add support for dynamic source and feed management
-- Date: 2024-12-30

-- ============================================================================
-- EXTEND SOURCES TABLE
-- ============================================================================

-- Add new columns to sources table
ALTER TABLE truth_ledger_claude.sources
  ADD COLUMN IF NOT EXISTS default_doc_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for active sources
CREATE INDEX IF NOT EXISTS idx_sources_is_active
  ON truth_ledger_claude.sources(is_active);

-- Create index for tags (GIN for array containment queries)
CREATE INDEX IF NOT EXISTS idx_sources_tags
  ON truth_ledger_claude.sources USING GIN(tags);

-- ============================================================================
-- SOURCE FEEDS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS truth_ledger_claude.source_feeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES truth_ledger_claude.sources(id) ON DELETE CASCADE,
  feed_url TEXT NOT NULL,
  feed_type VARCHAR(20) NOT NULL CHECK (feed_type IN ('rss', 'atom', 'json', 'html', 'api')),
  refresh_interval_minutes INTEGER NOT NULL DEFAULT 60,
  max_items INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, feed_url)
);

-- Indexes for source_feeds
CREATE INDEX IF NOT EXISTS idx_source_feeds_source_id
  ON truth_ledger_claude.source_feeds(source_id);

CREATE INDEX IF NOT EXISTS idx_source_feeds_is_active
  ON truth_ledger_claude.source_feeds(is_active);

CREATE INDEX IF NOT EXISTS idx_source_feeds_last_fetched
  ON truth_ledger_claude.source_feeds(last_fetched_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION truth_ledger_claude.update_source_feeds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_source_feeds_updated_at ON truth_ledger_claude.source_feeds;
CREATE TRIGGER update_source_feeds_updated_at
  BEFORE UPDATE ON truth_ledger_claude.source_feeds
  FOR EACH ROW
  EXECUTE FUNCTION truth_ledger_claude.update_source_feeds_updated_at();

-- ============================================================================
-- SOURCE URLS TABLE (for static one-time URLs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS truth_ledger_claude.source_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES truth_ledger_claude.sources(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_id, url)
);

-- Indexes for source_urls
CREATE INDEX IF NOT EXISTS idx_source_urls_source_id
  ON truth_ledger_claude.source_urls(source_id);

CREATE INDEX IF NOT EXISTS idx_source_urls_is_active
  ON truth_ledger_claude.source_urls(is_active);

-- ============================================================================
-- ADD CASCADE DELETE FOR DOCUMENTS
-- ============================================================================

-- First check if constraint exists and drop it if needed
DO $$
BEGIN
  -- Add cascade delete for documents -> sources
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'documents_source_id_fkey'
    AND table_schema = 'truth_ledger_claude'
  ) THEN
    ALTER TABLE truth_ledger_claude.documents
      DROP CONSTRAINT documents_source_id_fkey;
  END IF;

  -- Re-add with CASCADE
  ALTER TABLE truth_ledger_claude.documents
    ADD CONSTRAINT documents_source_id_fkey
    FOREIGN KEY (source_id)
    REFERENCES truth_ledger_claude.sources(id)
    ON DELETE CASCADE;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE truth_ledger_claude.source_feeds IS 'RSS/Atom/JSON feeds for continuous data ingestion';
COMMENT ON TABLE truth_ledger_claude.source_urls IS 'Static URLs for one-time fetching';
COMMENT ON COLUMN truth_ledger_claude.sources.is_active IS 'Whether this source is active for ingestion';
COMMENT ON COLUMN truth_ledger_claude.sources.tags IS 'Categorization tags for filtering';
COMMENT ON COLUMN truth_ledger_claude.sources.default_doc_type IS 'Default document type for documents from this source';
COMMENT ON COLUMN truth_ledger_claude.source_feeds.feed_type IS 'Type of feed: rss, atom, json, html, or api';
COMMENT ON COLUMN truth_ledger_claude.source_feeds.error_count IS 'Number of consecutive fetch errors';
