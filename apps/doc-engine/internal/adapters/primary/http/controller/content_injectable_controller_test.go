//go:build integration

package controller_test

import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/testing/testhelper"
)

// =============================================================================
// Injectable List Tests
// =============================================================================

// TestContentInjectableController_ListInjectables tests the GET /content/injectables endpoint.
func TestContentInjectableController_ListInjectables(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	// Setup: tenant + workspace + users
	tenantID := testhelper.CreateTestTenant(t, pool, "Injectable List Tenant", "ILST01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Injectable List Workspace", entity.WorkspaceTypeClient)
	defer testhelper.CleanupWorkspace(t, pool, workspaceID)

	owner := testhelper.CreateTestUser(t, pool, "owner-inj-list@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, owner.ID, entity.WorkspaceRoleOwner, nil)

	viewer := testhelper.CreateTestUser(t, pool, "viewer-inj-list@test.com", "Viewer User", nil)
	defer testhelper.CleanupUser(t, pool, viewer.ID)
	testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, viewer.ID, entity.WorkspaceRoleViewer, nil)

	// Create injectables
	injectable1 := testhelper.CreateTestInjectable(t, pool, &workspaceID, "customer_name", "Customer Name", entity.InjectableDataTypeText)
	defer testhelper.CleanupInjectable(t, pool, injectable1)

	injectable2 := testhelper.CreateTestInjectable(t, pool, &workspaceID, "total_amount", "Total Amount", entity.InjectableDataTypeNumber)
	defer testhelper.CleanupInjectable(t, pool, injectable2)

	t.Run("success with VIEWER", func(t *testing.T) {
		resp, body := client.
			WithAuth(viewer.BearerHeader).
			WithWorkspaceID(workspaceID).
			GET("/api/v1/content/injectables")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListInjectablesResponse
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.GreaterOrEqual(t, listResp.Total, 2)
	})

	t.Run("success with OWNER", func(t *testing.T) {
		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithWorkspaceID(workspaceID).
			GET("/api/v1/content/injectables")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListInjectablesResponse
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		assert.GreaterOrEqual(t, listResp.Total, 2)
	})

	t.Run("success with empty list", func(t *testing.T) {
		// Create a new workspace with no injectables
		emptyWsID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Empty Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, emptyWsID)
		testhelper.CreateTestWorkspaceMember(t, pool, emptyWsID, owner.ID, entity.WorkspaceRoleOwner, nil)

		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithWorkspaceID(emptyWsID).
			GET("/api/v1/content/injectables")

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var listResp dto.ListInjectablesResponse
		err := json.Unmarshal(body, &listResp)
		require.NoError(t, err)

		// May have global injectables but workspace-specific should be 0
		assert.NotNil(t, listResp.Items)
	})

	t.Run("forbidden without workspace membership", func(t *testing.T) {
		nonMember := testhelper.CreateTestUser(t, pool, "nonmember-inj@test.com", "Non Member", nil)
		defer testhelper.CleanupUser(t, pool, nonMember.ID)

		resp, _ := client.
			WithAuth(nonMember.BearerHeader).
			WithWorkspaceID(workspaceID).
			GET("/api/v1/content/injectables")

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("bad request without workspace header", func(t *testing.T) {
		resp, _ := client.
			WithAuth(owner.BearerHeader).
			GET("/api/v1/content/injectables")

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("unauthorized without token", func(t *testing.T) {
		resp, _ := client.
			WithWorkspaceID(workspaceID).
			GET("/api/v1/content/injectables")

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

// =============================================================================
// Injectable Create Tests
// =============================================================================

// TestContentInjectableController_CreateInjectable tests the POST /content/injectables endpoint.
func TestContentInjectableController_CreateInjectable(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	t.Run("success with EDITOR", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Create Injectable Tenant", "CIST01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Create Injectable Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-ci@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		resp, body := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":         "customer_name",
				"label":       "Customer Name",
				"description": "The customer's full name",
				"dataType":    "TEXT",
			})

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		assert.Equal(t, "customer_name", injResp.Key)
		assert.Equal(t, "Customer Name", injResp.Label)
		assert.Equal(t, "The customer's full name", injResp.Description)
		assert.Equal(t, "TEXT", injResp.DataType)
		assert.False(t, injResp.IsGlobal)
		assert.NotEmpty(t, injResp.ID)
		defer testhelper.CleanupInjectable(t, pool, injResp.ID)
	})

	t.Run("success with ADMIN", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Create Injectable Tenant 2", "CIST02")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		admin := testhelper.CreateTestUser(t, pool, "admin-ci@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, admin.ID, entity.WorkspaceRoleAdmin, nil)

		resp, body := client.
			WithAuth(admin.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":      "contract_date",
				"label":    "Contract Date",
				"dataType": "DATE",
			})

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)
		defer testhelper.CleanupInjectable(t, pool, injResp.ID)
	})

	t.Run("success with OWNER", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Create Injectable Tenant 3", "CIST03")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		owner := testhelper.CreateTestUser(t, pool, "owner-ci@test.com", "Owner User", nil)
		defer testhelper.CleanupUser(t, pool, owner.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, owner.ID, entity.WorkspaceRoleOwner, nil)

		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":      "total_price",
				"label":    "Total Price",
				"dataType": "CURRENCY",
			})

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)
		defer testhelper.CleanupInjectable(t, pool, injResp.ID)
	})

	t.Run("forbidden with VIEWER", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Create Injectable Tenant 4", "CIST04")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		viewer := testhelper.CreateTestUser(t, pool, "viewer-ci@test.com", "Viewer User", nil)
		defer testhelper.CleanupUser(t, pool, viewer.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, viewer.ID, entity.WorkspaceRoleViewer, nil)

		resp, _ := client.
			WithAuth(viewer.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":      "test_key",
				"label":    "Test Label",
				"dataType": "TEXT",
			})

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("success with all data types", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Data Types Tenant", "DTST01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Data Types Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-dt@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		dataTypes := []string{"TEXT", "NUMBER", "DATE", "CURRENCY", "BOOLEAN", "IMAGE", "TABLE"}

		for i, dataType := range dataTypes {
			t.Run(dataType, func(t *testing.T) {
				key := fmt.Sprintf("test_key_%d", i)
				resp, body := client.
					WithAuth(editor.BearerHeader).
					WithWorkspaceID(workspaceID).
					POST("/api/v1/content/injectables", map[string]interface{}{
						"key":      key,
						"label":    fmt.Sprintf("Test %s", dataType),
						"dataType": dataType,
					})

				assert.Equal(t, http.StatusCreated, resp.StatusCode)

				var injResp dto.InjectableResponse
				err := json.Unmarshal(body, &injResp)
				require.NoError(t, err)

				assert.Equal(t, dataType, injResp.DataType)
				defer testhelper.CleanupInjectable(t, pool, injResp.ID)
			})
		}
	})

	t.Run("validation error - empty key", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Validation Tenant 1", "VLST01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-vl1@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		resp, _ := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":      "",
				"label":    "Test Label",
				"dataType": "TEXT",
			})

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("validation error - empty label", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Validation Tenant 2", "VLST02")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-vl2@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		resp, _ := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":      "test_key",
				"label":    "",
				"dataType": "TEXT",
			})

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("validation error - invalid data type", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Validation Tenant 3", "VLST03")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-vl3@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		resp, _ := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":      "test_key",
				"label":    "Test Label",
				"dataType": "INVALID_TYPE",
			})

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("conflict - duplicate key in workspace", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Duplicate Tenant", "DPST01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Duplicate Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-dp@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		// Create first injectable
		existingID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "duplicate_key", "Existing Injectable", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, existingID)

		// Try to create another with the same key
		resp, _ := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":      "duplicate_key",
				"label":    "Duplicate Injectable",
				"dataType": "TEXT",
			})

		assert.Equal(t, http.StatusConflict, resp.StatusCode)
	})

	t.Run("response contains all expected fields", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Fields Tenant", "FLST01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Fields Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-fl@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		resp, body := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			POST("/api/v1/content/injectables", map[string]interface{}{
				"key":         "full_fields_key",
				"label":       "Full Fields Label",
				"description": "A detailed description",
				"dataType":    "NUMBER",
			})

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		// Verify all fields are present and correct
		assert.NotEmpty(t, injResp.ID)
		assert.Equal(t, &workspaceID, injResp.WorkspaceID)
		assert.Equal(t, "full_fields_key", injResp.Key)
		assert.Equal(t, "Full Fields Label", injResp.Label)
		assert.Equal(t, "A detailed description", injResp.Description)
		assert.Equal(t, "NUMBER", injResp.DataType)
		assert.False(t, injResp.IsGlobal)
		assert.NotZero(t, injResp.CreatedAt)
		defer testhelper.CleanupInjectable(t, pool, injResp.ID)
	})
}

