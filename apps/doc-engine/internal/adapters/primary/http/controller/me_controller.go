package controller

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/mapper"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// MeController handles user-specific HTTP requests.
// These routes don't require X-Tenant-ID or X-Workspace-ID headers.
type MeController struct {
	tenantUC            usecase.TenantUseCase
	tenantMemberRepo    port.TenantMemberRepository
	workspaceMemberRepo port.WorkspaceMemberRepository
	accessHistoryUC     usecase.UserAccessHistoryUseCase
}

// NewMeController creates a new me controller.
func NewMeController(
	tenantUC usecase.TenantUseCase,
	tenantMemberRepo port.TenantMemberRepository,
	workspaceMemberRepo port.WorkspaceMemberRepository,
	accessHistoryUC usecase.UserAccessHistoryUseCase,
) *MeController {
	return &MeController{
		tenantUC:            tenantUC,
		tenantMemberRepo:    tenantMemberRepo,
		workspaceMemberRepo: workspaceMemberRepo,
		accessHistoryUC:     accessHistoryUC,
	}
}

// RegisterRoutes registers all /me routes.
// These routes only require authentication, no tenant or workspace context.
func (c *MeController) RegisterRoutes(rg *gin.RouterGroup) {
	me := rg.Group("/me")
	{
		me.GET("/tenants", c.ListMyTenants)
		me.GET("/roles", c.GetMyRoles)
		me.POST("/access", c.RecordAccess)
	}
}

const maxRecentTenants = 10

// ListMyTenants lists the recently accessed tenants for the current user.
// Returns up to 10 tenants, prioritizing recently accessed ones.
// If there are fewer than 10 in the access history, fills with remaining memberships.
// @Summary List my recently accessed tenants
// @Tags Me
// @Accept json
// @Produce json
// @Success 200 {object} dto.ListResponse[dto.TenantWithRoleResponse]
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/me/tenants [get]
// @Security BearerAuth
func (c *MeController) ListMyTenants(ctx *gin.Context) {
	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		HandleError(ctx, entity.ErrUnauthorized)
		return
	}

	// 1. Get recent tenant IDs from access history
	recentIDs, err := c.accessHistoryUC.GetRecentTenantIDs(ctx.Request.Context(), userID)
	if err != nil {
		slog.Warn("failed to get recent tenant IDs",
			slog.String("user_id", userID),
			slog.String("error", err.Error()))
		recentIDs = []string{}
	}

	// 2. Get tenant details for recent IDs (preserves order)
	var recentTenants []*entity.TenantWithRole
	if len(recentIDs) > 0 {
		recentTenants, err = c.tenantMemberRepo.FindTenantsWithRoleByUserAndIDs(ctx.Request.Context(), userID, recentIDs)
		if err != nil {
			HandleError(ctx, err)
			return
		}
	}

	// 3. If we have enough, return them
	if len(recentTenants) >= maxRecentTenants {
		responses := mapper.TenantsWithRoleToResponses(recentTenants[:maxRecentTenants])
		ctx.JSON(http.StatusOK, dto.NewListResponse(responses))
		return
	}

	// 4. Need to fill with additional tenants from memberships
	allTenants, err := c.tenantMemberRepo.FindTenantsWithRoleByUser(ctx.Request.Context(), userID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	// 5. Build result: recent first, then fill with non-duplicate memberships
	result := make([]*entity.TenantWithRole, 0, maxRecentTenants)
	result = append(result, recentTenants...)

	// Create a set of recent tenant IDs for O(1) lookup
	recentSet := make(map[string]struct{}, len(recentTenants))
	for _, t := range recentTenants {
		recentSet[t.Tenant.ID] = struct{}{}
	}

	// Add non-duplicate tenants until we reach 10
	for _, t := range allTenants {
		if len(result) >= maxRecentTenants {
			break
		}
		if _, exists := recentSet[t.Tenant.ID]; !exists {
			result = append(result, t)
		}
	}

	responses := mapper.TenantsWithRoleToResponses(result)
	ctx.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// GetMyRoles returns the roles of the current user.
// Optionally includes tenant and workspace roles if X-Tenant-ID and X-Workspace-ID headers are provided.
// @Summary Get my roles
// @Description Returns the current user's roles. Always includes system role if assigned.
// @Description Optionally includes tenant role if X-Tenant-ID header is provided.
// @Description Optionally includes workspace role if X-Workspace-ID header is provided.
// @Tags Me
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string false "Tenant ID to check role for"
// @Param X-Workspace-ID header string false "Workspace ID to check role for"
// @Success 200 {object} dto.MyRolesResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/me/roles [get]
// @Security BearerAuth
func (c *MeController) GetMyRoles(ctx *gin.Context) {
	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		HandleError(ctx, entity.ErrUnauthorized)
		return
	}

	roles := []dto.RoleEntry{}

	// Check for system role (already loaded by SystemRoleContext middleware)
	if systemRole, ok := middleware.GetSystemRole(ctx); ok {
		roles = append(roles, dto.RoleEntry{
			Type:       "SYSTEM",
			Role:       string(systemRole),
			ResourceID: nil,
		})
	}

	// Check for tenant role if X-Tenant-ID header is provided
	if tenantID, ok := middleware.GetTenantIDFromHeader(ctx); ok {
		member, err := c.tenantMemberRepo.FindActiveByUserAndTenant(ctx.Request.Context(), userID, tenantID)
		if err == nil && member != nil {
			roles = append(roles, dto.RoleEntry{
				Type:       "TENANT",
				Role:       string(member.Role),
				ResourceID: &tenantID,
			})
		}
	}

	// Check for workspace role if X-Workspace-ID header is provided
	if workspaceID, ok := middleware.GetWorkspaceIDFromHeader(ctx); ok {
		member, err := c.workspaceMemberRepo.FindActiveByUserAndWorkspace(ctx.Request.Context(), userID, workspaceID)
		if err == nil && member != nil {
			roles = append(roles, dto.RoleEntry{
				Type:       "WORKSPACE",
				Role:       string(member.Role),
				ResourceID: &workspaceID,
			})
		}
	}

	ctx.JSON(http.StatusOK, dto.NewMyRolesResponse(roles))
}

// RecordAccess records that the user accessed a tenant or workspace.
// @Summary Record resource access
// @Description Records that the user accessed a tenant or workspace for quick access history
// @Tags Me
// @Accept json
// @Produce json
// @Param request body dto.RecordAccessRequest true "Access details"
// @Success 204 "Access recorded"
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /api/v1/me/access [post]
// @Security BearerAuth
func (c *MeController) RecordAccess(ctx *gin.Context) {
	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		HandleError(ctx, entity.ErrUnauthorized)
		return
	}

	var req dto.RecordAccessRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	if err := req.Validate(); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	var err error
	switch entity.AccessEntityType(req.EntityType) {
	case entity.AccessEntityTypeTenant:
		err = c.accessHistoryUC.RecordTenantAccess(ctx.Request.Context(), userID, req.EntityID)
	case entity.AccessEntityTypeWorkspace:
		err = c.accessHistoryUC.RecordWorkspaceAccess(ctx.Request.Context(), userID, req.EntityID)
	}

	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}
