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

// TestTenantController_GetTenant tests the GET /tenant endpoint.
func TestTenantController_GetTenant(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Test Tenant", "GTNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create users with different roles
	owner := testhelper.CreateTestUser(t, pool, "owner-get@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	admin := testhelper.CreateTestUser(t, pool, "admin-get@test.com", "Admin User", nil)
	defer testhelper.CleanupUser(t, pool, admin.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

	nonMember := testhelper.CreateTestUser(t, pool, "nonmember-get@test.com", "Non Member", nil)
	defer testhelper.CleanupUser(t, pool, nonMember.ID)

	t.Run("success with TENANT_OWNER", func(t *testing.T) {
		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var tenant dto.TenantResponse
		err := json.Unmarshal(body, &tenant)
		require.NoError(t, err)

		assert.Equal(t, tenantID, tenant.ID)
		assert.Equal(t, "Test Tenant", tenant.Name)
		assert.Equal(t, "GTNT01", tenant.Code)
	})

	t.Run("success with TENANT_ADMIN", func(t *testing.T) {
		resp, body := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var tenant dto.TenantResponse
		err := json.Unmarshal(body, &tenant)
		require.NoError(t, err)

		assert.Equal(t, tenantID, tenant.ID)
	})

	t.Run("forbidden for non-member", func(t *testing.T) {
		resp, _ := client.
			WithAuth(nonMember.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant")

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("bad request without X-Tenant-ID header", func(t *testing.T) {
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			GET("/api/v1/tenant")

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("unauthorized without token", func(t *testing.T) {
		resp, _ := client.
			WithTenantID(tenantID).
			GET("/api/v1/tenant")

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})

	t.Run("forbidden for non-existent tenant", func(t *testing.T) {
		// When tenant doesn't exist, the middleware returns 403 because membership check fails
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID("00000000-0000-0000-0000-000000000000").
			GET("/api/v1/tenant")

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})
}

// TestTenantController_UpdateTenant tests the PUT /tenant endpoint.
func TestTenantController_UpdateTenant(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Update Tenant", "UTNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create users with different roles
	owner := testhelper.CreateTestUser(t, pool, "owner-update@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	admin := testhelper.CreateTestUser(t, pool, "admin-update@test.com", "Admin User", nil)
	defer testhelper.CleanupUser(t, pool, admin.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

	t.Run("success with TENANT_OWNER", func(t *testing.T) {
		req := dto.UpdateTenantRequest{
			Name:        "Updated Tenant Name",
			Description: "Updated description",
		}

		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			PUT("/api/v1/tenant", req)

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var tenant dto.TenantResponse
		err := json.Unmarshal(body, &tenant)
		require.NoError(t, err)

		assert.Equal(t, "Updated Tenant Name", tenant.Name)
	})

	t.Run("forbidden with TENANT_ADMIN", func(t *testing.T) {
		req := dto.UpdateTenantRequest{
			Name: "Admin Update Attempt",
		}

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			PUT("/api/v1/tenant", req)

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("validation empty name", func(t *testing.T) {
		req := dto.UpdateTenantRequest{
			Name: "",
		}

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			PUT("/api/v1/tenant", req)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

// TestTenantController_ListTenantWorkspaces tests the GET /tenant/workspaces endpoint.
func TestTenantController_ListTenantWorkspaces(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Workspaces Tenant", "WTNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create owner
	owner := testhelper.CreateTestUser(t, pool, "owner-ws@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	// Create workspaces
	ws1ID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace One", entity.WorkspaceTypeClient)
	defer testhelper.CleanupWorkspace(t, pool, ws1ID)

	ws2ID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace Two", entity.WorkspaceTypeClient)
	defer testhelper.CleanupWorkspace(t, pool, ws2ID)

	t.Run("success with multiple workspaces", func(t *testing.T) {
		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant/workspaces")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.WorkspaceResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.Equal(t, 2, listResp.Count)
		assert.Len(t, listResp.Data, 2)
	})

	t.Run("success with empty list", func(t *testing.T) {
		// Create a tenant with no workspaces
		emptyTenantID := testhelper.CreateTestTenant(t, pool, "Empty Tenant", "EMPT01")
		defer testhelper.CleanupTenant(t, pool, emptyTenantID)

		emptyOwner := testhelper.CreateTestUser(t, pool, "owner-empty@test.com", "Empty Owner", nil)
		defer testhelper.CleanupUser(t, pool, emptyOwner.ID)
		testhelper.CreateTestTenantMember(t, pool, emptyTenantID, emptyOwner.ID, entity.TenantRoleOwner, nil)

		resp, body := client.
			WithAuth(emptyOwner.BearerHeader).
			WithTenantID(emptyTenantID).
			GET("/api/v1/tenant/workspaces")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.WorkspaceResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.Equal(t, 0, listResp.Count)
		assert.Empty(t, listResp.Data)
	})

	t.Run("forbidden for non-member", func(t *testing.T) {
		nonMember := testhelper.CreateTestUser(t, pool, "nonmember-ws@test.com", "Non Member", nil)
		defer testhelper.CleanupUser(t, pool, nonMember.ID)

		resp, _ := client.
			WithAuth(nonMember.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant/workspaces")

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("bad request without X-Tenant-ID header", func(t *testing.T) {
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			GET("/api/v1/tenant/workspaces")

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

// TestTenantController_CreateWorkspace tests the POST /tenant/workspaces endpoint.
func TestTenantController_CreateWorkspace(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Create WS Tenant", "CWNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create users with different roles
	owner := testhelper.CreateTestUser(t, pool, "owner-createws@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	admin := testhelper.CreateTestUser(t, pool, "admin-createws@test.com", "Admin User", nil)
	defer testhelper.CleanupUser(t, pool, admin.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

	t.Run("success with TENANT_OWNER", func(t *testing.T) {
		req := dto.CreateWorkspaceRequest{
			Name: "New Workspace",
			Type: "CLIENT",
		}

		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/workspaces", req)

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var ws dto.WorkspaceResponse
		err := json.Unmarshal(body, &ws)
		require.NoError(t, err)

		assert.NotEmpty(t, ws.ID)
		assert.Equal(t, "New Workspace", ws.Name)
		assert.Equal(t, "CLIENT", ws.Type)

		defer testhelper.CleanupWorkspace(t, pool, ws.ID)
	})

	t.Run("forbidden with TENANT_ADMIN", func(t *testing.T) {
		req := dto.CreateWorkspaceRequest{
			Name: "Forbidden Workspace",
			Type: "CLIENT",
		}

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/workspaces", req)

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("validation empty name", func(t *testing.T) {
		req := dto.CreateWorkspaceRequest{
			Name: "",
			Type: "CLIENT",
		}

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/workspaces", req)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("validation invalid type", func(t *testing.T) {
		req := dto.CreateWorkspaceRequest{
			Name: "Invalid Type WS",
			Type: "INVALID",
		}

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/workspaces", req)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

// TestTenantController_DeleteWorkspace tests the DELETE /tenant/workspaces/:workspaceId endpoint.
func TestTenantController_DeleteWorkspace(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Delete WS Tenant", "DWNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create owner
	owner := testhelper.CreateTestUser(t, pool, "owner-deletews@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	admin := testhelper.CreateTestUser(t, pool, "admin-deletews@test.com", "Admin User", nil)
	defer testhelper.CleanupUser(t, pool, admin.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

	t.Run("success with TENANT_OWNER", func(t *testing.T) {
		// Create workspace to delete
		wsID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "To Delete", entity.WorkspaceTypeClient)
		// No defer since we're deleting

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			DELETE("/api/v1/tenant/workspaces/" + wsID)

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	})

	t.Run("forbidden with TENANT_ADMIN", func(t *testing.T) {
		wsID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Forbidden Delete", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, wsID)

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			DELETE("/api/v1/tenant/workspaces/" + wsID)

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("not found", func(t *testing.T) {
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			DELETE("/api/v1/tenant/workspaces/00000000-0000-0000-0000-000000000000")

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
}

// TestTenantController_ListTenantMembers tests the GET /tenant/members endpoint.
func TestTenantController_ListTenantMembers(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Members Tenant", "MTNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create owner
	owner := testhelper.CreateTestUser(t, pool, "owner-listmem@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	// Create admin
	admin := testhelper.CreateTestUser(t, pool, "admin-listmem@test.com", "Admin User", nil)
	defer testhelper.CleanupUser(t, pool, admin.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

	t.Run("success with multiple members", func(t *testing.T) {
		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant/members")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantMemberResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.Equal(t, 2, listResp.Count)
		assert.Len(t, listResp.Data, 2)
	})

	t.Run("success with TENANT_ADMIN", func(t *testing.T) {
		resp, body := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant/members")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListResponse[dto.TenantMemberResponse]
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.Equal(t, 2, listResp.Count)
	})
}

// TestTenantController_AddTenantMember tests the POST /tenant/members endpoint.
func TestTenantController_AddTenantMember(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Add Member Tenant", "AMNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create owner
	owner := testhelper.CreateTestUser(t, pool, "owner-addmem@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	// Create admin
	admin := testhelper.CreateTestUser(t, pool, "admin-addmem@test.com", "Admin User", nil)
	defer testhelper.CleanupUser(t, pool, admin.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

	// Create user to add (must exist in the database first)
	newUser := testhelper.CreateTestUser(t, pool, "newmember@test.com", "New Member", nil)
	defer testhelper.CleanupUser(t, pool, newUser.ID)

	t.Run("success with TENANT_OWNER", func(t *testing.T) {
		req := dto.AddTenantMemberRequest{
			Email: newUser.Email,
			Role:  "TENANT_ADMIN",
		}

		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/members", req)

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var member dto.TenantMemberResponse
		err := json.Unmarshal(body, &member)
		require.NoError(t, err)

		assert.NotEmpty(t, member.ID)
		assert.Equal(t, "TENANT_ADMIN", member.Role)
	})

	t.Run("forbidden with TENANT_ADMIN", func(t *testing.T) {
		anotherUser := testhelper.CreateTestUser(t, pool, "another@test.com", "Another User", nil)
		defer testhelper.CleanupUser(t, pool, anotherUser.ID)

		req := dto.AddTenantMemberRequest{
			Email: anotherUser.Email,
			Role:  "TENANT_ADMIN",
		}

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/members", req)

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("conflict member already exists", func(t *testing.T) {
		req := dto.AddTenantMemberRequest{
			Email: owner.Email, // Owner is already a member
			Role:  "TENANT_ADMIN",
		}

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/members", req)

		assert.Equal(t, http.StatusConflict, resp.StatusCode)
	})

	t.Run("validation invalid role", func(t *testing.T) {
		req := dto.AddTenantMemberRequest{
			Email: "someone@test.com",
			Role:  "INVALID_ROLE",
		}

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			POST("/api/v1/tenant/members", req)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

// TestTenantController_GetTenantMember tests the GET /tenant/members/:memberId endpoint.
func TestTenantController_GetTenantMember(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Get Member Tenant", "GMNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create owner
	owner := testhelper.CreateTestUser(t, pool, "owner-getmem@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	memberID := testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	t.Run("success", func(t *testing.T) {
		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant/members/" + memberID)

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var member dto.TenantMemberResponse
		err := json.Unmarshal(body, &member)
		require.NoError(t, err)

		assert.Equal(t, memberID, member.ID)
		assert.Equal(t, "TENANT_OWNER", member.Role)
	})

	t.Run("not found", func(t *testing.T) {
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			GET("/api/v1/tenant/members/00000000-0000-0000-0000-000000000000")

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
}

// TestTenantController_UpdateTenantMemberRole tests the PUT /tenant/members/:memberId endpoint.
func TestTenantController_UpdateTenantMemberRole(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	t.Run("success promote to TENANT_OWNER", func(t *testing.T) {
		// Create isolated tenant for this test
		tenantID := testhelper.CreateTestTenant(t, pool, "Promote Tenant", "PRMT01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		owner := testhelper.CreateTestUser(t, pool, "owner-promote@test.com", "Owner User", nil)
		defer testhelper.CleanupUser(t, pool, owner.ID)
		testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

		adminToPromote := testhelper.CreateTestUser(t, pool, "admin-promote@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, adminToPromote.ID)
		adminMemberID := testhelper.CreateTestTenantMember(t, pool, tenantID, adminToPromote.ID, entity.TenantRoleAdmin, nil)

		req := dto.UpdateTenantMemberRoleRequest{
			Role: "TENANT_OWNER",
		}

		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			PUT("/api/v1/tenant/members/"+adminMemberID, req)

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var member dto.TenantMemberResponse
		err := json.Unmarshal(body, &member)
		require.NoError(t, err)

		assert.Equal(t, "TENANT_OWNER", member.Role)
	})

	t.Run("forbidden with TENANT_ADMIN", func(t *testing.T) {
		// Create isolated tenant for this test
		tenantID := testhelper.CreateTestTenant(t, pool, "Forbidden Update Tenant", "FUPD01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		owner := testhelper.CreateTestUser(t, pool, "owner-forbidupd@test.com", "Owner User", nil)
		defer testhelper.CleanupUser(t, pool, owner.ID)
		testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

		admin := testhelper.CreateTestUser(t, pool, "admin-forbidupd@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

		anotherAdmin := testhelper.CreateTestUser(t, pool, "anotheradmin-forbidupd@test.com", "Another Admin", nil)
		defer testhelper.CleanupUser(t, pool, anotherAdmin.ID)
		anotherMemberID := testhelper.CreateTestTenantMember(t, pool, tenantID, anotherAdmin.ID, entity.TenantRoleAdmin, nil)

		req := dto.UpdateTenantMemberRoleRequest{
			Role: "TENANT_OWNER",
		}

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			PUT("/api/v1/tenant/members/"+anotherMemberID, req)

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("validation invalid role", func(t *testing.T) {
		// Create isolated tenant for this test
		tenantID := testhelper.CreateTestTenant(t, pool, "Validation Tenant", "VALD01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		owner := testhelper.CreateTestUser(t, pool, "owner-valid@test.com", "Owner User", nil)
		defer testhelper.CleanupUser(t, pool, owner.ID)
		testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

		admin := testhelper.CreateTestUser(t, pool, "admin-valid@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		adminMemberID := testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

		req := dto.UpdateTenantMemberRoleRequest{
			Role: "INVALID",
		}

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			PUT("/api/v1/tenant/members/"+adminMemberID, req)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}

// TestTenantController_RemoveTenantMember tests the DELETE /tenant/members/:memberId endpoint.
func TestTenantController_RemoveTenantMember(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Create test tenant
	tenantID := testhelper.CreateTestTenant(t, pool, "Remove Member Tenant", "RMNT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create owner
	owner := testhelper.CreateTestUser(t, pool, "owner-remove@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	ownerMemberID := testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	t.Run("success remove admin", func(t *testing.T) {
		// Create admin to remove
		adminToRemove := testhelper.CreateTestUser(t, pool, "toremove@test.com", "To Remove", nil)
		defer testhelper.CleanupUser(t, pool, adminToRemove.ID)
		memberID := testhelper.CreateTestTenantMember(t, pool, tenantID, adminToRemove.ID, entity.TenantRoleAdmin, nil)

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			DELETE("/api/v1/tenant/members/" + memberID)

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	})

	t.Run("cannot remove last owner", func(t *testing.T) {
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			DELETE("/api/v1/tenant/members/" + ownerMemberID)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("forbidden with TENANT_ADMIN", func(t *testing.T) {
		// Create admin
		admin := testhelper.CreateTestUser(t, pool, "admin-remove@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		testhelper.CreateTestTenantMember(t, pool, tenantID, admin.ID, entity.TenantRoleAdmin, nil)

		// Create another admin to try to remove
		anotherAdmin := testhelper.CreateTestUser(t, pool, "anotheradmin-remove@test.com", "Another Admin", nil)
		defer testhelper.CleanupUser(t, pool, anotherAdmin.ID)
		anotherMemberID := testhelper.CreateTestTenantMember(t, pool, tenantID, anotherAdmin.ID, entity.TenantRoleAdmin, nil)

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithTenantID(tenantID).
			DELETE("/api/v1/tenant/members/" + anotherMemberID)

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("not found", func(t *testing.T) {
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			DELETE("/api/v1/tenant/members/00000000-0000-0000-0000-000000000000")

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})
}

// =============================================================================
// Additional Coverage Tests
// =============================================================================

// TestTenantController_UpdateTenant_WithSettings tests updating tenant with full settings.
func TestTenantController_UpdateTenant_WithSettings(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	tenantID := testhelper.CreateTestTenant(t, pool, "Settings Tenant", "SETT01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	owner := testhelper.CreateTestUser(t, pool, "owner-settings@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	t.Run("success with full settings", func(t *testing.T) {
		req := map[string]interface{}{
			"name":        "Updated Tenant With Settings",
			"description": "Updated description with settings",
			"settings": map[string]interface{}{
				"currency":   "USD",
				"timezone":   "America/New_York",
				"dateFormat": "MM/DD/YYYY",
				"locale":     "en-US",
			},
		}

		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithTenantID(tenantID).
			PUT("/api/v1/tenant", req)

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var tenant dto.TenantResponse
		err := json.Unmarshal(body, &tenant)
		require.NoError(t, err)

		assert.Equal(t, "Updated Tenant With Settings", tenant.Name)
	})
}

// TestTenantController_UpdateMemberRole_LastOwner tests demoting the last owner fails.
func TestTenantController_UpdateMemberRole_LastOwner(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	tenantID := testhelper.CreateTestTenant(t, pool, "Last Owner Tenant", "LOWN01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	// Create single owner
	owner := testhelper.CreateTestUser(t, pool, "only-owner@test.com", "Only Owner", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	ownerMemberID := testhelper.CreateTestTenantMember(t, pool, tenantID, owner.ID, entity.TenantRoleOwner, nil)

	// Try to demote last owner to admin
	req := dto.UpdateTenantMemberRoleRequest{
		Role: "TENANT_ADMIN",
	}

	resp, _ := client.
		WithAuth(owner.BearerHeader).
		WithTenantID(tenantID).
		PUT("/api/v1/tenant/members/"+ownerMemberID, req)

	// Should fail because this is the last owner
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}
