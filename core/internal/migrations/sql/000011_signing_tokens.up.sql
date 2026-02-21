-- Add token_type to document_access_tokens to distinguish PRE_SIGNING (interactive fields)
-- from SIGNING (direct signing flow, Path A) tokens.
ALTER TABLE execution.document_access_tokens
    ADD COLUMN token_type VARCHAR(20) NOT NULL DEFAULT 'PRE_SIGNING';

-- Index for looking up active tokens by recipient + type.
CREATE INDEX idx_dat_recipient_type
    ON execution.document_access_tokens (recipient_id, token_type) WHERE used_at IS NULL;
