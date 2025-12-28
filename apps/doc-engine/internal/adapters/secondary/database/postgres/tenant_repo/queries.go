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
		ORDER BY name`

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
)
