package controller

import (
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
}

// NewMeController creates a new me controller.
func NewMeController(
	tenantUC usecase.TenantUseCase,
	tenantMemberRepo port.TenantMemberRepository,
	workspaceMemberRepo port.WorkspaceMemberRepository,
) *MeController {
	return &MeController{
		tenantUC:            tenantUC,
		tenantMemberRepo:    tenantMemberRepo,
		workspaceMemberRepo: workspaceMemberRepo,
	}
}

// RegisterRoutes registers all /me routes.
// These routes only require authentication, no tenant or workspace context.
func (c *MeController) RegisterRoutes(rg *gin.RouterGroup) {
	me := rg.Group("/me")
	{
		me.GET("/tenants", c.ListMyTenants)
		me.GET("/roles", c.GetMyRoles)
	}
}

// ListMyTenants lists all tenants the current user belongs to.
// @Summary List my tenants
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

	tenants, err := c.tenantUC.ListUserTenants(ctx.Request.Context(), userID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	responses := mapper.TenantsWithRoleToResponses(tenants)
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
