package templateversioninjectablerepo

// SQL queries for template version injectable operations.
const (
	queryCreate = `
		INSERT INTO content.template_version_injectables (
			template_version_id, injectable_definition_id, is_required, default_value, created_at
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	queryFindByID = `
		SELECT id, template_version_id, injectable_definition_id, is_required, default_value, created_at
		FROM content.template_version_injectables
		WHERE id = $1`

	queryFindByVersionID = `
		SELECT
			tvi.id, tvi.template_version_id, tvi.injectable_definition_id, tvi.is_required, tvi.default_value, tvi.created_at,
			id.id, id.workspace_id, id.key, id.label, id.description, id.data_type, id.created_at, id.updated_at
		FROM content.template_version_injectables tvi
		JOIN content.injectable_definitions id ON tvi.injectable_definition_id = id.id
		WHERE tvi.template_version_id = $1
		ORDER BY id.key`

	queryUpdate = `
		UPDATE content.template_version_injectables
		SET is_required = $2, default_value = $3
		WHERE id = $1`

	queryDelete = `DELETE FROM content.template_version_injectables WHERE id = $1`

	queryDeleteByVersionID = `DELETE FROM content.template_version_injectables WHERE template_version_id = $1`

	queryExists = `SELECT EXISTS(SELECT 1 FROM content.template_version_injectables WHERE template_version_id = $1 AND injectable_definition_id = $2)`

	queryCopyFromVersion = `
		INSERT INTO content.template_version_injectables (
			template_version_id, injectable_definition_id, is_required, default_value, created_at
		)
		SELECT $2, injectable_definition_id, is_required, default_value, NOW()
		FROM content.template_version_injectables
		WHERE template_version_id = $1`
)
