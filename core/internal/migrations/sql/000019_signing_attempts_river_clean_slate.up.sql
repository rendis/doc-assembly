-- Clean-slate signing attempts + River redesign. No production compatibility is preserved.

-- Clear disposable signing execution state before replacing the schema.
DELETE FROM execution.document_access_tokens;
DELETE FROM execution.document_field_responses;
DELETE FROM execution.document_events;
DELETE FROM execution.document_recipients;
DELETE FROM execution.documents;

-- Replace document_status with the business projection statuses.
ALTER TABLE execution.documents ALTER COLUMN status DROP DEFAULT;
ALTER TYPE document_status RENAME TO document_status_legacy;
CREATE TYPE document_status AS ENUM (
    'DRAFT',
    'AWAITING_INPUT',
    'PREPARING_SIGNATURE',
    'READY_TO_SIGN',
    'SIGNING',
    'COMPLETED',
    'DECLINED',
    'CANCELLED',
    'INVALIDATED',
    'ERROR'
);
ALTER TABLE execution.documents
    ALTER COLUMN status TYPE document_status
    USING 'DRAFT'::document_status;
ALTER TABLE execution.documents ALTER COLUMN status SET DEFAULT 'DRAFT';
DROP TYPE document_status_legacy;

-- Document is now a business projection. Signing side effects are attempt-owned.
ALTER TABLE execution.documents
    DROP COLUMN IF EXISTS signer_document_id,
    DROP COLUMN IF EXISTS signer_provider,
    DROP COLUMN IF EXISTS pdf_storage_path,
    DROP COLUMN IF EXISTS retry_count,
    DROP COLUMN IF EXISTS last_retry_at,
    DROP COLUMN IF EXISTS next_retry_at,
    ADD COLUMN active_attempt_id uuid;

ALTER TABLE execution.document_recipients
    DROP COLUMN IF EXISTS signer_recipient_id,
    DROP COLUMN IF EXISTS signing_url;

ALTER TABLE execution.document_access_tokens
    ADD COLUMN attempt_id uuid;

-- Attempt-owned status types.
CREATE TYPE signing_attempt_status AS ENUM (
    'CREATED',
    'RENDERING',
    'PDF_READY',
    'READY_TO_SUBMIT',
    'SUBMITTING_PROVIDER',
    'PROVIDER_RETRY_WAITING',
    'SUBMISSION_UNKNOWN',
    'RECONCILING_PROVIDER',
    'SIGNING_READY',
    'SIGNING',
    'COMPLETED',
    'DECLINED',
    'INVALIDATED',
    'SUPERSEDED',
    'CANCELLED',
    'REQUIRES_REVIEW',
    'FAILED_PERMANENT'
);

CREATE TYPE provider_submit_phase AS ENUM (
    'BEFORE_REQUEST',
    'CREATE_PROVIDER_DOCUMENT',
    'ADD_RECIPIENTS',
    'CREATE_FIELDS',
    'DISTRIBUTE_DOCUMENT',
    'FETCH_SIGNING_REFERENCES'
);

CREATE TYPE provider_error_class AS ENUM (
    'TRANSIENT',
    'PERMANENT',
    'AMBIGUOUS',
    'CONFLICT_STALE'
);

CREATE TYPE provider_cleanup_status AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED_RETRYABLE',
    'FAILED_PERMANENT',
    'UNSUPPORTED'
);

