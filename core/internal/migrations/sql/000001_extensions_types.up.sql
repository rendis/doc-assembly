-- ========== PostgreSQL Extensions ==========

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ========== Utility Functions ==========

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========== TENANCY ENUMs ==========

CREATE TYPE workspace_type AS ENUM ('SYSTEM', 'CLIENT');
CREATE TYPE workspace_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- ========== IDENTITY ENUMs ==========

CREATE TYPE system_role AS ENUM ('SUPERADMIN', 'PLATFORM_ADMIN');
CREATE TYPE tenant_role AS ENUM ('TENANT_OWNER', 'TENANT_ADMIN');
CREATE TYPE user_status AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
CREATE TYPE workspace_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'OPERATOR', 'VIEWER');
CREATE TYPE membership_status AS ENUM ('PENDING', 'ACTIVE');

-- ========== CONTENT ENUMs ==========

CREATE TYPE injectable_data_type AS ENUM ('TEXT', 'NUMBER', 'DATE', 'CURRENCY', 'BOOLEAN', 'IMAGE', 'TABLE');
CREATE TYPE version_status AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE injectable_scope_type AS ENUM ('PUBLIC', 'TENANT', 'WORKSPACE');

-- ========== EXECUTION ENUMs ==========

CREATE TYPE recipient_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'SIGNED', 'DECLINED');
CREATE TYPE document_status AS ENUM ('DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'VOIDED', 'EXPIRED', 'ERROR');

-- ========== ALTER TYPE: Add PENDING_PROVIDER ==========

ALTER TYPE document_status ADD VALUE 'PENDING_PROVIDER' BEFORE 'PENDING';
