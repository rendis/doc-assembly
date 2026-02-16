-- ========== Drop signing_workflow_config Column ==========

ALTER TABLE content.template_versions DROP COLUMN IF EXISTS signing_workflow_config;

-- ========== Drop template_tags ==========

DROP TABLE IF EXISTS content.template_tags;

-- ========== Drop template_version_signer_roles ==========

DROP TRIGGER IF EXISTS trigger_template_version_signer_roles_updated_at ON content.template_version_signer_roles;
DROP TABLE IF EXISTS content.template_version_signer_roles;

-- ========== Drop template_version_injectables ==========

DROP TABLE IF EXISTS content.template_version_injectables;

-- ========== Drop template_versions ==========

DROP TRIGGER IF EXISTS trigger_template_versions_updated_at ON content.template_versions;
DROP TABLE IF EXISTS content.template_versions;

-- ========== Drop templates ==========

DROP TRIGGER IF EXISTS trigger_templates_updated_at ON content.templates;
DROP TABLE IF EXISTS content.templates;

-- ========== Drop document_types ==========

DROP TRIGGER IF EXISTS trigger_document_types_protect_code ON content.document_types;
DROP TRIGGER IF EXISTS trigger_document_types_updated_at ON content.document_types;
DROP FUNCTION IF EXISTS content.protect_document_type_code();
DROP TABLE IF EXISTS content.document_types;

-- ========== Drop system_injectable_assignments ==========

DROP TABLE IF EXISTS content.system_injectable_assignments;

-- ========== Drop system_injectable_definitions ==========

DROP TRIGGER IF EXISTS trigger_system_injectable_definitions_updated_at ON content.system_injectable_definitions;
DROP TABLE IF EXISTS content.system_injectable_definitions;

-- ========== Drop injectable_definitions ==========

DROP TRIGGER IF EXISTS trigger_injectable_definitions_updated_at ON content.injectable_definitions;
DROP TABLE IF EXISTS content.injectable_definitions;

-- ========== Drop schema ==========

DROP SCHEMA IF EXISTS content CASCADE;
