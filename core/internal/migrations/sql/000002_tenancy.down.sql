-- ========== DROP SANDBOX FUNCTIONS ==========

DROP FUNCTION IF EXISTS tenancy.sync_workspace_sandboxes();
DROP TRIGGER IF EXISTS trigger_sync_sandbox_status ON tenancy.workspaces;
DROP FUNCTION IF EXISTS tenancy.sync_sandbox_status();
DROP TRIGGER IF EXISTS trigger_sync_sandbox_name ON tenancy.workspaces;
DROP FUNCTION IF EXISTS tenancy.sync_sandbox_name();
DROP TRIGGER IF EXISTS trigger_protect_sandbox_fields ON tenancy.workspaces;
DROP FUNCTION IF EXISTS tenancy.protect_sandbox_fields();
DROP TRIGGER IF EXISTS trigger_create_workspace_sandbox ON tenancy.workspaces;
DROP FUNCTION IF EXISTS tenancy.create_workspace_sandbox();

-- ========== DROP WORKSPACES TRIGGERS ==========

DROP TRIGGER IF EXISTS trigger_protect_system_tenant_workspace ON tenancy.workspaces;
DROP FUNCTION IF EXISTS tenancy.protect_system_tenant_workspace();
DROP TRIGGER IF EXISTS trigger_validate_system_tenant_workspace ON tenancy.workspaces;
DROP FUNCTION IF EXISTS tenancy.validate_system_tenant_workspace();
DROP TRIGGER IF EXISTS trigger_workspaces_updated_at ON tenancy.workspaces;

-- ========== DROP WORKSPACES TABLE ==========

DROP TABLE IF EXISTS tenancy.workspaces;

-- ========== DROP TENANTS TRIGGERS ==========

DROP TRIGGER IF EXISTS trigger_auto_create_system_workspace ON tenancy.tenants;
DROP FUNCTION IF EXISTS tenancy.auto_create_system_workspace();
DROP TRIGGER IF EXISTS trigger_protect_system_tenant ON tenancy.tenants;
DROP FUNCTION IF EXISTS tenancy.protect_system_tenant();
DROP TRIGGER IF EXISTS trigger_tenants_updated_at ON tenancy.tenants;

-- ========== DROP TENANT STATUS ==========

DROP TYPE IF EXISTS tenancy.tenant_status;

-- ========== DROP TENANTS TABLE ==========

DROP TABLE IF EXISTS tenancy.tenants;

-- ========== DROP SCHEMA ==========

DROP SCHEMA IF EXISTS tenancy CASCADE;
