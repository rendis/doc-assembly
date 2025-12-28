package controller

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/mapper"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// AdminController handles admin-related HTTP requests.
// All routes require system-level roles (SUPERADMIN or PLATFORM_ADMIN).
type AdminController struct {
	tenantUC     usecase.TenantUseCase
	workspaceUC  usecase.WorkspaceUseCase
	systemRoleUC usecase.SystemRoleUseCase
}

// NewAdminController creates a new admin controller.
func NewAdminController(
	tenantUC usecase.TenantUseCase,
	workspaceUC usecase.WorkspaceUseCase,
	systemRoleUC usecase.SystemRoleUseCase,
) *AdminController {
	return &AdminController{
		tenantUC:     tenantUC,
		workspaceUC:  workspaceUC,
		systemRoleUC: systemRoleUC,
	}
}

// RegisterRoutes registers all admin routes.
// System routes do NOT require X-Workspace-ID or X-Tenant-ID headers.
func (c *AdminController) RegisterRoutes(rg *gin.RouterGroup) {
	system := rg.Group("/system")
	system.Use(middleware.RequirePlatformAdmin()) // Base requirement: PLATFORM_ADMIN
	{
		// Tenant routes
		// List and Get: PLATFORM_ADMIN
		// Create and Delete: SUPERADMIN
		system.GET("/tenants", c.ListTenants)
		system.POST("/tenants", middleware.RequireSuperAdmin(), c.CreateTenant)
		system.GET("/tenants/:tenantId", c.GetTenant)
		system.PUT("/tenants/:tenantId", c.UpdateTenant)
		system.DELETE("/tenants/:tenantId", middleware.RequireSuperAdmin(), c.DeleteTenant)

		// System roles management (SUPERADMIN only)
		system.GET("/users", middleware.RequireSuperAdmin(), c.ListSystemUsers)
		system.POST("/users/:userId/role", middleware.RequireSuperAdmin(), c.AssignSystemRole)
		system.DELETE("/users/:userId/role", middleware.RequireSuperAdmin(), c.RevokeSystemRole)
	}
}

// --- Tenant Handlers ---

// ListTenants lists all tenants.
// @Summary List tenants
// @Tags System - Tenants
// @Accept json
// @Produce json
// @Success 200 {object} dto.ListResponse[dto.TenantResponse]
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /api/v1/system/tenants [get]
// @Security BearerAuth
func (c *AdminController) ListTenants(ctx *gin.Context) {
	tenants, err := c.tenantUC.ListTenants(ctx.Request.Context())
	if err != nil {
		HandleError(ctx, err)
		return
	}

	responses := mapper.TenantsToResponses(tenants)
	ctx.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// CreateTenant creates a new tenant.
// Requires SUPERADMIN role.
// @Summary Create tenant
// @Tags System - Tenants
// @Accept json
// @Produce json
// @Param request body dto.CreateTenantRequest true "Tenant data"
// @Success 201 {object} dto.TenantResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 409 {object} dto.ErrorResponse
// @Router /api/v1/system/tenants [post]
// @Security BearerAuth
func (c *AdminController) CreateTenant(ctx *gin.Context) {
	var req dto.CreateTenantRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	if err := req.Validate(); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	cmd := mapper.CreateTenantRequestToCommand(req)
	tenant, err := c.tenantUC.CreateTenant(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, mapper.TenantToResponse(tenant))
}

// GetTenant retrieves a tenant by ID.
// @Summary Get tenant
// @Tags System - Tenants
// @Accept json
// @Produce json
// @Param tenantId path string true "Tenant ID"
// @Success 200 {object} dto.TenantResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/system/tenants/{tenantId} [get]
// @Security BearerAuth
func (c *AdminController) GetTenant(ctx *gin.Context) {
	tenantID := ctx.Param("tenantId")

	tenant, err := c.tenantUC.GetTenant(ctx.Request.Context(), tenantID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, mapper.TenantToResponse(tenant))
}

// UpdateTenant updates a tenant.
// @Summary Update tenant
// @Tags System - Tenants
// @Accept json
// @Produce json
// @Param tenantId path string true "Tenant ID"
// @Param request body dto.UpdateTenantRequest true "Tenant data"
// @Success 200 {object} dto.TenantResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/system/tenants/{tenantId} [put]
// @Security BearerAuth
func (c *AdminController) UpdateTenant(ctx *gin.Context) {
	tenantID := ctx.Param("tenantId")

	var req dto.UpdateTenantRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	if err := req.Validate(); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	cmd := mapper.UpdateTenantRequestToCommand(tenantID, req)
	tenant, err := c.tenantUC.UpdateTenant(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, mapper.TenantToResponse(tenant))
}

// DeleteTenant deletes a tenant.
// @Summary Delete tenant
// @Tags System - Tenants
// @Accept json
// @Produce json
// @Param tenantId path string true "Tenant ID"
// @Success 204 "No Content"
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/system/tenants/{tenantId} [delete]
// @Security BearerAuth
func (c *AdminController) DeleteTenant(ctx *gin.Context) {
	tenantID := ctx.Param("tenantId")

	if err := c.tenantUC.DeleteTenant(ctx.Request.Context(), tenantID); err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// --- System Role Handlers ---

// ListSystemUsers lists all users with system roles.
// Requires SUPERADMIN role.
// @Summary List users with system roles
// @Tags System - Users
// @Accept json
// @Produce json
// @Success 200 {object} dto.ListResponse[dto.SystemRoleWithUserResponse]
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /api/v1/system/users [get]
// @Security BearerAuth
func (c *AdminController) ListSystemUsers(ctx *gin.Context) {
	users, err := c.systemRoleUC.ListUsersWithSystemRoles(ctx.Request.Context())
	if err != nil {
		HandleError(ctx, err)
		return
	}

	responses := mapper.SystemRolesWithUserToResponses(users)
	ctx.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// AssignSystemRole assigns a system role to a user.
// Requires SUPERADMIN role.
// @Summary Assign system role
// @Tags System - Users
// @Accept json
// @Produce json
// @Param userId path string true "User ID"
// @Param request body dto.AssignSystemRoleRequest true "Role data"
// @Success 200 {object} dto.SystemRoleResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/system/users/{userId}/role [post]
// @Security BearerAuth
func (c *AdminController) AssignSystemRole(ctx *gin.Context) {
	userID := ctx.Param("userId")

	grantedBy, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		respondError(ctx, http.StatusUnauthorized, entity.ErrUnauthorized)
		return
	}

	var req dto.AssignSystemRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	if err := req.Validate(); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	cmd := mapper.AssignSystemRoleRequestToCommand(userID, req, grantedBy)
	assignment, err := c.systemRoleUC.AssignRole(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, mapper.SystemRoleToResponse(assignment))
}

// RevokeSystemRole revokes a user's system role.
// Requires SUPERADMIN role.
// @Summary Revoke system role
// @Tags System - Users
// @Accept json
// @Produce json
// @Param userId path string true "User ID"
// @Success 204 "No Content"
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/system/users/{userId}/role [delete]
// @Security BearerAuth
func (c *AdminController) RevokeSystemRole(ctx *gin.Context) {
	userID := ctx.Param("userId")

	revokedBy, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		respondError(ctx, http.StatusUnauthorized, entity.ErrUnauthorized)
		return
	}

	cmd := mapper.RevokeSystemRoleToCommand(userID, revokedBy)
	if err := c.systemRoleUC.RevokeRole(ctx.Request.Context(), cmd); err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// --- Helper Functions ---

