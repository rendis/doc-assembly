package templaterepo

// SQL queries for template operations.
const (
	queryCreate = `
		INSERT INTO content.templates (
			workspace_id, folder_id, title, is_public_library, created_at
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	queryFindByID = `
		SELECT id, workspace_id, folder_id, title, is_public_library, created_at, updated_at
		FROM content.templates
		WHERE id = $1`

	queryPublishedVersion = `
		SELECT id, template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, published_at, archived_at,
			published_by, archived_by, created_by, created_at, updated_at
		FROM content.template_versions
		WHERE template_id = $1 AND status = 'PUBLISHED'`

	queryVersionInjectables = `
		SELECT
			tvi.id, tvi.template_version_id, tvi.injectable_definition_id, tvi.is_required, tvi.default_value, tvi.created_at,
			id.id, id.workspace_id, id.key, id.label, id.description, id.data_type, id.created_at, id.updated_at
		FROM content.template_version_injectables tvi
		JOIN content.injectable_definitions id ON tvi.injectable_definition_id = id.id
		WHERE tvi.template_version_id = $1
		ORDER BY id.key`

	queryVersionSignerRoles = `
		SELECT id, template_version_id, role_name, anchor_string, signer_order, created_at, updated_at
		FROM content.template_version_signer_roles
		WHERE template_version_id = $1
		ORDER BY signer_order`

	queryTemplateTags = `
		SELECT t.id, t.workspace_id, t.name, t.color, t.created_at, t.updated_at
		FROM organizer.tags t
		JOIN content.template_tags tt ON t.id = tt.tag_id
		WHERE tt.template_id = $1
		ORDER BY t.name`

	queryFolder = `
		SELECT id, workspace_id, parent_id, name, created_at, updated_at
		FROM organizer.folders
		WHERE id = $1`

	queryAllVersions = `
		SELECT id, template_id, version_number, name, description, content_structure,
			status, scheduled_publish_at, scheduled_archive_at, published_at, archived_at,
			published_by, archived_by, created_by, created_at, updated_at
		FROM content.template_versions
		WHERE template_id = $1
		ORDER BY version_number DESC`

	queryFindByWorkspaceBase = `
		SELECT
			t.id, t.workspace_id, t.folder_id, t.title, t.is_public_library,
			t.created_at, t.updated_at,
			EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED') as has_published,
			(SELECT COUNT(*) FROM content.template_versions WHERE template_id = t.id AND status != 'ARCHIVED') as version_count,
			(SELECT version_number FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED' LIMIT 1) as published_version_number
		FROM content.templates t
		LEFT JOIN organizer.folders f ON t.folder_id = f.id
		WHERE t.workspace_id = $1`

	queryFindByFolder = `
		SELECT
			t.id, t.workspace_id, t.folder_id, t.title, t.is_public_library,
			t.created_at, t.updated_at,
			EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED') as has_published,
			(SELECT COUNT(*) FROM content.template_versions WHERE template_id = t.id AND status != 'ARCHIVED') as version_count,
			(SELECT version_number FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED' LIMIT 1) as published_version_number
		FROM content.templates t
		WHERE t.folder_id = $1
		ORDER BY t.title`

	queryFindPublicLibrary = `
		SELECT
			t.id, t.workspace_id, t.folder_id, t.title, t.is_public_library,
			t.created_at, t.updated_at,
			true as has_published,
			(SELECT COUNT(*) FROM content.template_versions WHERE template_id = t.id AND status != 'ARCHIVED') as version_count,
			(SELECT version_number FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED' LIMIT 1) as published_version_number
		FROM content.templates t
		WHERE t.is_public_library = true
			AND EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED')
		ORDER BY t.title`

	queryUpdate = `
		UPDATE content.templates
		SET title = $2, folder_id = $3, is_public_library = $4, updated_at = $5
		WHERE id = $1`

	queryDelete = `DELETE FROM content.templates WHERE id = $1`

	queryExistsByTitle = `SELECT EXISTS(SELECT 1 FROM content.templates WHERE workspace_id = $1 AND title = $2)`

	queryExistsByTitleExcluding = `SELECT EXISTS(SELECT 1 FROM content.templates WHERE workspace_id = $1 AND title = $2 AND id != $3)`

	queryCountByFolder = `SELECT COUNT(*) FROM content.templates WHERE folder_id = $1`

	queryTemplateTagsBatch = `
		SELECT tt.template_id, t.id, t.name, t.color
		FROM content.template_tags tt
		JOIN organizer.tags t ON t.id = tt.tag_id
		WHERE tt.template_id = ANY($1)
		ORDER BY t.name`
)
