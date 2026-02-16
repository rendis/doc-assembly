-- ========== CREATE SCHEMA ==========

CREATE SCHEMA IF NOT EXISTS tenancy;

-- ========== TENANTS TABLE ==========

CREATE TABLE tenancy.tenants (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    description VARCHAR(500),
    is_system BOOLEAN DEFAULT FALSE NOT NULL,
    settings JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT tenants_pkey PRIMARY KEY (id),
    CONSTRAINT tenants_code_key UNIQUE (code)
);

-- ========== TENANTS INDEXES ==========

CREATE INDEX idx_tenants_code ON tenancy.tenants (code);

CREATE UNIQUE INDEX idx_unique_system_tenant
ON tenancy.tenants (is_system)
WHERE is_system = TRUE;

CREATE INDEX idx_tenants_name_trgm
ON tenancy.tenants USING GIN (name gin_trgm_ops);

CREATE INDEX idx_tenants_code_trgm
ON tenancy.tenants USING GIN (code gin_trgm_ops);

-- ========== TENANTS TRIGGERS ==========

CREATE TRIGGER trigger_tenants_updated_at
BEFORE UPDATE ON tenancy.tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION tenancy.protect_system_tenant()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.is_system = TRUE THEN
            RAISE EXCEPTION 'Cannot delete system tenant';
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_system = TRUE THEN
            IF NEW.is_system != OLD.is_system OR
               NEW.code != OLD.code OR
               NEW.name != OLD.name THEN
                RAISE EXCEPTION 'Cannot modify protected fields of system tenant';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protect_system_tenant
BEFORE UPDATE OR DELETE ON tenancy.tenants
FOR EACH ROW EXECUTE FUNCTION tenancy.protect_system_tenant();

CREATE OR REPLACE FUNCTION tenancy.auto_create_system_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip for system tenant (workspace created via seed)
    IF NEW.is_system = FALSE THEN
        INSERT INTO tenancy.workspaces (id, tenant_id, name, type, status)
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.name || ':System',
            'SYSTEM',
            'ACTIVE'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_system_workspace
AFTER INSERT ON tenancy.tenants
FOR EACH ROW EXECUTE FUNCTION tenancy.auto_create_system_workspace();

-- ========== TENANT STATUS ENUM AND COLUMN ==========

CREATE TYPE tenancy.tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

ALTER TABLE tenancy.tenants
ADD COLUMN status tenancy.tenant_status NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX idx_tenants_status ON tenancy.tenants (status);

-- ========== TENANTS SEED DATA ==========

INSERT INTO tenancy.tenants (id, name, code, description, is_system)
VALUES (gen_random_uuid(), 'System', 'SYS', 'System tenant for global templates', TRUE);

-- ========== WORKSPACES TABLE ==========

CREATE TABLE tenancy.workspaces (
    id UUID DEFAULT gen_random_uuid() NOT NULL,
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type workspace_type NOT NULL,
    status workspace_status DEFAULT 'ACTIVE' NOT NULL,
    settings JSONB,
    is_sandbox BOOLEAN DEFAULT FALSE NOT NULL,
    sandbox_of_id UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ,
    CONSTRAINT workspaces_pkey PRIMARY KEY (id)
);

-- ========== WORKSPACES FOREIGN KEYS ==========

ALTER TABLE tenancy.workspaces
ADD CONSTRAINT fk_workspaces_tenant_id
FOREIGN KEY (tenant_id) REFERENCES tenancy.tenants (id) ON DELETE RESTRICT;

ALTER TABLE tenancy.workspaces
ADD CONSTRAINT fk_workspaces_sandbox_of
FOREIGN KEY (sandbox_of_id) REFERENCES tenancy.workspaces (id) ON DELETE CASCADE;

-- ========== WORKSPACES CHECK CONSTRAINTS ==========

ALTER TABLE tenancy.workspaces
ADD CONSTRAINT chk_sandbox_requires_parent
CHECK (
    (is_sandbox = FALSE AND sandbox_of_id IS NULL)
    OR
    (is_sandbox = TRUE AND sandbox_of_id IS NOT NULL)
);

-- ========== WORKSPACES UNIQUE PARTIAL INDEXES ==========

CREATE UNIQUE INDEX idx_unique_tenant_system_workspace
ON tenancy.workspaces (tenant_id, type)
WHERE type = 'SYSTEM';

CREATE UNIQUE INDEX idx_unique_sandbox_per_workspace
ON tenancy.workspaces(sandbox_of_id)
WHERE is_sandbox = TRUE;