// =============================================================================
// Injectable Get Tests
// =============================================================================

// TestContentInjectableController_GetInjectable tests the GET /content/injectables/:injectableId endpoint.
func TestContentInjectableController_GetInjectable(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	tenantID := testhelper.CreateTestTenant(t, pool, "Get Injectable Tenant", "GIST01")
	defer testhelper.CleanupTenant(t, pool, tenantID)

	workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Get Injectable Workspace", entity.WorkspaceTypeClient)
	defer testhelper.CleanupWorkspace(t, pool, workspaceID)

	owner := testhelper.CreateTestUser(t, pool, "owner-gi@test.com", "Owner User", nil)
	defer testhelper.CleanupUser(t, pool, owner.ID)
	testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, owner.ID, entity.WorkspaceRoleOwner, nil)

	editor := testhelper.CreateTestUser(t, pool, "editor-gi@test.com", "Editor User", nil)
	defer testhelper.CleanupUser(t, pool, editor.ID)
	testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

	viewer := testhelper.CreateTestUser(t, pool, "viewer-gi@test.com", "Viewer User", nil)
	defer testhelper.CleanupUser(t, pool, viewer.ID)
	testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, viewer.ID, entity.WorkspaceRoleViewer, nil)

	injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "get_test_key", "Get Test Injectable", entity.InjectableDataTypeText)
	defer testhelper.CleanupInjectable(t, pool, injectableID)

	t.Run("success with VIEWER", func(t *testing.T) {
		resp, body := client.
			WithAuth(viewer.BearerHeader).
			WithWorkspaceID(workspaceID).
			GET(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		assert.Equal(t, injectableID, injResp.ID)
		assert.Equal(t, "get_test_key", injResp.Key)
		assert.Equal(t, "Get Test Injectable", injResp.Label)
	})

	t.Run("success with EDITOR", func(t *testing.T) {
		resp, body := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			GET(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		assert.Equal(t, injectableID, injResp.ID)
	})

	t.Run("success with OWNER", func(t *testing.T) {
		resp, body := client.
			WithAuth(owner.BearerHeader).
			WithWorkspaceID(workspaceID).
			GET(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		assert.Equal(t, injectableID, injResp.ID)
	})

	t.Run("not found - non-existent ID", func(t *testing.T) {
		resp, _ := client.
			WithAuth(viewer.BearerHeader).
			WithWorkspaceID(workspaceID).
			GET("/api/v1/content/injectables/00000000-0000-0000-0000-000000000000")

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("unauthorized without token", func(t *testing.T) {
		resp, _ := client.
			WithWorkspaceID(workspaceID).
			GET(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	})
}

// =============================================================================
// Injectable Update Tests
// =============================================================================

// TestContentInjectableController_UpdateInjectable tests the PUT /content/injectables/:injectableId endpoint.
func TestContentInjectableController_UpdateInjectable(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	t.Run("success with EDITOR", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Update Injectable Tenant", "UIST01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Update Injectable Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-ui@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "update_key", "Original Label", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, body := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			PUT(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID), map[string]interface{}{
				"label":       "Updated Label",
				"description": "Updated description",
			})

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		assert.Equal(t, "Updated Label", injResp.Label)
		assert.Equal(t, "Updated description", injResp.Description)
		// Key should remain unchanged
		assert.Equal(t, "update_key", injResp.Key)
	})

	t.Run("success with ADMIN", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Update Injectable Tenant 2", "UIST02")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		admin := testhelper.CreateTestUser(t, pool, "admin-ui@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, admin.ID, entity.WorkspaceRoleAdmin, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "admin_update_key", "Original", entity.InjectableDataTypeNumber)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, body := client.
			WithAuth(admin.BearerHeader).
			WithWorkspaceID(workspaceID).
			PUT(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID), map[string]interface{}{
				"label": "Admin Updated",
			})

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		assert.Equal(t, "Admin Updated", injResp.Label)
	})

	t.Run("success with OWNER", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Update Injectable Tenant 3", "UIST03")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		owner := testhelper.CreateTestUser(t, pool, "owner-ui@test.com", "Owner User", nil)
		defer testhelper.CleanupUser(t, pool, owner.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, owner.ID, entity.WorkspaceRoleOwner, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "owner_update_key", "Original", entity.InjectableDataTypeDate)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithWorkspaceID(workspaceID).
			PUT(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID), map[string]interface{}{
				"label": "Owner Updated",
			})

		assert.Equal(t, http.StatusOK, resp.StatusCode)
	})

	t.Run("forbidden with VIEWER", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Update Injectable Tenant 4", "UIST04")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		viewer := testhelper.CreateTestUser(t, pool, "viewer-ui@test.com", "Viewer User", nil)
		defer testhelper.CleanupUser(t, pool, viewer.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, viewer.ID, entity.WorkspaceRoleViewer, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "viewer_update_key", "Original", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, _ := client.
			WithAuth(viewer.BearerHeader).
			WithWorkspaceID(workspaceID).
			PUT(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID), map[string]interface{}{
				"label": "Viewer Attempt",
			})

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("not found - non-existent ID", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Update Injectable Tenant 5", "UIST05")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-ui2@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		resp, _ := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			PUT("/api/v1/content/injectables/00000000-0000-0000-0000-000000000000", map[string]interface{}{
				"label": "Not Found",
			})

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("validation error - empty label", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Update Injectable Tenant 6", "UIST06")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-ui3@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "empty_label_key", "Original", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, _ := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			PUT(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID), map[string]interface{}{
				"label": "",
			})

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})

	t.Run("success update description to empty", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Update Injectable Tenant 7", "UIST07")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-ui4@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "clear_desc_key", "Original", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, body := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			PUT(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID), map[string]interface{}{
				"label":       "Updated Label",
				"description": "",
			})

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var injResp dto.InjectableResponse
		err := json.Unmarshal(body, &injResp)
		require.NoError(t, err)

		assert.Equal(t, "", injResp.Description)
	})
}