CREATE TABLE execution.signing_attempts (
    id                            uuid                    NOT NULL DEFAULT gen_random_uuid(),
    document_id                   uuid                    NOT NULL,
    sequence                      integer                 NOT NULL,
    status                        signing_attempt_status  NOT NULL DEFAULT 'CREATED',
    render_started_at             timestamptz,
    pdf_storage_path              varchar(500),
    pdf_checksum                  varchar(128),
    pdf_checksum_algorithm        varchar(32),
    render_metadata               jsonb,
    signature_field_snapshot      jsonb,
    provider_upload_payload       jsonb,
    provider_name                 varchar(100),
    provider_correlation_key      varchar(255),
    provider_document_id          varchar(255),
    provider_submit_phase         provider_submit_phase,
    retry_count                   integer                 NOT NULL DEFAULT 0,
    next_retry_at                 timestamptz,
    last_error_class              provider_error_class,
    last_error_message            text,
    reconciliation_count          integer                 NOT NULL DEFAULT 0,
    next_reconciliation_at        timestamptz,
    cleanup_status                provider_cleanup_status,
    cleanup_action                varchar(32),
    cleanup_error                 text,
    processing_lease_owner        varchar(255),
    processing_lease_expires_at   timestamptz,
    invalidation_reason           text,
    created_at                    timestamptz             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                    timestamptz,
    terminal_at                   timestamptz,
    CONSTRAINT signing_attempts_pkey PRIMARY KEY (id),
    CONSTRAINT fk_signing_attempts_document_id FOREIGN KEY (document_id) REFERENCES execution.documents(id) ON DELETE CASCADE,
    CONSTRAINT uq_signing_attempts_document_sequence UNIQUE (document_id, sequence)
);

ALTER TABLE execution.documents
    ADD CONSTRAINT fk_documents_active_attempt_id
    FOREIGN KEY (active_attempt_id) REFERENCES execution.signing_attempts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX uq_signing_attempts_provider_document
    ON execution.signing_attempts (provider_name, provider_document_id)
    WHERE provider_document_id IS NOT NULL;

CREATE UNIQUE INDEX uq_signing_attempts_provider_correlation
    ON execution.signing_attempts (provider_name, provider_correlation_key)
    WHERE provider_correlation_key IS NOT NULL;

CREATE INDEX idx_signing_attempts_document_id ON execution.signing_attempts(document_id);
CREATE INDEX idx_signing_attempts_status_next_retry ON execution.signing_attempts(status, next_retry_at);
CREATE INDEX idx_signing_attempts_status_next_reconciliation ON execution.signing_attempts(status, next_reconciliation_at);
CREATE INDEX idx_signing_attempts_cleanup ON execution.signing_attempts(cleanup_status, updated_at);
CREATE INDEX idx_signing_attempts_lease ON execution.signing_attempts(processing_lease_expires_at);

CREATE TRIGGER trigger_signing_attempts_updated_at
    BEFORE UPDATE ON execution.signing_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE execution.signing_attempt_recipients (
    id                          uuid                NOT NULL DEFAULT gen_random_uuid(),
    attempt_id                  uuid                NOT NULL,
    document_recipient_id       uuid,
    template_version_role_id    uuid                NOT NULL,
    signer_order                integer             NOT NULL,
    email                       varchar(255)        NOT NULL,
    name                        varchar(255)        NOT NULL,
    provider_recipient_id       varchar(255),
    provider_signing_token      varchar(500),
    signing_url                 varchar(1000),
    status                      recipient_status    NOT NULL DEFAULT 'PENDING',
    signed_at                   timestamptz,
    created_at                  timestamptz         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  timestamptz,
    CONSTRAINT signing_attempt_recipients_pkey PRIMARY KEY (id),
    CONSTRAINT fk_signing_attempt_recipients_attempt_id FOREIGN KEY (attempt_id) REFERENCES execution.signing_attempts(id) ON DELETE CASCADE,
    CONSTRAINT fk_signing_attempt_recipients_document_recipient_id FOREIGN KEY (document_recipient_id) REFERENCES execution.document_recipients(id) ON DELETE SET NULL,
    CONSTRAINT fk_signing_attempt_recipients_role_id FOREIGN KEY (template_version_role_id) REFERENCES content.template_version_signer_roles(id) ON DELETE RESTRICT,
    CONSTRAINT uq_signing_attempt_recipients_attempt_role UNIQUE (attempt_id, template_version_role_id),
    CONSTRAINT uq_signing_attempt_recipients_signing_url UNIQUE (signing_url)
);

