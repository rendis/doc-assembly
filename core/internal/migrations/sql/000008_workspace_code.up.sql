-- ========== ADD CODE COLUMN TO WORKSPACES ==========

-- Step 1: Add nullable code column
ALTER TABLE tenancy.workspaces ADD COLUMN code VARCHAR(50);

-- Step 2: Backfill existing workspaces
-- SYSTEM workspaces get fixed code
UPDATE tenancy.workspaces SET code = 'SYS_WRKSP' WHERE type = 'SYSTEM' AND is_sandbox = FALSE;

-- CLIENT (non-sandbox) get normalized name: uppercase, spaces→underscores, strip invalid chars, truncate 50
UPDATE tenancy.workspaces
SET code = LEFT(
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                UPPER(name),
                '\s+', '_', 'g'
            ),
            '[^A-Z0-9_]', '', 'g'
        ),
        '_+', '_', 'g'
    ),
    50
)
WHERE type = 'CLIENT' AND is_sandbox = FALSE;

-- Trim leading/trailing underscores
UPDATE tenancy.workspaces
SET code = TRIM(BOTH '_' FROM code)
WHERE type = 'CLIENT' AND is_sandbox = FALSE AND code LIKE '\_%' OR code LIKE '%\_';

-- Handle empty code after normalization (fallback to 'WRKSP_' + short id)
UPDATE tenancy.workspaces
SET code = 'WRKSP_' || LEFT(id::text, 8)
WHERE (code IS NULL OR code = '') AND is_sandbox = FALSE;

-- Handle duplicate codes within same tenant by appending numeric suffix
DO $$
DECLARE
    dup RECORD;
    counter INT;
    new_code VARCHAR(50);
BEGIN
    FOR dup IN
        SELECT w.id, w.tenant_id, w.code
        FROM tenancy.workspaces w
        WHERE w.is_sandbox = FALSE
          AND EXISTS (
              SELECT 1 FROM tenancy.workspaces w2
              WHERE w2.tenant_id = w.tenant_id
                AND w2.code = w.code
                AND w2.is_sandbox = FALSE
                AND w2.id < w.id
          )
        ORDER BY w.tenant_id, w.code, w.id
    LOOP
        counter := 1;
        LOOP
            new_code := LEFT(dup.code, 46) || '_' || counter::text;
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM tenancy.workspaces
                WHERE tenant_id = dup.tenant_id
                  AND code = new_code
                  AND is_sandbox = FALSE
            );
            counter := counter + 1;
        END LOOP;
        UPDATE tenancy.workspaces SET code = new_code WHERE id = dup.id;
    END LOOP;
END $$;

-- Sandbox workspaces get 'SBX_' + parent code
UPDATE tenancy.workspaces s
SET code = 'SBX_' || p.code
FROM tenancy.workspaces p
WHERE s.sandbox_of_id = p.id
  AND s.is_sandbox = TRUE;

-- Fallback for sandbox without parent code
UPDATE tenancy.workspaces
SET code = 'SBX_' || LEFT(id::text, 8)
WHERE is_sandbox = TRUE AND (code IS NULL OR code = '');

-- Step 3: Make NOT NULL after backfill
ALTER TABLE tenancy.workspaces ALTER COLUMN code SET NOT NULL;

-- Step 4: Unique index per tenant (exclude sandbox workspaces)
CREATE UNIQUE INDEX idx_unique_workspace_code_per_tenant
  ON tenancy.workspaces (tenant_id, code) WHERE is_sandbox = FALSE;

-- ========== UPDATE TRIGGERS TO INCLUDE CODE ==========

-- Update auto_create_system_workspace to include code
CREATE OR REPLACE FUNCTION tenancy.auto_create_system_workspace()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip for system tenant (workspace created via seed)
    IF NEW.is_system = FALSE THEN
        INSERT INTO tenancy.workspaces (id, tenant_id, name, code, type, status)
        VALUES (
            gen_random_uuid(),
            NEW.id,
            NEW.name || ':System',
            'SYS_WRKSP',
            'SYSTEM',
            'ACTIVE'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update create_workspace_sandbox to include code (SBX_ + parent code)
CREATE OR REPLACE FUNCTION tenancy.create_workspace_sandbox()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create sandbox for CLIENT workspaces that are NOT sandbox themselves
    IF NEW.type = 'CLIENT' AND NEW.is_sandbox = FALSE THEN
        INSERT INTO tenancy.workspaces (
            tenant_id,
            name,
            code,
            type,
            status,
            is_sandbox,
            sandbox_of_id
        ) VALUES (
            NEW.tenant_id,
            NEW.name || ' (SANDBOX)',
            'SBX_' || NEW.code,
            'CLIENT',
            NEW.status,
            TRUE,
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== DROP SETTINGS COLUMN (no longer used) ==========

ALTER TABLE tenancy.workspaces DROP COLUMN IF EXISTS settings;
