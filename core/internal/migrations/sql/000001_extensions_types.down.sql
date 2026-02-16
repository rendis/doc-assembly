-- ========== DROP EXECUTION ENUMs ==========

DROP TYPE IF EXISTS document_status;
DROP TYPE IF EXISTS recipient_status;

-- ========== DROP CONTENT ENUMs ==========

DROP TYPE IF EXISTS injectable_scope_type;
DROP TYPE IF EXISTS version_status;
DROP TYPE IF EXISTS injectable_data_type;

-- ========== DROP IDENTITY ENUMs ==========

DROP TYPE IF EXISTS membership_status;
DROP TYPE IF EXISTS workspace_role;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS tenant_role;
DROP TYPE IF EXISTS system_role;

-- ========== DROP TENANCY ENUMs ==========

DROP TYPE IF EXISTS workspace_status;
DROP TYPE IF EXISTS workspace_type;

-- ========== DROP Utility Functions ==========

DROP FUNCTION IF EXISTS update_updated_at_column();

-- ========== DROP PostgreSQL Extensions ==========

DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "pgcrypto";
