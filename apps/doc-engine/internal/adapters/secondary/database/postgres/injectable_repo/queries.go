package injectablerepo

// SQL queries for injectable definitions (read-only operations).
const (
	queryFindByID = `
		SELECT id, workspace_id, key, label, description, data_type, source_type, metadata, created_at, updated_at
		FROM content.injectable_definitions
		WHERE id = $1`

	queryFindByWorkspace = `
		SELECT id, workspace_id, key, label, description, data_type, source_type, metadata, created_at, updated_at
		FROM content.injectable_definitions
		WHERE workspace_id = $1 OR workspace_id IS NULL
		ORDER BY key`

	queryFindGlobal = `
		SELECT id, workspace_id, key, label, description, data_type, source_type, metadata, created_at, updated_at
		FROM content.injectable_definitions
		WHERE workspace_id IS NULL
		ORDER BY key`

	queryFindByKeyGlobal = `
		SELECT id, workspace_id, key, label, description, data_type, source_type, metadata, created_at, updated_at
		FROM content.injectable_definitions
		WHERE workspace_id IS NULL AND key = $1`

	queryFindByKeyWorkspace = `
		SELECT id, workspace_id, key, label, description, data_type, source_type, metadata, created_at, updated_at
		FROM content.injectable_definitions
		WHERE (workspace_id = $1 OR workspace_id IS NULL) AND key = $2
		ORDER BY workspace_id NULLS LAST
		LIMIT 1`

	queryExistsByKeyGlobal = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id IS NULL AND key = $1)`

	queryExistsByKeyWorkspace = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id = $1 AND key = $2)`

	queryExistsByKeyGlobalExcluding = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id IS NULL AND key = $1 AND id != $2)`

	queryExistsByKeyWorkspaceExcluding = `
		SELECT EXISTS(SELECT 1 FROM content.injectable_definitions WHERE workspace_id = $1 AND key = $2 AND id != $3)`

	queryIsInUse = `
		SELECT EXISTS(SELECT 1 FROM content.template_version_injectables WHERE injectable_definition_id = $1)`

	queryGetVersionCount = `
		SELECT COUNT(*) FROM content.template_version_injectables WHERE injectable_definition_id = $1`
)
