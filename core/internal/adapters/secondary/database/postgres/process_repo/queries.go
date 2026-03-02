package processrepo

// SQL queries for process operations.
const (
	queryCreate = `
		INSERT INTO content.processes (tenant_id, code, process_type, name, description)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`

	queryFindByID = `
		SELECT id, tenant_id, code, process_type, name, COALESCE(description, '{}'), created_at, updated_at
		FROM content.processes
		WHERE id = $1`

	queryFindByCode = `
		SELECT id, tenant_id, code, process_type, name, COALESCE(description, '{}'), created_at, updated_at
		FROM content.processes
		WHERE tenant_id = $1 AND code = $2`

	queryFindByTenant = `
		SELECT id, tenant_id, code, process_type, name, COALESCE(description, '{}'), created_at, updated_at
		FROM content.processes
		WHERE tenant_id = $1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')
		ORDER BY code ASC
		LIMIT $3 OFFSET $4`

	queryCountByTenant = `
		SELECT COUNT(*) FROM content.processes
		WHERE tenant_id = $1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')`

	queryFindByTenantWithTemplateCount = `
		SELECT
			p.id, p.tenant_id, p.code, p.process_type, p.name, COALESCE(p.description, '{}'),
			COALESCE((
				SELECT COUNT(*) FROM content.templates t
				JOIN tenancy.workspaces w ON w.id = t.workspace_id
				WHERE w.tenant_id = p.tenant_id AND t.process = p.code
			), 0) as templates_count,
			p.created_at, p.updated_at
		FROM content.processes p
		WHERE p.tenant_id = $1
		  AND ($2 = '' OR p.code ILIKE '%' || $2 || '%')
		ORDER BY p.code ASC
		LIMIT $3 OFFSET $4`

	queryUpdate = `
		UPDATE content.processes
		SET name = $2, description = $3
		WHERE id = $1`

	queryDelete = `DELETE FROM content.processes WHERE id = $1`

	queryExistsByCode = `
		SELECT EXISTS(SELECT 1 FROM content.processes WHERE tenant_id = $1 AND code = $2)`

	queryExistsByCodeExcluding = `
		SELECT EXISTS(SELECT 1 FROM content.processes WHERE tenant_id = $1 AND code = $2 AND id != $3)`

	queryCountTemplatesByProcess = `
		SELECT COUNT(*) FROM content.templates t
		JOIN tenancy.workspaces w ON w.id = t.workspace_id
		WHERE w.tenant_id = $1 AND t.process = $2`

	queryFindTemplatesByProcess = `
		SELECT t.id, t.title, t.workspace_id, w.name
		FROM content.templates t
		JOIN tenancy.workspaces w ON w.id = t.workspace_id
		WHERE w.tenant_id = $1 AND t.process = $2
		ORDER BY w.name, t.title`

	// Global fallback queries: include SYS tenant processes with priority for tenant's own processes
	queryFindByTenantWithGlobalFallback = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT p.*,
				ROW_NUMBER() OVER (
					PARTITION BY p.code
					ORDER BY CASE WHEN p.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn,
				CASE WHEN p.tenant_id != $1 THEN true ELSE false END as is_global
			FROM content.processes p, sys_tenant st
			WHERE p.tenant_id = $1 OR p.tenant_id = st.id
		)
		SELECT id, tenant_id, code, process_type, name, COALESCE(description, '{}'), is_global, created_at, updated_at
		FROM ranked
		WHERE rn = 1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')
		ORDER BY code ASC
		LIMIT $3 OFFSET $4`

	queryCountByTenantWithGlobalFallback = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT p.code,
				ROW_NUMBER() OVER (
					PARTITION BY p.code
					ORDER BY CASE WHEN p.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn
			FROM content.processes p, sys_tenant st
			WHERE p.tenant_id = $1 OR p.tenant_id = st.id
		)
		SELECT COUNT(*) FROM ranked
		WHERE rn = 1
		  AND ($2 = '' OR code ILIKE '%' || $2 || '%')`

	queryFindByTenantWithTemplateCountAndGlobal = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT p.*,
				ROW_NUMBER() OVER (
					PARTITION BY p.code
					ORDER BY CASE WHEN p.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn,
				CASE WHEN p.tenant_id != $1 THEN true ELSE false END as is_global
			FROM content.processes p, sys_tenant st
			WHERE p.tenant_id = $1 OR p.tenant_id = st.id
		)
		SELECT
			r.id, r.tenant_id, r.code, r.process_type, r.name, COALESCE(r.description, '{}'), r.is_global,
			COALESCE((
				SELECT COUNT(*) FROM content.templates t
				JOIN tenancy.workspaces w ON w.id = t.workspace_id
				WHERE w.tenant_id = r.tenant_id AND t.process = r.code
			), 0) as templates_count,
			r.created_at, r.updated_at
		FROM ranked r
		WHERE r.rn = 1
		  AND ($2 = '' OR r.code ILIKE '%' || $2 || '%')
		ORDER BY r.code ASC
		LIMIT $3 OFFSET $4`

	queryFindByCodeWithGlobalFallback = `
		WITH sys_tenant AS (
			SELECT id FROM tenancy.tenants WHERE is_system = true LIMIT 1
		),
		ranked AS (
			SELECT p.*,
				ROW_NUMBER() OVER (
					PARTITION BY p.code
					ORDER BY CASE WHEN p.tenant_id = $1 THEN 0 ELSE 1 END
				) as rn,
				CASE WHEN p.tenant_id != $1 THEN true ELSE false END as is_global
			FROM content.processes p, sys_tenant st
			WHERE (p.tenant_id = $1 OR p.tenant_id = st.id) AND p.code = $2
		)
		SELECT id, tenant_id, code, process_type, name, COALESCE(description, '{}'), is_global, created_at, updated_at
		FROM ranked WHERE rn = 1`

	queryIsSysTenant = `SELECT is_system FROM tenancy.tenants WHERE id = $1`
)
