-- ========== DROP TABLES ==========

DROP TABLE IF EXISTS execution.document_access_tokens;
DROP TABLE IF EXISTS execution.document_field_responses;

-- NOTE: PostgreSQL does not support removing values from an ENUM type.
-- The AWAITING_INPUT value in document_status cannot be removed without
-- recreating the type, which requires updating all dependent columns.
-- This is intentionally left as-is for safety.
