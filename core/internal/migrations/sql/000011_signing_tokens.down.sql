DROP INDEX IF EXISTS execution.idx_dat_recipient_type;
ALTER TABLE execution.document_access_tokens DROP COLUMN IF EXISTS token_type;
