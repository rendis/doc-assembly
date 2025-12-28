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

// TenantController handles tenant-scoped HTTP requests.
// All routes require X-Tenant-ID header and appropriate tenant role.
type TenantController struct {
	tenantUC       usecase.TenantUseCase
	workspaceUC    usecase.WorkspaceUseCase
	tenantMemberUC usecase.TenantMemberUseCase
}

// NewTenantController creates a new tenant controller.
func NewTenantController(
	tenantUC usecase.TenantUseCase,
	workspaceUC usecase.WorkspaceUseCase,
	tenantMemberUC usecase.TenantMemberUseCase,
) *TenantController {
	return &TenantController{
		tenantUC:       tenantUC,
		workspaceUC:    workspaceUC,
		tenantMemberUC: tenantMemberUC,
	}
}

// RegisterRoutes registers all /tenant routes.
// These routes require X-Tenant-ID header and tenant context.
func (c *TenantController) RegisterRoutes(rg *gin.RouterGroup, middlewareProvider *middleware.Provider) {
	tenant := rg.Group("/tenant")
	tenant.Use(middlewareProvider.TenantContext())
	{
		// Tenant info
		tenant.GET("", middleware.AuthorizeTenantRole(entity.TenantRoleAdmin), c.GetTenant)
		tenant.PUT("", middleware.AuthorizeTenantRole(entity.TenantRoleOwner), c.UpdateCurrentTenant)

		// Workspace routes within tenant
		tenant.GET("/workspaces/search", middleware.AuthorizeTenantRole(entity.TenantRoleAdmin), c.SearchWorkspaces)
		tenant.GET("/workspaces/list", middleware.AuthorizeTenantRole(entity.TenantRoleAdmin), c.ListWorkspacesPaginated)
		tenant.POST("/workspaces", middleware.AuthorizeTenantRole(entity.TenantRoleOwner), c.CreateWorkspace)
		tenant.DELETE("/workspaces/:workspaceId", middleware.AuthorizeTenantRole(entity.TenantRoleOwner), c.DeleteWorkspace)

		// Tenant member routes
		tenant.GET("/members", middleware.AuthorizeTenantRole(entity.TenantRoleAdmin), c.ListTenantMembers)
		tenant.POST("/members", middleware.AuthorizeTenantRole(entity.TenantRoleOwner), c.AddTenantMember)
		tenant.GET("/members/:memberId", middleware.AuthorizeTenantRole(entity.TenantRoleAdmin), c.GetTenantMember)
		tenant.PUT("/members/:memberId", middleware.AuthorizeTenantRole(entity.TenantRoleOwner), c.UpdateTenantMemberRole)
		tenant.DELETE("/members/:memberId", middleware.AuthorizeTenantRole(entity.TenantRoleOwner), c.RemoveTenantMember)
	}
}

// GetTenant retrieves the current tenant info.
// @Summary Get current tenant
// @Tags Tenant
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Success 200 {object} dto.TenantResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/tenant [get]
// @Security BearerAuth
func (c *TenantController) GetTenant(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	tenant, err := c.tenantUC.GetTenant(ctx.Request.Context(), tenantID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, mapper.TenantToResponse(tenant))
}

// UpdateCurrentTenant updates the current tenant's info.
// @Summary Update current tenant
// @Tags Tenant
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param request body dto.UpdateTenantRequest true "Tenant data"
// @Success 200 {object} dto.TenantResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/tenant [put]
// @Security BearerAuth
func (c *TenantController) UpdateCurrentTenant(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	var req dto.UpdateTenantRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	if err := req.Validate(); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
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

// SearchWorkspaces searches workspaces by name in the current tenant.
// @Summary Search workspaces by name
// @Tags Tenant - Workspaces
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param q query string true "Search query (name)"
// @Success 200 {object} dto.ListResponse[dto.WorkspaceResponse]
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /api/v1/tenant/workspaces/search [get]
// @Security BearerAuth
func (c *TenantController) SearchWorkspaces(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	var req dto.WorkspaceSearchRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	workspaces, err := c.workspaceUC.SearchWorkspaces(ctx.Request.Context(), tenantID, req.Query)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	responses := mapper.WorkspacesToResponses(workspaces)
	ctx.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// ListWorkspacesPaginated lists workspaces with pagination in the current tenant.
// @Summary List workspaces with pagination
// @Tags Tenant - Workspaces
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param limit query int false "Number of items per page" default(20)
// @Param offset query int false "Number of items to skip" default(0)
// @Success 200 {object} dto.PaginatedWorkspacesResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /api/v1/tenant/workspaces/list [get]
// @Security BearerAuth
func (c *TenantController) ListWorkspacesPaginated(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	var req dto.WorkspaceListRequest
	if err := ctx.ShouldBindQuery(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	filters := mapper.WorkspaceListRequestToFilters(req)
	workspaces, total, err := c.workspaceUC.ListWorkspacesPaginated(ctx.Request.Context(), tenantID, filters)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, mapper.WorkspacesToPaginatedResponse(workspaces, total, req.Limit, req.Offset))
}

// CreateWorkspace creates a new workspace in the current tenant.
// @Summary Create workspace in tenant
// @Tags Tenant - Workspaces
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param request body dto.CreateWorkspaceRequest true "Workspace data"
// @Success 201 {object} dto.WorkspaceResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /api/v1/tenant/workspaces [post]
// @Security BearerAuth
func (c *TenantController) CreateWorkspace(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, dto.NewErrorResponse(entity.ErrUnauthorized))
		return
	}

	var req dto.CreateWorkspaceRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	if err := req.Validate(); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	cmd := mapper.CreateWorkspaceRequestToCommand(req, userID)
	cmd.TenantID = &tenantID // Override with tenant from context

	workspace, err := c.workspaceUC.CreateWorkspace(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, mapper.WorkspaceToResponse(workspace))
}

