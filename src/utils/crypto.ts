import { createHash } from 'crypto';

/**
 * Computes the content hash for a document.
 * Must match the SQL implementation:
 * sha256(lower(regexp_replace(trim(p_content), '\s+', ' ', 'g')))
 */
export function computeContentHash(content: string): string {
  const normalized = content
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  
  return createHash('sha256')
    .update(normalized)
    .digest('hex');
}

/**
 * Computes the snippet hash.
 * Must match the SQL implementation:
 * sha256(p_locator || '::' || lower(regexp_replace(trim(p_text), '\s+', ' ', 'g')))
 */
export function computeSnippetHash(locator: string, text: string): string {
  const normalizedText = text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  
  const input = `${locator}::${normalizedText}`;
  
  return createHash('sha256')
    .update(input)
    .digest('hex');
}

/**
 * Computes the claim key hash.
 * Must match the SQL implementation:
 * sha256(jsonb_build_object(...))
 * 
 * Note: Replicating the exact JSONB serialization of PostgreSQL in JS is tricky
 * because of key ordering and spacing.
 * Ideally, rely on the DB to compute this, or use a canonical JSON stringify.
 * For now, this is a placeholder/utility if needed, but the DB trigger 
 * `claims_before_insert_update` handles this automatically.
 */
export function computeClaimKeyHash(
  entityId: string,
  attributeId: string,
  scopeJson: Record<string, unknown>
): string {
  // Remove volatile fields
  const cleanScope = { ...scopeJson };
  delete cleanScope.retrieved_at;
  delete cleanScope.job_id;
  delete cleanScope.extraction_timestamp;
  delete cleanScope._internal;

  // We'll try to match the DB's behavior but it's risky to rely on this for 
  // primary key generation without verifying against DB.
  // The DB trigger handles this, so we might not need to call this manually.
  
  const payload = {
    entity_id: entityId,
    attribute_id: attributeId,
    scope: cleanScope
  };

  // Canonicalize JSON (sort keys)
  const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort());

  return createHash('sha256')
    .update(canonicalJson)
    .digest('hex');
}
