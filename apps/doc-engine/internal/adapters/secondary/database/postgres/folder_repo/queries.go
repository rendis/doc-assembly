package folderrepo

// SQL queries for folder operations.
const (
	queryCreate = `
		INSERT INTO organizer.folders (id, workspace_id, parent_id, name, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	queryFindByID = `
		SELECT id, workspace_id, parent_id, name, path, created_at, updated_at
		FROM organizer.folders
		WHERE id = $1`

	queryFindByWorkspace = `
		SELECT id, workspace_id, parent_id, name, path, created_at, updated_at
		FROM organizer.folders
		WHERE workspace_id = $1
		ORDER BY name`

	queryFindByParentNull = `
		SELECT id, workspace_id, parent_id, name, path, created_at, updated_at
		FROM organizer.folders
		WHERE workspace_id = $1 AND parent_id IS NULL
		ORDER BY name`

	queryFindByParent = `
		SELECT id, workspace_id, parent_id, name, path, created_at, updated_at
		FROM organizer.folders
		WHERE workspace_id = $1 AND parent_id = $2
		ORDER BY name`

	queryUpdate = `
		UPDATE organizer.folders
		SET parent_id = $2, name = $3, updated_at = $4
		WHERE id = $1`

	queryDelete = `DELETE FROM organizer.folders WHERE id = $1`

	queryHasChildren = `SELECT EXISTS(SELECT 1 FROM organizer.folders WHERE parent_id = $1)`

	queryHasTemplates = `SELECT EXISTS(SELECT 1 FROM content.templates WHERE folder_id = $1)`

	queryExistsByNameAndParentNull = `
		SELECT EXISTS(SELECT 1 FROM organizer.folders WHERE workspace_id = $1 AND parent_id IS NULL AND name = $2)`

	queryExistsByNameAndParent = `
		SELECT EXISTS(SELECT 1 FROM organizer.folders WHERE workspace_id = $1 AND parent_id = $2 AND name = $3)`

	queryExistsByNameAndParentNullExcluding = `
		SELECT EXISTS(SELECT 1 FROM organizer.folders WHERE workspace_id = $1 AND parent_id IS NULL AND name = $2 AND id != $3)`

	queryExistsByNameAndParentExcluding = `
		SELECT EXISTS(SELECT 1 FROM organizer.folders WHERE workspace_id = $1 AND parent_id = $2 AND name = $3 AND id != $4)`
)
