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
		me.GET("/tenants/search", c.SearchMyTenants)
		me.GET("/tenants/list", c.ListMyTenantsPaginated)
		me.GET("/roles", c.GetMyRoles)
		me.POST("/access", c.RecordAccess)
	}
}

// SearchMyTenants searches tenants by name or code similarity for the current user.
// Returns up to 10 tenants that the user is a member of, ordered by similarity.
// @Summary Search my tenants
// @Description Searches tenants by name or code similarity. Only returns tenants where the user is an active member.
// @Tags Me
// @Accept json
// @Produce json
// @Param q query string true "Search query for tenant name or code"
// @Success 200 {object} dto.ListResponse[dto.TenantWithRoleResponse]
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/me/tenants/search [get]
// @Security BearerAuth
func (c *MeController) SearchMyTenants(ctx *gin.Context) {
	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		HandleError(ctx, entity.ErrUnauthorized)
		return
	}

	var req dto.TenantSearchRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	tenants, err := c.tenantUC.SearchUserTenants(ctx.Request.Context(), userID, req.Query)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	responses := mapper.TenantsWithRoleToResponses(tenants)
	ctx.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// ListMyTenantsPaginated lists tenants the current user is a member of with pagination.
// @Summary List my tenants with pagination
// @Description Lists tenants where the user is an active member. Supports pagination.
// @Tags Me
// @Accept json
// @Produce json
// @Param limit query int false "Number of items per page" default(20)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {object} dto.PaginatedTenantsWithRoleResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/me/tenants/list [get]
// @Security BearerAuth
func (c *MeController) ListMyTenantsPaginated(ctx *gin.Context) {
	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		HandleError(ctx, entity.ErrUnauthorized)
		return
	}

	var req dto.TenantListRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	filters := mapper.TenantMemberListRequestToFilters(req)
	tenants, total, err := c.tenantUC.ListUserTenantsPaginated(ctx.Request.Context(), userID, filters)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	response := mapper.TenantsWithRoleToPaginatedResponse(tenants, total, filters.Limit, filters.Offset)
	ctx.JSON(http.StatusOK, response)
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
