/**
 * Normalizes a tag name to a clean, consistent format.
 *
 * Rules applied:
 * - trim whitespace
 * - lowercase
 * - remove diacritics (á→a, ñ→n, etc.)
 * - replace spaces with underscores
 * - only allow a-z, 0-9, _, -
 * - collapse multiple underscores
 * - remove leading/trailing underscores
 * - max 50 characters
 *
 * @example
 * normalizeTagName("  Legal Docs  ") // "legal_docs"
 * normalizeTagName("CONTRATOS   2024") // "contratos_2024"
 * normalizeTagName("Año Fiscal") // "ano_fiscal"
 * normalizeTagName("##Special!!!") // "special"
 */
export function normalizeTagName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, '_') // spaces to underscore
    .replace(/[^a-z0-9_-]/g, '') // only allow a-z, 0-9, _, -
    .replace(/_+/g, '_') // collapse multiple underscores
    .replace(/^_|_$/g, '') // remove leading/trailing underscores
    .slice(0, 50);
}
