package tenantrepo

// SQL queries for tenant operations.
const (
	queryCreate = `
		INSERT INTO tenancy.tenants (id, code, name, description, settings, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id`

	queryFindByID = `
		SELECT id, code, name, description, is_system, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE id = $1`

	queryFindByCode = `
		SELECT id, code, name, description, is_system, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE code = $1`

	queryFindAll = `
		SELECT id, code, name, description, is_system, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		ORDER BY is_system DESC, name`

	queryFindSystemTenant = `
		SELECT id, code, name, description, is_system, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE is_system = TRUE`

	queryUpdate = `
		UPDATE tenancy.tenants
		SET name = $2, description = $3, settings = $4, updated_at = $5
		WHERE id = $1`

	queryDelete = `DELETE FROM tenancy.tenants WHERE id = $1`

	queryExistsByCode = `
		SELECT EXISTS(SELECT 1 FROM tenancy.tenants WHERE code = $1)`

	// queryFindAllPaginated lists tenants with pagination.
	// Orders by most recent access first, then by name for those without access history.
	queryFindAllPaginated = `
		SELECT t.id, t.code, t.name, t.description, t.is_system, COALESCE(t.settings, '{}'), t.created_at, t.updated_at
		FROM tenancy.tenants t
		LEFT JOIN identity.user_access_history h
			ON t.id = h.entity_id
			AND h.entity_type = 'TENANT'
			AND h.user_id = $1
		ORDER BY h.accessed_at DESC NULLS LAST, t.name ASC
		LIMIT $2 OFFSET $3`

	queryCountAll = `SELECT COUNT(*) FROM tenancy.tenants`

	querySearchByNameOrCode = `
		SELECT id, code, name, description, is_system, COALESCE(settings, '{}'), created_at, updated_at
		FROM tenancy.tenants
		WHERE name % $1 OR code % $1
		ORDER BY is_system DESC, GREATEST(similarity(name, $1), similarity(code, $1)) DESC
		LIMIT $2`
)
