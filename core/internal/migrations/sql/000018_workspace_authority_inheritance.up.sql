-- Remove legacy persisted workspace owners. Workspace ownership is now inherited
-- from SUPERADMIN and TENANT_OWNER instead of materialized in workspace_members.
DELETE FROM identity.workspace_members
WHERE role = 'OWNER';

CREATE OR REPLACE FUNCTION identity.sync_system_role_memberships()
RETURNS TRIGGER AS $$
DECLARE
    v_system_tenant_id UUID;
    v_system_workspace_id UUID;
    v_tenant_role tenant_role;
    v_workspace_role workspace_role;
BEGIN
    SELECT id INTO v_system_tenant_id
    FROM tenancy.tenants
    WHERE is_system = TRUE;

    SELECT id INTO v_system_workspace_id
    FROM tenancy.workspaces
    WHERE tenant_id = v_system_tenant_id
      AND type = 'SYSTEM';

    IF v_system_tenant_id IS NULL OR v_system_workspace_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    IF TG_OP = 'DELETE' THEN
        DELETE FROM identity.tenant_members
        WHERE user_id = OLD.user_id
          AND tenant_id = v_system_tenant_id;

        DELETE FROM identity.workspace_members
        WHERE user_id = OLD.user_id
          AND workspace_id = v_system_workspace_id;

        RETURN OLD;
    END IF;

    IF NEW.role = 'SUPERADMIN' THEN
        v_tenant_role := 'TENANT_OWNER';
        v_workspace_role := NULL;
    ELSIF NEW.role = 'PLATFORM_ADMIN' THEN
        v_tenant_role := 'TENANT_ADMIN';
        v_workspace_role := 'ADMIN';
    END IF;

    INSERT INTO identity.tenant_members (tenant_id, user_id, role, membership_status, granted_by)
    VALUES (v_system_tenant_id, NEW.user_id, v_tenant_role, 'ACTIVE', NEW.granted_by)
    ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    IF v_workspace_role IS NULL THEN
        DELETE FROM identity.workspace_members
        WHERE user_id = NEW.user_id
          AND workspace_id = v_system_workspace_id;
    ELSE
        INSERT INTO identity.workspace_members (workspace_id, user_id, role, membership_status, invited_by, joined_at)
        VALUES (v_system_workspace_id, NEW.user_id, v_workspace_role, 'ACTIVE', NEW.granted_by, CURRENT_TIMESTAMP)
        ON CONFLICT (workspace_id, user_id) DO UPDATE
        SET role = EXCLUDED.role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

