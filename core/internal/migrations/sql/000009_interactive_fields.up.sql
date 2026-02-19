-- ========== ALTER TYPE: Add AWAITING_INPUT to document_status ==========

ALTER TYPE document_status ADD VALUE 'AWAITING_INPUT' AFTER 'DRAFT';

-- ========== TABLE: document_field_responses ==========

CREATE TABLE execution.document_field_responses (
    id              uuid            NOT NULL DEFAULT gen_random_uuid(),
    document_id     uuid            NOT NULL,
    recipient_id    uuid            NOT NULL,
    field_id        VARCHAR(100)    NOT NULL,
    field_type      VARCHAR(20)     NOT NULL,
    response        JSONB           NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_field_responses_pkey PRIMARY KEY (id)
);

-- ========== FOREIGN KEYS: document_field_responses ==========

ALTER TABLE execution.document_field_responses
    ADD CONSTRAINT fk_document_field_responses_document_id
    FOREIGN KEY (document_id) REFERENCES execution.documents (id) ON DELETE CASCADE;

ALTER TABLE execution.document_field_responses
    ADD CONSTRAINT fk_document_field_responses_recipient_id
    FOREIGN KEY (recipient_id) REFERENCES execution.document_recipients (id) ON DELETE CASCADE;

-- ========== UNIQUE CONSTRAINTS: document_field_responses ==========

ALTER TABLE execution.document_field_responses
    ADD CONSTRAINT uq_document_field_responses_document_field UNIQUE (document_id, field_id);

-- ========== INDEXES: document_field_responses ==========

CREATE INDEX idx_document_field_responses_document_id ON execution.document_field_responses (document_id);
CREATE INDEX idx_document_field_responses_recipient_id ON execution.document_field_responses (recipient_id);

-- ========== TABLE: document_access_tokens ==========

CREATE TABLE execution.document_access_tokens (
    id              uuid            NOT NULL DEFAULT gen_random_uuid(),
    document_id     uuid            NOT NULL,
    recipient_id    uuid            NOT NULL,
    token           VARCHAR(128)    NOT NULL,
    expires_at      TIMESTAMPTZ     NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_access_tokens_pkey PRIMARY KEY (id)
);

-- ========== FOREIGN KEYS: document_access_tokens ==========

ALTER TABLE execution.document_access_tokens
    ADD CONSTRAINT fk_document_access_tokens_document_id
    FOREIGN KEY (document_id) REFERENCES execution.documents (id) ON DELETE CASCADE;

ALTER TABLE execution.document_access_tokens
    ADD CONSTRAINT fk_document_access_tokens_recipient_id
    FOREIGN KEY (recipient_id) REFERENCES execution.document_recipients (id) ON DELETE CASCADE;

-- ========== UNIQUE CONSTRAINTS: document_access_tokens ==========

ALTER TABLE execution.document_access_tokens
    ADD CONSTRAINT uq_document_access_tokens_token UNIQUE (token);

-- ========== INDEXES: document_access_tokens ==========

CREATE INDEX idx_document_access_tokens_token ON execution.document_access_tokens (token);
CREATE INDEX idx_document_access_tokens_document_id ON execution.document_access_tokens (document_id);
CREATE INDEX idx_document_access_tokens_recipient_id ON execution.document_access_tokens (recipient_id);
