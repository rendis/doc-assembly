//go:build integration

package controller_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/testing/testhelper"
)

// TestMeController_ListMyTenantsPaginated tests the /me/tenants/list endpoint.
func TestMeController_ListMyTenantsPaginated(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	t.Run("success with default pagination", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "list-paginated@test.com", "List Paginated User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenants
		tenant1ID := testhelper.CreateTestTenant(t, pool, "Tenant Alpha", "LPAL01")
		defer testhelper.CleanupTenant(t, pool, tenant1ID)

		tenant2ID := testhelper.CreateTestTenant(t, pool, "Tenant Beta", "LPBE02")
		defer testhelper.CleanupTenant(t, pool, tenant2ID)

		// Create memberships with different roles
		testhelper.CreateTestTenantMember(t, pool, tenant1ID, user.ID,
			entity.TenantRoleOwner, nil)
		testhelper.CreateTestTenantMember(t, pool, tenant2ID, user.ID,
			entity.TenantRoleAdmin, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/list")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var paginatedResp dto.PaginatedTenantsWithRoleResponse
		err := json.Unmarshal(body, &paginatedResp)
		require.NoError(t, err)

		assert.Len(t, paginatedResp.Data, 2)
		assert.Equal(t, int64(2), paginatedResp.Pagination.Total)
		assert.Equal(t, 1, paginatedResp.Pagination.Page)
		assert.Equal(t, 10, paginatedResp.Pagination.PerPage)
	})

	t.Run("success with custom limit and offset", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "list-custom@test.com", "List Custom User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create 3 tenants
		tenant1ID := testhelper.CreateTestTenant(t, pool, "Tenant Custom A", "LCUA01")
		defer testhelper.CleanupTenant(t, pool, tenant1ID)

		tenant2ID := testhelper.CreateTestTenant(t, pool, "Tenant Custom B", "LCUB02")
		defer testhelper.CleanupTenant(t, pool, tenant2ID)

		tenant3ID := testhelper.CreateTestTenant(t, pool, "Tenant Custom C", "LCUC03")
		defer testhelper.CleanupTenant(t, pool, tenant3ID)

		testhelper.CreateTestTenantMember(t, pool, tenant1ID, user.ID, entity.TenantRoleOwner, nil)
		testhelper.CreateTestTenantMember(t, pool, tenant2ID, user.ID, entity.TenantRoleAdmin, nil)
		testhelper.CreateTestTenantMember(t, pool, tenant3ID, user.ID, entity.TenantRoleAdmin, nil)

		// Request with limit=2, offset=1
		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/list?limit=2&offset=1")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var paginatedResp dto.PaginatedTenantsWithRoleResponse
		err := json.Unmarshal(body, &paginatedResp)
		require.NoError(t, err)

		assert.Len(t, paginatedResp.Data, 2)
		assert.Equal(t, int64(3), paginatedResp.Pagination.Total)
		assert.Equal(t, 2, paginatedResp.Pagination.Page) // offset=1, limit=2 -> page 2
		assert.Equal(t, 2, paginatedResp.Pagination.PerPage)
	})

	t.Run("success only returns active memberships", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "list-active@test.com", "List Active User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenants
		activeTenantID := testhelper.CreateTestTenant(t, pool, "List Active Tenant", "LACT01")
		defer testhelper.CleanupTenant(t, pool, activeTenantID)

		pendingTenantID := testhelper.CreateTestTenant(t, pool, "List Pending Tenant", "LPND01")
		defer testhelper.CleanupTenant(t, pool, pendingTenantID)

		// Create ACTIVE membership
		testhelper.CreateTestTenantMember(t, pool, activeTenantID, user.ID,
			entity.TenantRoleOwner, nil)

		// Create PENDING membership
		testhelper.CreateTestTenantMemberWithStatus(t, pool, pendingTenantID, user.ID,
			entity.TenantRoleAdmin, entity.MembershipStatusPending, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/list")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var paginatedResp dto.PaginatedTenantsWithRoleResponse
		err := json.Unmarshal(body, &paginatedResp)
		require.NoError(t, err)

		// Should only return the ACTIVE tenant
		assert.Len(t, paginatedResp.Data, 1)
		assert.Equal(t, int64(1), paginatedResp.Pagination.Total)
		assert.Equal(t, activeTenantID, paginatedResp.Data[0].ID)
	})

	t.Run("success with no tenants", func(t *testing.T) {
		// Create user without any tenant memberships
		user := testhelper.CreateTestUser(t, pool, "list-no-tenants@test.com", "List No Tenant User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/list")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var paginatedResp dto.PaginatedTenantsWithRoleResponse
		err := json.Unmarshal(body, &paginatedResp)
		require.NoError(t, err)

		assert.Empty(t, paginatedResp.Data)
		assert.Equal(t, int64(0), paginatedResp.Pagination.Total)
	})

	t.Run("unauthorized without token", func(t *testing.T) {
		resp, _ := client.GET("/api/v1/me/tenants/list")

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

// TestMeController_SearchMyTenants tests the /me/tenants/search endpoint.
func TestMeController_SearchMyTenants(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	t.Run("success search by name", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "search-name@test.com", "Search Name User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenants with similar names
		tenant1ID := testhelper.CreateTestTenant(t, pool, "Acme Corporation", "SACM01")
		defer testhelper.CleanupTenant(t, pool, tenant1ID)

		tenant2ID := testhelper.CreateTestTenant(t, pool, "Acme Industries", "SACM02")
		defer testhelper.CleanupTenant(t, pool, tenant2ID)

		tenant3ID := testhelper.CreateTestTenant(t, pool, "Other Company", "SOTH01")
		defer testhelper.CleanupTenant(t, pool, tenant3ID)

		testhelper.CreateTestTenantMember(t, pool, tenant1ID, user.ID, entity.TenantRoleOwner, nil)
		testhelper.CreateTestTenantMember(t, pool, tenant2ID, user.ID, entity.TenantRoleAdmin, nil)
		testhelper.CreateTestTenantMember(t, pool, tenant3ID, user.ID, entity.TenantRoleAdmin, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/search?q=Acme")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		// Should return tenants matching "Acme"
		assert.GreaterOrEqual(t, listResp.Count, 1)
		for _, tenant := range listResp.Data {
			assert.Contains(t, tenant.Name, "Acme")
		}
	})

	t.Run("success search by code", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "search-code@test.com", "Search Code User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenant
		tenantID := testhelper.CreateTestTenant(t, pool, "Some Tenant", "SCODE1")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		testhelper.CreateTestTenantMember(t, pool, tenantID, user.ID, entity.TenantRoleOwner, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/search?q=SCODE")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.GreaterOrEqual(t, listResp.Count, 1)
	})

	t.Run("only returns user tenants", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "search-own@test.com", "Search Own User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenant where user IS a member
		memberTenantID := testhelper.CreateTestTenant(t, pool, "Member Tenant Search", "SMTS01")
		defer testhelper.CleanupTenant(t, pool, memberTenantID)

		// Create tenant where user is NOT a member
		otherTenantID := testhelper.CreateTestTenant(t, pool, "Other Tenant Search", "SOTS01")
		defer testhelper.CleanupTenant(t, pool, otherTenantID)

		testhelper.CreateTestTenantMember(t, pool, memberTenantID, user.ID, entity.TenantRoleOwner, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/search?q=Tenant Search")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		// Should only return the tenant where user is a member
		for _, tenant := range listResp.Data {
			assert.NotEqual(t, otherTenantID, tenant.ID, "should not return tenant where user is not a member")
		}
	})

	t.Run("empty results", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "search-empty@test.com", "Search Empty User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenant
		tenantID := testhelper.CreateTestTenant(t, pool, "Real Tenant", "SREA01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		testhelper.CreateTestTenantMember(t, pool, tenantID, user.ID, entity.TenantRoleOwner, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/search?q=ZZZZNONEXISTENT")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.Equal(t, 0, listResp.Count)
		assert.Empty(t, listResp.Data)
	})

	t.Run("validation query required", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "search-required@test.com", "Search Required User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		resp, _ := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants/search")

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("unauthorized without token", func(t *testing.T) {
		resp, _ := client.GET("/api/v1/me/tenants/search?q=test")

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}
