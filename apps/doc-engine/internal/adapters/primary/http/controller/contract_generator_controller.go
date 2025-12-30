package controller

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// ContractGeneratorController handles contract generation HTTP requests.
type ContractGeneratorController struct {
	generatorUC  usecase.ContractGeneratorUseCase
	injectableUC usecase.InjectableUseCase
}

// NewContractGeneratorController creates a new contract generator controller.
func NewContractGeneratorController(generatorUC usecase.ContractGeneratorUseCase, injectableUC usecase.InjectableUseCase) *ContractGeneratorController {
	return &ContractGeneratorController{
		generatorUC:  generatorUC,
		injectableUC: injectableUC,
	}
}

// RegisterRoutes registers all contract generator routes.
func (c *ContractGeneratorController) RegisterRoutes(rg *gin.RouterGroup, middlewareProvider *middleware.Provider) {
	content := rg.Group("/content")
	content.Use(middlewareProvider.WorkspaceContext())
	{
		// Generate contract requires EDITOR+ role
		content.POST("/generate-contract", middleware.RequireEditor(), c.GenerateContract)
	}
}

// GenerateContract generates a contract document from the provided content.
// @Summary Generate contract from image/PDF/DOCX/text
// @Description Analyzes the provided content (scanned image, PDF, DOCX, or text description) and generates a structured contract document using AI.
// @Tags Contract Generation
// @Accept json
// @Produce json
// @Param X-Workspace-ID header string true "Workspace ID"
// @Param request body dto.GenerateContractRequest true "Content to analyze"
// @Success 200 {object} dto.GenerateContractResponse
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /api/v1/content/generate-contract [post]
func (c *ContractGeneratorController) GenerateContract(ctx *gin.Context) {
	// Parse request body
	var req dto.GenerateContractRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		respondError(ctx, http.StatusBadRequest, err)
		return
	}

	// Validate mimeType is provided for image/pdf/docx
	if (req.ContentType == "image" || req.ContentType == "pdf" || req.ContentType == "docx") && req.MimeType == "" {
		respondError(ctx, http.StatusBadRequest, errMimeTypeRequired)
		return
	}

	// Default output language to Spanish
	if req.OutputLang == "" {
		req.OutputLang = "es"
	}

	// Get workspace ID from context
	workspaceID, _ := middleware.GetWorkspaceID(ctx)

	// Get available injectables from workspace
	var availableInjectables []usecase.InjectableInfo
	injectables, err := c.injectableUC.ListInjectables(ctx.Request.Context(), workspaceID)
	if err != nil {
		// Log error but don't block - use empty list
		slog.Warn("failed to load injectables for contract generation",
			slog.String("workspace_id", workspaceID),
			slog.Any("error", err),
		)
	} else {
		for _, inj := range injectables {
			availableInjectables = append(availableInjectables, usecase.InjectableInfo{
				Key:      inj.Key,
				Label:    inj.Label,
				DataType: string(inj.DataType),
			})
		}
	}

	slog.Info("generating contract",
		slog.String("workspace_id", workspaceID),
		slog.String("content_type", req.ContentType),
		slog.String("output_lang", req.OutputLang),
		slog.Int("available_injectables", len(availableInjectables)),
	)

	// Call use case
	result, err := c.generatorUC.GenerateContract(ctx.Request.Context(), usecase.GenerateContractCommand{
		WorkspaceID:          workspaceID,
		ContentType:          req.ContentType,
		Content:              req.Content,
		MimeType:             req.MimeType,
		OutputLang:           req.OutputLang,
		AvailableInjectables: availableInjectables,
	})
	if err != nil {
		slog.Error("failed to generate contract",
			slog.String("workspace_id", workspaceID),
			slog.Any("error", err),
		)
		HandleError(ctx, err)
		return
	}

	// Return response
	ctx.JSON(http.StatusOK, dto.GenerateContractResponse{
		Document:    result.Document,
		TokensUsed:  result.TokensUsed,
		Model:       result.Model,
		GeneratedAt: result.GeneratedAt,
	})
}

// errMimeTypeRequired is returned when mimeType is missing for image/pdf/docx content.
var errMimeTypeRequired = &validationError{message: "mimeType is required for image, pdf, and docx content types"}

type validationError struct {
	message string
}

func (e *validationError) Error() string {
	return e.message
}