// =============================================================================
// Injectable Delete Tests
// =============================================================================

// TestContentInjectableController_DeleteInjectable tests the DELETE /content/injectables/:injectableId endpoint.
func TestContentInjectableController_DeleteInjectable(t *testing.T) {
	pool := testhelper.GetTestPool(t)
	ts := testhelper.NewTestServer(t, pool)
	client := testhelper.NewHTTPClient(t, ts.URL())

	t.Run("success with ADMIN", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Delete Injectable Tenant", "DIST01")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Delete Injectable Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		admin := testhelper.CreateTestUser(t, pool, "admin-di@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, admin.ID, entity.WorkspaceRoleAdmin, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "delete_key", "To Delete", entity.InjectableDataTypeText)
		// No defer cleanup - we're deleting it

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithWorkspaceID(workspaceID).
			DELETE(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	})

	t.Run("success with OWNER", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Delete Injectable Tenant 2", "DIST02")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		owner := testhelper.CreateTestUser(t, pool, "owner-di@test.com", "Owner User", nil)
		defer testhelper.CleanupUser(t, pool, owner.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, owner.ID, entity.WorkspaceRoleOwner, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "owner_delete_key", "Owner Delete", entity.InjectableDataTypeNumber)
		// No defer cleanup - we're deleting it

		resp, _ := client.
			WithAuth(owner.BearerHeader).
			WithWorkspaceID(workspaceID).
			DELETE(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	})

	t.Run("forbidden with EDITOR", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Delete Injectable Tenant 3", "DIST03")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		editor := testhelper.CreateTestUser(t, pool, "editor-di@test.com", "Editor User", nil)
		defer testhelper.CleanupUser(t, pool, editor.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, editor.ID, entity.WorkspaceRoleEditor, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "editor_delete_key", "Editor Delete", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, _ := client.
			WithAuth(editor.BearerHeader).
			WithWorkspaceID(workspaceID).
			DELETE(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("forbidden with VIEWER", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Delete Injectable Tenant 4", "DIST04")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		viewer := testhelper.CreateTestUser(t, pool, "viewer-di@test.com", "Viewer User", nil)
		defer testhelper.CleanupUser(t, pool, viewer.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, viewer.ID, entity.WorkspaceRoleViewer, nil)

		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "viewer_delete_key", "Viewer Delete", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		resp, _ := client.
			WithAuth(viewer.BearerHeader).
			WithWorkspaceID(workspaceID).
			DELETE(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusForbidden, resp.StatusCode)
	})

	t.Run("not found - non-existent ID", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Delete Injectable Tenant 5", "DIST05")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		admin := testhelper.CreateTestUser(t, pool, "admin-di2@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, admin.ID, entity.WorkspaceRoleAdmin, nil)

		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithWorkspaceID(workspaceID).
			DELETE("/api/v1/content/injectables/00000000-0000-0000-0000-000000000000")

		assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	})

	t.Run("bad request - injectable in use by template version", func(t *testing.T) {
		tenantID := testhelper.CreateTestTenant(t, pool, "Delete Injectable Tenant 6", "DIST06")
		defer testhelper.CleanupTenant(t, pool, tenantID)

		workspaceID := testhelper.CreateTestWorkspace(t, pool, &tenantID, "Workspace", entity.WorkspaceTypeClient)
		defer testhelper.CleanupWorkspace(t, pool, workspaceID)

		admin := testhelper.CreateTestUser(t, pool, "admin-di3@test.com", "Admin User", nil)
		defer testhelper.CleanupUser(t, pool, admin.ID)
		testhelper.CreateTestWorkspaceMember(t, pool, workspaceID, admin.ID, entity.WorkspaceRoleAdmin, nil)

		// Create injectable
		injectableID := testhelper.CreateTestInjectable(t, pool, &workspaceID, "in_use_key", "In Use Injectable", entity.InjectableDataTypeText)
		defer testhelper.CleanupInjectable(t, pool, injectableID)

		// Create template and version that uses this injectable
		templateID := testhelper.CreateTestTemplate(t, pool, workspaceID, "Test Template", nil)
		defer testhelper.CleanupTemplate(t, pool, templateID)

		versionID := testhelper.CreateTestTemplateVersion(t, pool, templateID, 1, "v1.0", entity.VersionStatusDraft)
		defer testhelper.CleanupTemplateVersion(t, pool, versionID)

		// Link injectable to version
		versionInjectableID := testhelper.CreateTestVersionInjectable(t, pool, versionID, injectableID, true)
		defer testhelper.CleanupVersionInjectable(t, pool, versionInjectableID)

		// Try to delete the injectable - should fail
		resp, _ := client.
			WithAuth(admin.BearerHeader).
			WithWorkspaceID(workspaceID).
			DELETE(fmt.Sprintf("/api/v1/content/injectables/%s", injectableID))

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	})
}
