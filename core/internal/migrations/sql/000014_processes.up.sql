-- ========== Processes table for tenant-scoped process management ==========

CREATE TABLE content.processes (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    tenant_id UUID NOT NULL,
    code VARCHAR(255) NOT NULL,
    process_type VARCHAR(50) NOT NULL DEFAULT 'CANONICAL_NAME',
    name JSONB NOT NULL,
    description JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT processes_pkey PRIMARY KEY (id)
);

-- Foreign Keys
ALTER TABLE content.processes
    ADD CONSTRAINT fk_processes_tenant_id
    FOREIGN KEY (tenant_id)
    REFERENCES tenancy.tenants (id)
    ON DELETE CASCADE;

-- Unique Constraints
ALTER TABLE content.processes
    ADD CONSTRAINT uq_processes_tenant_code
    UNIQUE (tenant_id, code);

-- Check Constraints
ALTER TABLE content.processes ADD CONSTRAINT chk_processes_code_not_empty
    CHECK (code <> '');

ALTER TABLE content.processes ADD CONSTRAINT chk_processes_process_type
    CHECK (process_type IN ('ID', 'CANONICAL_NAME'));

-- Indexes
CREATE INDEX idx_processes_tenant_id ON content.processes (tenant_id);

-- Triggers: auto-update updated_at
CREATE TRIGGER trigger_processes_updated_at
    BEFORE UPDATE ON content.processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers: protect immutable code
CREATE OR REPLACE FUNCTION content.protect_process_code()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.code IS DISTINCT FROM NEW.code THEN
        RAISE EXCEPTION 'Process code cannot be modified after creation';
    END IF;
    IF OLD.process_type IS DISTINCT FROM NEW.process_type THEN
        RAISE EXCEPTION 'Process type cannot be modified after creation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_processes_protect_code
    BEFORE UPDATE ON content.processes
    FOR EACH ROW EXECUTE FUNCTION content.protect_process_code();

-- Seed: insert "default" process for every existing tenant
INSERT INTO content.processes (tenant_id, code, process_type, name, description)
SELECT t.id, 'DEFAULT', 'CANONICAL_NAME',
       '{"en":"Default","es":"Por defecto"}'::jsonb,
       '{"en":"Default process","es":"Proceso por defecto"}'::jsonb
FROM tenancy.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM content.processes p WHERE p.tenant_id = t.id AND p.code = 'DEFAULT'
);
