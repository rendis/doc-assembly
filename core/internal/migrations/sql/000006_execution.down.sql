-- ========== DROP TRIGGERS ==========

DROP TRIGGER IF EXISTS trigger_document_recipients_updated_at ON execution.document_recipients;
DROP TRIGGER IF EXISTS trigger_documents_updated_at ON execution.documents;

-- ========== DROP TABLES (order matters for FK dependencies) ==========

DROP TABLE IF EXISTS execution.document_events;
DROP TABLE IF EXISTS execution.document_recipients;
DROP TABLE IF EXISTS execution.documents;

-- ========== DROP SCHEMA ==========

DROP SCHEMA IF EXISTS execution CASCADE;