// DeleteWorkspace deletes a workspace from the current tenant.
// @Summary Delete workspace from tenant
// @Tags Tenant - Workspaces
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param workspaceId path string true "Workspace ID"
// @Success 204 "No Content"
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/tenant/workspaces/{workspaceId} [delete]
// @Security BearerAuth
func (c *TenantController) DeleteWorkspace(ctx *gin.Context) {
	workspaceID := ctx.Param("workspaceId")

	// TODO: Verify workspace belongs to current tenant before deleting
	if err := c.workspaceUC.ArchiveWorkspace(ctx.Request.Context(), workspaceID); err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}

// ListTenantMembers lists all members of the current tenant.
// @Summary List tenant members
// @Tags Tenant - Members
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Success 200 {object} dto.ListResponse[dto.TenantMemberResponse]
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Router /api/v1/tenant/members [get]
// @Security BearerAuth
func (c *TenantController) ListTenantMembers(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	members, err := c.tenantMemberUC.ListMembers(ctx.Request.Context(), tenantID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	responses := mapper.TenantMembersToResponses(members)
	ctx.JSON(http.StatusOK, dto.NewListResponse(responses))
}

// AddTenantMember adds a user to the current tenant.
// @Summary Add tenant member
// @Tags Tenant - Members
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param request body dto.AddTenantMemberRequest true "Member data"
// @Success 201 {object} dto.TenantMemberResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 409 {object} dto.ErrorResponse
// @Router /api/v1/tenant/members [post]
// @Security BearerAuth
func (c *TenantController) AddTenantMember(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, dto.NewErrorResponse(entity.ErrUnauthorized))
		return
	}

	var req dto.AddTenantMemberRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	if err := req.Validate(); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	cmd := mapper.AddTenantMemberRequestToCommand(tenantID, req, userID)
	member, err := c.tenantMemberUC.AddMember(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, mapper.TenantMemberToResponse(member))
}

// GetTenantMember retrieves a specific tenant member.
// @Summary Get tenant member
// @Tags Tenant - Members
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param memberId path string true "Member ID"
// @Success 200 {object} dto.TenantMemberResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/tenant/members/{memberId} [get]
// @Security BearerAuth
func (c *TenantController) GetTenantMember(ctx *gin.Context) {
	memberID := ctx.Param("memberId")

	member, err := c.tenantMemberUC.GetMember(ctx.Request.Context(), memberID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, mapper.TenantMemberToResponse(member))
}

// UpdateTenantMemberRole updates a tenant member's role.
// @Summary Update tenant member role
// @Tags Tenant - Members
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param memberId path string true "Member ID"
// @Param request body dto.UpdateTenantMemberRoleRequest true "Role data"
// @Success 200 {object} dto.TenantMemberResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/tenant/members/{memberId} [put]
// @Security BearerAuth
func (c *TenantController) UpdateTenantMemberRole(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, dto.NewErrorResponse(entity.ErrUnauthorized))
		return
	}

	memberID := ctx.Param("memberId")

	var req dto.UpdateTenantMemberRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	if err := req.Validate(); err != nil {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(err))
		return
	}

	cmd := mapper.UpdateTenantMemberRoleRequestToCommand(memberID, tenantID, req, userID)
	member, err := c.tenantMemberUC.UpdateMemberRole(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, mapper.TenantMemberToResponse(member))
}

// RemoveTenantMember removes a member from the current tenant.
// @Summary Remove tenant member
// @Tags Tenant - Members
// @Accept json
// @Produce json
// @Param X-Tenant-ID header string true "Tenant ID"
// @Param memberId path string true "Member ID"
// @Success 204 "No Content"
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 403 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/tenant/members/{memberId} [delete]
// @Security BearerAuth
func (c *TenantController) RemoveTenantMember(ctx *gin.Context) {
	tenantID, ok := middleware.GetTenantID(ctx)
	if !ok {
		ctx.JSON(http.StatusBadRequest, dto.NewErrorResponse(entity.ErrMissingTenantID))
		return
	}

	userID, ok := middleware.GetInternalUserID(ctx)
	if !ok {
		ctx.JSON(http.StatusUnauthorized, dto.NewErrorResponse(entity.ErrUnauthorized))
		return
	}

	memberID := ctx.Param("memberId")

	cmd := mapper.RemoveTenantMemberToCommand(memberID, tenantID, userID)
	if err := c.tenantMemberUC.RemoveMember(ctx.Request.Context(), cmd); err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}
