-- Best-effort rollback for local development only. The redesign is intentionally clean-slate.
DROP TRIGGER IF EXISTS constraint_document_access_tokens_attempt_same_document ON execution.document_access_tokens;
DROP FUNCTION IF EXISTS execution.enforce_document_access_token_attempt_same_document();
DROP TRIGGER IF EXISTS constraint_documents_active_attempt_same_document ON execution.documents;
DROP FUNCTION IF EXISTS execution.enforce_document_active_attempt_same_document();
ALTER TABLE execution.document_access_tokens DROP CONSTRAINT IF EXISTS fk_document_access_tokens_attempt_id;
ALTER TABLE execution.document_access_tokens DROP COLUMN IF EXISTS attempt_id;
ALTER TABLE execution.documents DROP CONSTRAINT IF EXISTS fk_documents_active_attempt_id;
ALTER TABLE execution.documents DROP COLUMN IF EXISTS active_attempt_id;
DROP TABLE IF EXISTS execution.signing_attempt_events;
DROP TABLE IF EXISTS execution.signing_attempt_recipients;
DROP TABLE IF EXISTS execution.signing_attempts;
DROP TYPE IF EXISTS provider_cleanup_status;
DROP TYPE IF EXISTS provider_error_class;
DROP TYPE IF EXISTS provider_submit_phase;
DROP TYPE IF EXISTS signing_attempt_status;
