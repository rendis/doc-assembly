-- ========== INTERNAL CREATE V1: idempotency + active document model ==========

-- 1) Structural columns
ALTER TABLE execution.documents
    ADD COLUMN document_type_id UUID,
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN superseded_at TIMESTAMPTZ,
    ADD COLUMN superseded_by_document_id UUID,
    ADD COLUMN supersede_reason TEXT;

-- 2) Backfill document_type_id from template version -> template
UPDATE execution.documents d
SET document_type_id = t.document_type_id
FROM content.template_versions tv
JOIN content.templates t ON t.id = tv.template_id
WHERE d.template_version_id = tv.id
  AND d.document_type_id IS NULL;

-- 3) Validate backfill (hard fail if unresolved)
DO $$
DECLARE
    unresolved_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO unresolved_count
    FROM execution.documents
    WHERE document_type_id IS NULL;

    IF unresolved_count > 0 THEN
        RAISE EXCEPTION 'Cannot apply 000012: % documents have unresolved document_type_id', unresolved_count;
    END IF;
END $$;

-- 4) Deduplicate active logical key before unique partial index
WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY workspace_id, client_external_reference_id, document_type_id
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM execution.documents
    WHERE is_active = TRUE
      AND client_external_reference_id IS NOT NULL
)
UPDATE execution.documents d
SET
    is_active = FALSE,
    superseded_at = NOW(),
    supersede_reason = 'MIGRATION_DEDUP',
    updated_at = NOW()
FROM ranked r
WHERE d.id = r.id
  AND r.rn > 1;

-- 5) Deduplicate workspace transactional IDs before unique constraint
WITH ranked AS (
    SELECT
        id,
        transactional_id,
        row_number() OVER (
            PARTITION BY workspace_id, transactional_id
            ORDER BY created_at ASC, id ASC
        ) AS rn
    FROM execution.documents
)
UPDATE execution.documents d
SET
    transactional_id = LEFT(COALESCE(r.transactional_id, ''), 80) || '_MIG_' || LEFT(d.id::text, 8),
    updated_at = NOW()
FROM ranked r
WHERE d.id = r.id
  AND r.rn > 1;

-- 6) Enforce NOT NULL for document_type_id after clean backfill
ALTER TABLE execution.documents
    ALTER COLUMN document_type_id SET NOT NULL;

-- 7) Constraints and indexes for new internal create model
ALTER TABLE execution.documents
    ADD CONSTRAINT fk_documents_document_type_id
        FOREIGN KEY (document_type_id) REFERENCES content.document_types (id) ON DELETE RESTRICT;

ALTER TABLE execution.documents
    ADD CONSTRAINT fk_documents_superseded_by_document_id
        FOREIGN KEY (superseded_by_document_id) REFERENCES execution.documents (id) ON DELETE SET NULL;

ALTER TABLE execution.documents
    ADD CONSTRAINT uq_documents_workspace_transactional_id
        UNIQUE (workspace_id, transactional_id);

CREATE UNIQUE INDEX uq_documents_active_logical_key
    ON execution.documents (workspace_id, client_external_reference_id, document_type_id)
    WHERE is_active = TRUE AND client_external_reference_id IS NOT NULL;

CREATE INDEX idx_documents_workspace_document_type_external
    ON execution.documents (workspace_id, document_type_id, client_external_reference_id);

CREATE INDEX idx_documents_is_active
    ON execution.documents (is_active);
