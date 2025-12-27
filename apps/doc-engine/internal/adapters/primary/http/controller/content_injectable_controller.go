package controller

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/mapper"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// ContentInjectableController handles injectable-related HTTP requests.
type ContentInjectableController struct {
	injectableUC     usecase.InjectableUseCase
	injectableMapper *mapper.InjectableMapper
}

// NewContentInjectableController creates a new injectable controller.
func NewContentInjectableController(
	injectableUC usecase.InjectableUseCase,
	injectableMapper *mapper.InjectableMapper,
) *ContentInjectableController {
	return &ContentInjectableController{
		injectableUC:     injectableUC,
		injectableMapper: injectableMapper,
	}
}

// RegisterRoutes registers all injectable routes.
// All injectable routes require X-Workspace-ID header.
func (c *ContentInjectableController) RegisterRoutes(rg *gin.RouterGroup, middlewareProvider *middleware.Provider) {
	// Content group requires X-Workspace-ID header
	content := rg.Group("/content")
	content.Use(middlewareProvider.WorkspaceContext())
	{
		// Injectable routes
		injectables := content.Group("/injectables")
		{
			injectables.GET("", c.ListInjectables)                                              // VIEWER+
			injectables.POST("", middleware.RequireEditor(), c.CreateInjectable)                // EDITOR+
			injectables.GET("/:injectableId", c.GetInjectable)                                  // VIEWER+
			injectables.PUT("/:injectableId", middleware.RequireEditor(), c.UpdateInjectable)   // EDITOR+
			injectables.DELETE("/:injectableId", middleware.RequireAdmin(), c.DeleteInjectable) // ADMIN+
		}
	}
}

// ListInjectables lists all injectable definitions for a workspace.
// @Summary List injectables
// @Tags Injectables
// @Accept json
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Success 200 {object} dto.ListInjectablesResponse
// @Failure 401 {object} dto.ErrorResponse
// @Router /api/v1/content/injectables [get]
func (c *ContentInjectableController) ListInjectables(ctx *gin.Context) {
	workspaceID, _ := middleware.GetWorkspaceID(ctx)

	injectables, err := c.injectableUC.ListInjectables(ctx.Request.Context(), workspaceID)
	if err != nil {
		slog.Error("failed to list injectables",
			slog.String("workspace_id", workspaceID),
			slog.Any("error", err),
		)
		respondError(ctx, http.StatusInternalServerError, err)
		return
	}

	ctx.JSON(http.StatusOK, c.injectableMapper.ToListResponse(injectables))
}

// CreateInjectable creates a new injectable definition.
// @Summary Create injectable
// @Tags Injectables
// @Accept json
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param request body dto.CreateInjectableRequest true "Injectable data"
// @Success 201 {object} dto.InjectableResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 409 {object} dto.ErrorResponse
// @Router /api/v1/content/injectables [post]
func (c *ContentInjectableController) CreateInjectable(ctx *gin.Context) {
	workspaceID, _ := middleware.GetWorkspaceID(ctx)

	var req dto.CreateInjectableRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	cmd := c.injectableMapper.ToCreateCommand(&req, workspaceID)
	injectable, err := c.injectableUC.CreateInjectable(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, c.injectableMapper.ToResponse(injectable))
}

// GetInjectable retrieves an injectable by ID.
// @Summary Get injectable
// @Tags Injectables
// @Accept json
// @Produce json
// @Param injectableId path string true "Injectable ID"
// @Success 200 {object} dto.InjectableResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/content/injectables/{injectableId} [get]
func (c *ContentInjectableController) GetInjectable(ctx *gin.Context) {
	injectableID := ctx.Param("injectableId")

	injectable, err := c.injectableUC.GetInjectable(ctx.Request.Context(), injectableID)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, c.injectableMapper.ToResponse(injectable))
}

// UpdateInjectable updates an injectable definition.
// @Summary Update injectable
// @Tags Injectables
// @Accept json
// @Produce json
// @Param injectableId path string true "Injectable ID"
// @Param request body dto.UpdateInjectableRequest true "Injectable data"
// @Success 200 {object} dto.InjectableResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/content/injectables/{injectableId} [put]
func (c *ContentInjectableController) UpdateInjectable(ctx *gin.Context) {
	injectableID := ctx.Param("injectableId")

	var req dto.UpdateInjectableRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	cmd := c.injectableMapper.ToUpdateCommand(injectableID, &req)
	injectable, err := c.injectableUC.UpdateInjectable(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, c.injectableMapper.ToResponse(injectable))
}

// DeleteInjectable deletes an injectable definition.
// @Summary Delete injectable
// @Tags Injectables
// @Accept json
// @Produce json
// @Param injectableId path string true "Injectable ID"
// @Success 204 "No Content"
// @Failure 400 {object} dto.ErrorResponse
// @Failure 404 {object} dto.ErrorResponse
// @Router /api/v1/content/injectables/{injectableId} [delete]
func (c *ContentInjectableController) DeleteInjectable(ctx *gin.Context) {
	injectableID := ctx.Param("injectableId")

	if err := c.injectableUC.DeleteInjectable(ctx.Request.Context(), injectableID); err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.Status(http.StatusNoContent)
}