-- ========== WORKSPACES REGULAR INDEXES ==========

CREATE INDEX idx_workspaces_tenant_id ON tenancy.workspaces (tenant_id);
CREATE INDEX idx_workspaces_status ON tenancy.workspaces (status);
CREATE INDEX idx_workspaces_type ON tenancy.workspaces (type);

CREATE INDEX idx_workspaces_name_trgm
ON tenancy.workspaces USING GIN (name gin_trgm_ops);

CREATE INDEX idx_workspaces_sandbox_of_id
ON tenancy.workspaces(sandbox_of_id)
WHERE sandbox_of_id IS NOT NULL;

CREATE INDEX idx_workspaces_is_sandbox ON tenancy.workspaces (is_sandbox);

-- ========== WORKSPACES TRIGGERS ==========

CREATE TRIGGER trigger_workspaces_updated_at
BEFORE UPDATE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION tenancy.validate_system_tenant_workspace()
RETURNS TRIGGER AS $$
DECLARE
    v_is_system_tenant BOOLEAN;
    v_workspace_count INTEGER;
BEGIN
    SELECT is_system INTO v_is_system_tenant
    FROM tenancy.tenants
    WHERE id = NEW.tenant_id;

    IF v_is_system_tenant = TRUE THEN
        IF NEW.type != 'SYSTEM' THEN
            RAISE EXCEPTION 'System tenant can only have SYSTEM type workspaces';
        END IF;

        SELECT COUNT(*) INTO v_workspace_count
        FROM tenancy.workspaces
        WHERE tenant_id = NEW.tenant_id
          AND (TG_OP = 'INSERT' OR id != NEW.id);

        IF v_workspace_count >= 1 THEN
            RAISE EXCEPTION 'System tenant can only have one workspace';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_system_tenant_workspace
BEFORE INSERT OR UPDATE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION tenancy.validate_system_tenant_workspace();

CREATE OR REPLACE FUNCTION tenancy.protect_system_tenant_workspace()
RETURNS TRIGGER AS $$
DECLARE
    v_is_system_tenant BOOLEAN;
BEGIN
    SELECT is_system INTO v_is_system_tenant
    FROM tenancy.tenants
    WHERE id = OLD.tenant_id;

    IF v_is_system_tenant = TRUE THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Cannot delete system tenant workspace';
        ELSIF TG_OP = 'UPDATE' THEN
            IF NEW.name != OLD.name OR
               NEW.type != OLD.type OR
               NEW.tenant_id != OLD.tenant_id THEN
                RAISE EXCEPTION 'Cannot modify protected fields of system tenant workspace';
            END IF;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protect_system_tenant_workspace
BEFORE UPDATE OR DELETE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION tenancy.protect_system_tenant_workspace();

-- ========== WORKSPACES SEED DATA ==========

INSERT INTO tenancy.workspaces (id, tenant_id, name, type, status)
SELECT gen_random_uuid(),
       t.id,
       'System Workspace',
       'SYSTEM',
       'ACTIVE'
FROM tenancy.tenants t
WHERE t.is_system = TRUE;

-- ========== WORKSPACE SANDBOX FUNCTIONS & TRIGGERS ==========

