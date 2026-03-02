-- ========== Add process fields to templates ==========

ALTER TABLE content.templates ADD COLUMN process VARCHAR(255) NOT NULL DEFAULT 'default';
ALTER TABLE content.templates ADD COLUMN process_type VARCHAR(50) NOT NULL DEFAULT 'CANONICAL_NAME';

ALTER TABLE content.templates ADD CONSTRAINT chk_templates_process_not_empty
    CHECK (process <> '');

ALTER TABLE content.templates ADD CONSTRAINT chk_templates_process_type
    CHECK (process_type IN ('ID', 'CANONICAL_NAME'));

-- Replace old unique index (workspace + docType) with process-aware one
DROP INDEX IF EXISTS content.idx_templates_workspace_document_type;

CREATE UNIQUE INDEX idx_templates_workspace_doctype_process
    ON content.templates (workspace_id, document_type_id, process)
    WHERE document_type_id IS NOT NULL;
