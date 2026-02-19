-- ========== DROP TABLES (order matters for FK dependencies) ==========

DROP TABLE IF EXISTS automation.audit_log;
DROP TABLE IF EXISTS automation.api_keys;

-- ========== DROP SCHEMA ==========

DROP SCHEMA IF EXISTS automation;