CREATE OR REPLACE FUNCTION tenancy.create_workspace_sandbox()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create sandbox for CLIENT workspaces that are NOT sandbox themselves
    IF NEW.type = 'CLIENT' AND NEW.is_sandbox = FALSE THEN
        INSERT INTO tenancy.workspaces (
            tenant_id,
            name,
            type,
            status,
            settings,
            is_sandbox,
            sandbox_of_id
        ) VALUES (
            NEW.tenant_id,
            NEW.name || ' (SANDBOX)',
            'CLIENT',
            NEW.status,
            NEW.settings,
            TRUE,
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_workspace_sandbox
AFTER INSERT ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION tenancy.create_workspace_sandbox();

CREATE OR REPLACE FUNCTION tenancy.protect_sandbox_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow if in sync mode (session variable)
    IF current_setting('tenancy.sync_mode', TRUE) = 'true' THEN
        RETURN NEW;
    END IF;

    -- If it's a sandbox, protect certain fields
    IF OLD.is_sandbox = TRUE THEN
        -- Don't allow changing name directly
        IF OLD.name IS DISTINCT FROM NEW.name THEN
            RAISE EXCEPTION 'Cannot directly modify sandbox workspace name. Update the parent workspace instead.';
        END IF;

        -- Don't allow changing is_sandbox
        IF OLD.is_sandbox IS DISTINCT FROM NEW.is_sandbox THEN
            RAISE EXCEPTION 'Cannot change is_sandbox flag on a sandbox workspace.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_protect_sandbox_fields
BEFORE UPDATE ON tenancy.workspaces
FOR EACH ROW EXECUTE FUNCTION tenancy.protect_sandbox_fields();

CREATE OR REPLACE FUNCTION tenancy.sync_sandbox_name()
RETURNS TRIGGER AS $$
BEGIN
    -- If name changed on a CLIENT prod workspace, update its sandbox
    IF NEW.type = 'CLIENT'
       AND NEW.is_sandbox = FALSE
       AND OLD.name IS DISTINCT FROM NEW.name THEN
        -- Enable sync mode to bypass protection
        PERFORM set_config('tenancy.sync_mode', 'true', TRUE);

        UPDATE tenancy.workspaces
        SET name = NEW.name || ' (SANDBOX)'
        WHERE sandbox_of_id = NEW.id AND is_sandbox = TRUE;

        -- Disable sync mode
        PERFORM set_config('tenancy.sync_mode', 'false', TRUE);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_sandbox_name
AFTER UPDATE OF name ON tenancy.workspaces
FOR EACH ROW
WHEN (OLD.name IS DISTINCT FROM NEW.name)
EXECUTE FUNCTION tenancy.sync_sandbox_name();

CREATE OR REPLACE FUNCTION tenancy.sync_sandbox_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed on a prod workspace, update its sandbox
    IF NEW.is_sandbox = FALSE
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE tenancy.workspaces
        SET status = NEW.status
        WHERE sandbox_of_id = NEW.id AND is_sandbox = TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_sandbox_status
AFTER UPDATE OF status ON tenancy.workspaces
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION tenancy.sync_sandbox_status();

CREATE OR REPLACE FUNCTION tenancy.sync_workspace_sandboxes()
RETURNS TABLE (
    action TEXT,
    workspace_id UUID,
    workspace_name VARCHAR,
    sandbox_id UUID,
    sandbox_name VARCHAR
) AS $$
DECLARE
    r RECORD;
    new_sandbox_id UUID;
BEGIN
    -- Enable sync mode to bypass protection
    PERFORM set_config('tenancy.sync_mode', 'true', TRUE);

    -- 1. Create missing sandboxes
    FOR r IN
        SELECT w.id, w.tenant_id, w.name, w.status, w.settings
        FROM tenancy.workspaces w
        WHERE w.type = 'CLIENT'
          AND w.is_sandbox = FALSE
          AND NOT EXISTS (
              SELECT 1 FROM tenancy.workspaces s
              WHERE s.sandbox_of_id = w.id AND s.is_sandbox = TRUE
          )
    LOOP
        INSERT INTO tenancy.workspaces (
            tenant_id, name, type, status, settings, is_sandbox, sandbox_of_id
        ) VALUES (
            r.tenant_id,
            r.name || ' (SANDBOX)',
            'CLIENT',
            r.status,
            r.settings,
            TRUE,
            r.id
        )
        RETURNING id INTO new_sandbox_id;

        action := 'CREATED';
        workspace_id := r.id;
        workspace_name := r.name;
        sandbox_id := new_sandbox_id;
        sandbox_name := r.name || ' (SANDBOX)';
        RETURN NEXT;
    END LOOP;

    -- 2. Fix desynchronized sandbox names
    FOR r IN
        SELECT
            p.id as prod_id,
            p.name as prod_name,
            s.id as sandbox_id,
            s.name as sandbox_name,
            p.name || ' (SANDBOX)' as expected_name
        FROM tenancy.workspaces p
        INNER JOIN tenancy.workspaces s ON s.sandbox_of_id = p.id AND s.is_sandbox = TRUE
        WHERE p.type = 'CLIENT'
          AND p.is_sandbox = FALSE
          AND s.name != p.name || ' (SANDBOX)'
    LOOP
        UPDATE tenancy.workspaces
        SET name = r.expected_name
        WHERE id = r.sandbox_id;

        action := 'RENAMED';
        workspace_id := r.prod_id;
        workspace_name := r.prod_name;
        sandbox_id := r.sandbox_id;
        sandbox_name := r.expected_name;
        RETURN NEXT;
    END LOOP;

    -- Disable sync mode
    PERFORM set_config('tenancy.sync_mode', 'false', TRUE);

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION tenancy.sync_workspace_sandboxes() IS
'Synchronizes sandboxes for CLIENT workspaces: creates missing ones and fixes desynchronized names.
Usage: SELECT * FROM tenancy.sync_workspace_sandboxes();';
