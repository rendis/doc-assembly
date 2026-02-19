-- ========== SCHEMA ==========

CREATE SCHEMA IF NOT EXISTS automation;

-- ========== TABLE: api_keys ==========

CREATE TABLE automation.api_keys (
    id               uuid         NOT NULL DEFAULT gen_random_uuid(),
    name             VARCHAR(255) NOT NULL,
    key_hash         CHAR(64)     NOT NULL,
    key_prefix       VARCHAR(12)  NOT NULL,
    allowed_tenants  uuid[]       NULL,
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    created_by       uuid         NOT NULL,
    last_used_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    revoked_at       TIMESTAMPTZ,
    CONSTRAINT api_keys_pkey        PRIMARY KEY (id),
    CONSTRAINT uq_api_keys_key_hash UNIQUE      (key_hash)
);

-- ========== TABLE: audit_log ==========

CREATE TABLE automation.audit_log (
    id               uuid         NOT NULL DEFAULT gen_random_uuid(),
    api_key_id       uuid         NOT NULL,
    api_key_prefix   VARCHAR(12)  NOT NULL,
    method           VARCHAR(10)  NOT NULL,
    path             TEXT         NOT NULL,
    tenant_id        uuid,
    workspace_id     uuid,
    resource_type    VARCHAR(50),
    resource_id      uuid,
    action           VARCHAR(50),
    request_body     JSONB,
    response_status  SMALLINT,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

-- ========== INDEXES: audit_log ==========

CREATE INDEX idx_audit_log_api_key_id       ON automation.audit_log(api_key_id);
CREATE INDEX idx_audit_log_created_at       ON automation.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_resource_type_id ON automation.audit_log(resource_type, resource_id);

-- ========== FOREIGN KEYS: audit_log ==========

ALTER TABLE automation.audit_log
    ADD CONSTRAINT fk_audit_log_api_key_id
    FOREIGN KEY (api_key_id) REFERENCES automation.api_keys(id);
