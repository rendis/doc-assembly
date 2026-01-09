package workspacerepo

// SQL queries for workspace operations.
const (
	queryCreate = `
		INSERT INTO tenancy.workspaces (id, tenant_id, name, type, status, settings, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id`

	queryFindByID = `
		SELECT id, tenant_id, name, type, status, COALESCE(settings, '{}'),
		       is_sandbox, sandbox_of_id, created_at, updated_at
		FROM tenancy.workspaces
		WHERE id = $1`

	queryFindSandboxByParentID = `
		SELECT id, tenant_id, name, type, status, COALESCE(settings, '{}'),
		       is_sandbox, sandbox_of_id, created_at, updated_at
		FROM tenancy.workspaces
		WHERE sandbox_of_id = $1 AND is_sandbox = TRUE`

	queryFindByTenantPaginated = `
		SELECT w.id, w.tenant_id, w.name, w.type, w.status, COALESCE(w.settings, '{}'),
		       w.is_sandbox, w.sandbox_of_id, w.created_at, w.updated_at
		FROM tenancy.workspaces w
		LEFT JOIN identity.user_access_history h
			ON w.id = h.entity_id
			AND h.entity_type = 'WORKSPACE'
			AND h.user_id = $2
		WHERE w.tenant_id = $1 AND w.is_sandbox = FALSE
		ORDER BY h.accessed_at DESC NULLS LAST, w.name ASC
		LIMIT $3 OFFSET $4`

	queryCountByTenant = `
		SELECT COUNT(*) FROM tenancy.workspaces WHERE tenant_id = $1 AND is_sandbox = FALSE`

	querySearchByNameInTenant = `
		SELECT id, tenant_id, name, type, status, COALESCE(settings, '{}'),
		       is_sandbox, sandbox_of_id, created_at, updated_at
		FROM tenancy.workspaces
		WHERE tenant_id = $1 AND name ILIKE '%' || $2 || '%' AND is_sandbox = FALSE
		ORDER BY similarity(name, $2) DESC, name
		LIMIT $3`

	queryFindByUser = `
		SELECT w.id, w.tenant_id, w.name, w.type, w.status, COALESCE(w.settings, '{}'),
		       w.is_sandbox, w.sandbox_of_id, w.created_at, w.updated_at, m.role
		FROM tenancy.workspaces w
		INNER JOIN identity.workspace_members m ON w.id = m.workspace_id
		WHERE m.user_id = $1 AND m.membership_status = 'ACTIVE' AND w.status != 'ARCHIVED' AND w.is_sandbox = FALSE
		ORDER BY w.name`

	queryFindSystemByTenantNull = `
		SELECT id, tenant_id, name, type, status, COALESCE(settings, '{}'),
		       is_sandbox, sandbox_of_id, created_at, updated_at
		FROM tenancy.workspaces
		WHERE tenant_id IS NULL AND type = 'SYSTEM'`

	queryFindSystemByTenant = `
		SELECT id, tenant_id, name, type, status, COALESCE(settings, '{}'),
		       is_sandbox, sandbox_of_id, created_at, updated_at
		FROM tenancy.workspaces
		WHERE tenant_id = $1 AND type = 'SYSTEM'`

	queryUpdate = `
		UPDATE tenancy.workspaces
		SET name = $2, settings = $3, updated_at = $4
		WHERE id = $1`

	queryUpdateStatus = `
		UPDATE tenancy.workspaces
		SET status = $2, updated_at = NOW()
		WHERE id = $1`

	queryExistsSystemForTenantNull = `
		SELECT EXISTS(SELECT 1 FROM tenancy.workspaces WHERE tenant_id IS NULL AND type = 'SYSTEM')`

	queryExistsSystemForTenant = `
		SELECT EXISTS(SELECT 1 FROM tenancy.workspaces WHERE tenant_id = $1 AND type = 'SYSTEM')`
)