CREATE UNIQUE INDEX uq_signing_attempt_recipients_provider_id
    ON execution.signing_attempt_recipients(attempt_id, provider_recipient_id)
    WHERE provider_recipient_id IS NOT NULL;
CREATE INDEX idx_signing_attempt_recipients_attempt_id ON execution.signing_attempt_recipients(attempt_id);
CREATE INDEX idx_signing_attempt_recipients_document_recipient_id ON execution.signing_attempt_recipients(document_recipient_id);
CREATE INDEX idx_signing_attempt_recipients_status ON execution.signing_attempt_recipients(status);

CREATE TRIGGER trigger_signing_attempt_recipients_updated_at
    BEFORE UPDATE ON execution.signing_attempt_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE execution.signing_attempt_events (
    id                    uuid                    NOT NULL DEFAULT gen_random_uuid(),
    attempt_id            uuid                    NOT NULL,
    document_id           uuid                    NOT NULL,
    event_type            varchar(100)            NOT NULL,
    old_status            signing_attempt_status,
    new_status            signing_attempt_status,
    provider_name         varchar(100),
    provider_document_id  varchar(255),
    correlation_key       varchar(255),
    river_job_id          bigint,
    error_class           provider_error_class,
    metadata              jsonb,
    raw_payload           jsonb,
    created_at            timestamptz             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT signing_attempt_events_pkey PRIMARY KEY (id),
    CONSTRAINT fk_signing_attempt_events_attempt_id FOREIGN KEY (attempt_id) REFERENCES execution.signing_attempts(id) ON DELETE CASCADE,
    CONSTRAINT fk_signing_attempt_events_document_id FOREIGN KEY (document_id) REFERENCES execution.documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_signing_attempt_events_attempt_id ON execution.signing_attempt_events(attempt_id, created_at);
CREATE INDEX idx_signing_attempt_events_document_id ON execution.signing_attempt_events(document_id, created_at);
CREATE INDEX idx_signing_attempt_events_provider_document ON execution.signing_attempt_events(provider_name, provider_document_id);

ALTER TABLE execution.document_access_tokens
    ADD CONSTRAINT fk_document_access_tokens_attempt_id
    FOREIGN KEY (attempt_id) REFERENCES execution.signing_attempts(id) ON DELETE SET NULL;
CREATE INDEX idx_document_access_tokens_attempt_id ON execution.document_access_tokens(attempt_id);

CREATE OR REPLACE FUNCTION execution.enforce_document_active_attempt_same_document()
RETURNS trigger AS $$
DECLARE
    attempt_document_id uuid;
BEGIN
    IF NEW.active_attempt_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT document_id INTO attempt_document_id
    FROM execution.signing_attempts
    WHERE id = NEW.active_attempt_id;

    IF attempt_document_id IS NULL OR attempt_document_id <> NEW.id THEN
        RAISE EXCEPTION 'documents.active_attempt_id must reference an attempt for the same document';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER constraint_documents_active_attempt_same_document
    AFTER INSERT OR UPDATE OF active_attempt_id ON execution.documents
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION execution.enforce_document_active_attempt_same_document();

CREATE OR REPLACE FUNCTION execution.enforce_document_access_token_attempt_same_document()
RETURNS trigger AS $$
DECLARE
    attempt_document_id uuid;
BEGIN
    IF NEW.attempt_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT document_id INTO attempt_document_id
    FROM execution.signing_attempts
    WHERE id = NEW.attempt_id;

    IF attempt_document_id IS NULL OR attempt_document_id <> NEW.document_id THEN
        RAISE EXCEPTION 'document_access_tokens.attempt_id must reference an attempt for the same document';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER constraint_document_access_tokens_attempt_same_document
    AFTER INSERT OR UPDATE OF attempt_id, document_id ON execution.document_access_tokens
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION execution.enforce_document_access_token_attempt_same_document();
