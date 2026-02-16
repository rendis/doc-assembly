package templateversionsignerrolerepo

// SQL queries for template version signer role operations.
const (
	queryCreate = `
		INSERT INTO content.template_version_signer_roles (
			template_version_id, role_name, anchor_string, signer_order, created_at
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	queryFindByID = `
		SELECT id, template_version_id, role_name, anchor_string, signer_order, created_at, updated_at
		FROM content.template_version_signer_roles
		WHERE id = $1`

	queryFindByVersionID = `
		SELECT id, template_version_id, role_name, anchor_string, signer_order, created_at, updated_at
		FROM content.template_version_signer_roles
		WHERE template_version_id = $1
		ORDER BY signer_order`

	queryUpdate = `
		UPDATE content.template_version_signer_roles
		SET role_name = $2, anchor_string = $3, signer_order = $4, updated_at = NOW()
		WHERE id = $1`

	queryDelete = `DELETE FROM content.template_version_signer_roles WHERE id = $1`

	queryDeleteByVersionID = `DELETE FROM content.template_version_signer_roles WHERE template_version_id = $1`

	queryExistsByAnchor = `SELECT EXISTS(SELECT 1 FROM content.template_version_signer_roles WHERE template_version_id = $1 AND anchor_string = $2)`

	queryExistsByAnchorExcluding = `SELECT EXISTS(SELECT 1 FROM content.template_version_signer_roles WHERE template_version_id = $1 AND anchor_string = $2 AND id != $3)`

	queryExistsByOrder = `SELECT EXISTS(SELECT 1 FROM content.template_version_signer_roles WHERE template_version_id = $1 AND signer_order = $2)`

	queryExistsByOrderExcluding = `SELECT EXISTS(SELECT 1 FROM content.template_version_signer_roles WHERE template_version_id = $1 AND signer_order = $2 AND id != $3)`

	queryCopyFromVersion = `
		INSERT INTO content.template_version_signer_roles (
			template_version_id, role_name, anchor_string, signer_order, created_at
		)
		SELECT $2, role_name, anchor_string, signer_order, NOW()
		FROM content.template_version_signer_roles
		WHERE template_version_id = $1`
)
