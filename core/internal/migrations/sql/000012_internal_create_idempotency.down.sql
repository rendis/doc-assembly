-- ========== rollback 000012 INTERNAL CREATE V1 ==========

DROP INDEX IF EXISTS idx_documents_is_active;
DROP INDEX IF EXISTS idx_documents_workspace_document_type_external;
DROP INDEX IF EXISTS uq_documents_active_logical_key;

ALTER TABLE execution.documents
    DROP CONSTRAINT IF EXISTS uq_documents_workspace_transactional_id;

ALTER TABLE execution.documents
    DROP CONSTRAINT IF EXISTS fk_documents_superseded_by_document_id;

ALTER TABLE execution.documents
    DROP CONSTRAINT IF EXISTS fk_documents_document_type_id;

ALTER TABLE execution.documents
    DROP COLUMN IF EXISTS supersede_reason,
    DROP COLUMN IF EXISTS superseded_by_document_id,
    DROP COLUMN IF EXISTS superseded_at,
    DROP COLUMN IF EXISTS is_active,
    DROP COLUMN IF EXISTS document_type_id;
