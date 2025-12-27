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

// MeController handles user-specific HTTP requests.
// These routes don't require X-Tenant-ID or X-Workspace-ID headers.
type MeController struct {
	tenantUC usecase.TenantUseCase
}

// NewMeController creates a new me controller.
func NewMeController(tenantUC usecase.TenantUseCase) *MeController {
	return &MeController{
		tenantUC: tenantUC,
	}
}

// RegisterRoutes registers all /me routes.
// These routes only require authentication, no tenant or workspace context.
func (c *MeController) RegisterRoutes(rg *gin.RouterGroup) {
	me := rg.Group("/me")
	{
		me.GET("/tenants", c.ListMyTenants)
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
