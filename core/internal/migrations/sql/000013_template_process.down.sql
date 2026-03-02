-- Reverse process fields from templates

DROP INDEX IF EXISTS content.idx_templates_workspace_doctype_process;

CREATE UNIQUE INDEX idx_templates_workspace_document_type
    ON content.templates (workspace_id, document_type_id)
    WHERE document_type_id IS NOT NULL;

ALTER TABLE content.templates DROP CONSTRAINT IF EXISTS chk_templates_process_type;
ALTER TABLE content.templates DROP CONSTRAINT IF EXISTS chk_templates_process_not_empty;

ALTER TABLE content.templates DROP COLUMN IF EXISTS process_type;
ALTER TABLE content.templates DROP COLUMN IF EXISTS process;
