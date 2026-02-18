-- Restore settings column
ALTER TABLE tenancy.workspaces ADD COLUMN IF NOT EXISTS settings JSONB;

-- Drop unique index
DROP INDEX IF EXISTS tenancy.idx_unique_workspace_code_per_tenant;

-- Drop code column
ALTER TABLE tenancy.workspaces DROP COLUMN IF EXISTS code;

-- Restore original triggers
CREATE OR REPLACE FUNCTION tenancy.auto_create_system_workspace()
RETURNS TRIGGER AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION tenancy.create_workspace_sandbox()
RETURNS TRIGGER AS $$
BEGIN
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
