-- ========== SCHEMA ==========

CREATE SCHEMA IF NOT EXISTS execution;

-- ========== TABLE: documents ==========

CREATE TABLE execution.documents (
    id                          uuid            NOT NULL DEFAULT gen_random_uuid(),
    workspace_id                uuid            NOT NULL,
    template_version_id         uuid            NOT NULL,
    title                       VARCHAR(255),
    client_external_reference_id VARCHAR(255),
    transactional_id            VARCHAR(100)    NOT NULL,
    operation_type              VARCHAR(50)     NOT NULL,
    related_document_id         uuid,
    signer_document_id          VARCHAR(255),
    signer_provider             VARCHAR(255),
    status                      document_status NOT NULL DEFAULT 'DRAFT',
    injected_values_snapshot    JSONB,
    pdf_storage_path            VARCHAR(500),
    completed_pdf_url           VARCHAR(500),
    retry_count                 INT             NOT NULL DEFAULT 0,
    last_retry_at               TIMESTAMPTZ,
    next_retry_at               TIMESTAMPTZ,
    expires_at                  TIMESTAMPTZ,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ,
    CONSTRAINT documents_pkey PRIMARY KEY (id)
);

-- ========== FOREIGN KEYS: documents ==========

ALTER TABLE execution.documents
    ADD CONSTRAINT fk_documents_workspace_id
    FOREIGN KEY (workspace_id) REFERENCES tenancy.workspaces (id) ON DELETE RESTRICT;

ALTER TABLE execution.documents
    ADD CONSTRAINT fk_documents_template_version_id
    FOREIGN KEY (template_version_id) REFERENCES content.template_versions (id) ON DELETE RESTRICT;

ALTER TABLE execution.documents
    ADD CONSTRAINT fk_documents_related_document_id
    FOREIGN KEY (related_document_id) REFERENCES execution.documents (id) ON DELETE SET NULL;

-- ========== CHECK CONSTRAINTS: documents ==========

ALTER TABLE execution.documents
    ADD CONSTRAINT chk_related_document_not_self CHECK (
        related_document_id IS NULL OR related_document_id != id
    );

-- ========== INDEXES: documents ==========

CREATE INDEX idx_documents_workspace_id ON execution.documents (workspace_id);
CREATE INDEX idx_documents_template_version_id ON execution.documents (template_version_id);
CREATE INDEX idx_documents_client_external_reference_id ON execution.documents (client_external_reference_id);
CREATE INDEX idx_documents_signer_document_id ON execution.documents (signer_document_id);
CREATE INDEX idx_documents_status ON execution.documents (status);
CREATE INDEX idx_documents_created_at ON execution.documents (created_at);
CREATE INDEX idx_documents_transactional_id ON execution.documents (transactional_id);
CREATE INDEX idx_documents_operation_type ON execution.documents (operation_type);
CREATE INDEX idx_documents_related_document_id ON execution.documents (related_document_id);
CREATE INDEX idx_documents_status_next_retry_at ON execution.documents (status, next_retry_at);
CREATE INDEX idx_documents_expires_at ON execution.documents (expires_at);

-- ========== TRIGGER: documents ==========

CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON execution.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== TABLE: document_recipients ==========

CREATE TABLE execution.document_recipients (
    id                          uuid                NOT NULL DEFAULT gen_random_uuid(),
    document_id                 uuid                NOT NULL,
    template_version_role_id    uuid                NOT NULL,
    name                        VARCHAR(255)        NOT NULL,
    email                       VARCHAR(255)        NOT NULL,
    signer_recipient_id         VARCHAR(255),
    status                      recipient_status    NOT NULL DEFAULT 'PENDING',
    signed_at                   TIMESTAMPTZ,
    signing_url                 VARCHAR(500),
    created_at                  TIMESTAMPTZ         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ,
    CONSTRAINT document_recipients_pkey PRIMARY KEY (id)
);

-- ========== FOREIGN KEYS: document_recipients ==========

ALTER TABLE execution.document_recipients
    ADD CONSTRAINT fk_document_recipients_document_id
    FOREIGN KEY (document_id) REFERENCES execution.documents (id) ON DELETE CASCADE;

ALTER TABLE execution.document_recipients
    ADD CONSTRAINT fk_document_recipients_template_version_role_id
    FOREIGN KEY (template_version_role_id) REFERENCES content.template_version_signer_roles (id) ON DELETE RESTRICT;

-- ========== UNIQUE CONSTRAINTS: document_recipients ==========

ALTER TABLE execution.document_recipients
    ADD CONSTRAINT uq_document_recipients_document_role UNIQUE (document_id, template_version_role_id);

-- ========== INDEXES: document_recipients ==========

CREATE INDEX idx_document_recipients_document_id ON execution.document_recipients (document_id);
CREATE INDEX idx_document_recipients_template_version_role_id ON execution.document_recipients (template_version_role_id);
CREATE INDEX idx_document_recipients_email ON execution.document_recipients (email);
CREATE INDEX idx_document_recipients_status ON execution.document_recipients (status);

-- ========== TRIGGER: document_recipients ==========

CREATE TRIGGER trigger_document_recipients_updated_at
    BEFORE UPDATE ON execution.document_recipients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========== TABLE: document_events ==========

CREATE TABLE execution.document_events (
    id              uuid            NOT NULL DEFAULT gen_random_uuid(),
    document_id     uuid            NOT NULL,
    event_type      VARCHAR(50)     NOT NULL,
    actor_type      VARCHAR(20)     NOT NULL,
    actor_id        VARCHAR(255),
    old_status      VARCHAR(30),
    new_status      VARCHAR(30),
    recipient_id    uuid,
    metadata        JSONB,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT document_events_pkey PRIMARY KEY (id)
);

-- ========== FOREIGN KEYS: document_events ==========

ALTER TABLE execution.document_events
    ADD CONSTRAINT fk_document_events_document_id
    FOREIGN KEY (document_id) REFERENCES execution.documents (id) ON DELETE CASCADE;

-- ========== INDEXES: document_events ==========

CREATE INDEX idx_document_events_document_id ON execution.document_events (document_id);
CREATE INDEX idx_document_events_event_type ON execution.document_events (event_type);
CREATE INDEX idx_document_events_created_at ON execution.document_events (created_at);
