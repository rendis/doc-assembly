-- ========== DROP USER ACCESS HISTORY ==========

DROP TABLE IF EXISTS identity.user_access_history;

-- ========== DROP SYSTEM ROLES SYNC ==========

DROP TRIGGER IF EXISTS trigger_sync_system_role_memberships ON identity.system_roles;
DROP FUNCTION IF EXISTS identity.sync_system_role_memberships();

-- ========== DROP SYSTEM ROLES ==========

DROP TABLE IF EXISTS identity.system_roles;

-- ========== DROP TENANT MEMBERS ==========

DROP TABLE IF EXISTS identity.tenant_members;

-- ========== DROP WORKSPACE MEMBERS ==========

DROP TABLE IF EXISTS identity.workspace_members;

-- ========== DROP USERS ==========

DROP TABLE IF EXISTS identity.users;

-- ========== DROP SCHEMA ==========

DROP SCHEMA IF EXISTS identity CASCADE;
