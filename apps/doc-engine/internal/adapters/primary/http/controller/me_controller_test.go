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

// TestMeController_ListMyTenants tests the /me/tenants endpoint.
func TestMeController_ListMyTenants(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	t.Run("success with multiple tenants", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "multi-tenants@test.com", "Multi Tenant User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenants
		tenant1ID := testhelper.CreateTestTenant(t, pool, "Tenant One", "MTEN01")
		defer testhelper.CleanupTenant(t, pool, tenant1ID)

		tenant2ID := testhelper.CreateTestTenant(t, pool, "Tenant Two", "MTEN02")
		defer testhelper.CleanupTenant(t, pool, tenant2ID)

		// Create memberships with different roles
		testhelper.CreateTestTenantMember(t, pool, tenant1ID, user.ID,
			entity.TenantRoleOwner, nil)
		testhelper.CreateTestTenantMember(t, pool, tenant2ID, user.ID,
			entity.TenantRoleAdmin, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.Equal(t, 2, listResp.Count)
		assert.Len(t, listResp.Data, 2)

		// Verify we have both roles represented
		roles := make(map[string]bool)
		for _, tenant := range listResp.Data {
			roles[tenant.Role] = true
		}
		assert.True(t, roles["TENANT_OWNER"], "should have TENANT_OWNER role")
		assert.True(t, roles["TENANT_ADMIN"], "should have TENANT_ADMIN role")
	})

	t.Run("success with no tenants", func(t *testing.T) {
		// Create user without any tenant memberships
		user := testhelper.CreateTestUser(t, pool, "no-tenants@test.com", "No Tenant User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.Equal(t, 0, listResp.Count)
		assert.Empty(t, listResp.Data)
	})

	t.Run("success only returns active memberships", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "active-only@test.com", "Active Only User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenants
		activeTenantID := testhelper.CreateTestTenant(t, pool, "Active Tenant", "ACTV01")
		defer testhelper.CleanupTenant(t, pool, activeTenantID)

		pendingTenantID := testhelper.CreateTestTenant(t, pool, "Pending Tenant", "PEND01")
		defer testhelper.CleanupTenant(t, pool, pendingTenantID)

		// Create ACTIVE membership
		testhelper.CreateTestTenantMember(t, pool, activeTenantID, user.ID,
			entity.TenantRoleOwner, nil)

		// Create PENDING membership
		testhelper.CreateTestTenantMemberWithStatus(t, pool, pendingTenantID, user.ID,
			entity.TenantRoleAdmin, entity.MembershipStatusPending, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		// Should only return the ACTIVE tenant
		assert.Equal(t, 1, listResp.Count)
		assert.Len(t, listResp.Data, 1)
		assert.Equal(t, activeTenantID, listResp.Data[0].ID)
		assert.Equal(t, "Active Tenant", listResp.Data[0].Name)
	})

	t.Run("unauthorized without token", func(t *testing.T) {
		resp, _ := client.GET("/api/v1/me/tenants")

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("forbidden with non-existent user", func(t *testing.T) {
		// In test mode (ParseUnverified), token expiration is not validated.
		// When the token contains an email that doesn't exist in the database,
		// the IdentityContext middleware returns 403 Forbidden.
		nonExistentToken := testhelper.GenerateTestToken("nonexistent@test.com", "Non Existent User")
		nonExistentBearer := "Bearer " + nonExistentToken

		resp, _ := client.WithAuth(nonExistentBearer).GET("/api/v1/me/tenants")

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("response contains all expected fields", func(t *testing.T) {
		// Create user
		user := testhelper.CreateTestUser(t, pool, "fields-check@test.com", "Fields Check User", nil)
		defer testhelper.CleanupUser(t, pool, user.ID)

		// Create tenant
		tenantID := testhelper.CreateTestTenant(t, pool, "Complete Tenant", "COMP01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		// Create membership as TENANT_OWNER
		testhelper.CreateTestTenantMember(t, pool, tenantID, user.ID,
			entity.TenantRoleOwner, nil)

		resp, body := client.WithAuth(user.BearerHeader).GET("/api/v1/me/tenants")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantWithRoleResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		require.Equal(t, 1, listResp.Count)
		require.Len(t, listResp.Data, 1)

		tenant := listResp.Data[0]
		assert.Equal(t, tenantID, tenant.ID)
		assert.Equal(t, "Complete Tenant", tenant.Name)
		assert.Equal(t, "COMP01", tenant.Code)
		assert.Equal(t, "TENANT_OWNER", tenant.Role)
		assert.NotZero(t, tenant.CreatedAt)
	})
}
