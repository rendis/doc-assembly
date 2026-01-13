package controller

import (
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// Internal API header constants.
const (
	HeaderExternalID      = "X-External-ID"
	HeaderTemplateID      = "X-Template-ID"
	HeaderTransactionalID = "X-Transactional-ID"
)

// InternalDocumentController handles internal API document requests.
// These endpoints are used for service-to-service communication.
type InternalDocumentController struct {
	internalDocUC usecase.InternalDocumentUseCase
}

// NewInternalDocumentController creates a new internal document controller.
func NewInternalDocumentController(
	internalDocUC usecase.InternalDocumentUseCase,
) *InternalDocumentController {
	return &InternalDocumentController{
		internalDocUC: internalDocUC,
	}
}

// RegisterRoutes registers all internal document routes.
// The API key is validated via middleware.
func (c *InternalDocumentController) RegisterRoutes(api *gin.RouterGroup, apiKey string) {
	internal := api.Group("/internal/documents")
	internal.Use(middleware.APIKeyAuth(apiKey))
	{
		internal.POST("/create", c.CreateDocument)
		// Future endpoints:
		// internal.POST("/renew", c.RenewDocument)
		// internal.POST("/amend", c.AmendDocument)
		// internal.POST("/cancel", c.CancelDocument)
		// internal.POST("/preview", c.PreviewDocument)
	}
}

// CreateDocument creates a document via internal API.
// @Summary Create document via internal API
// @Description Creates a new document using the extension system (Mapper, Init, Injectors)
// @Tags Internal
// @Accept json
// @Produce json
// @Param X-API-Key header string true "API Key for authentication"
// @Param X-External-ID header string true "External ID (e.g., CRM entity ID)"
// @Param X-Template-ID header string true "Template ID to use"
// @Param X-Transactional-ID header string true "Transactional ID for traceability"
// @Success 201 {object} dto.InternalCreateDocumentWithRecipientsResponse
// @Failure 400 {object} dto.InternalErrorResponse
// @Failure 401 {object} dto.InternalErrorResponse
// @Failure 404 {object} dto.InternalErrorResponse
// @Failure 500 {object} dto.InternalErrorResponse
// @Router /api/v1/internal/documents/create [post]
func (c *InternalDocumentController) CreateDocument(ctx *gin.Context) {
	// Extract required headers
	externalID := ctx.GetHeader(HeaderExternalID)
	templateID := ctx.GetHeader(HeaderTemplateID)
	transactionalID := ctx.GetHeader(HeaderTransactionalID)

	// Validate required headers
	if externalID == "" || templateID == "" || transactionalID == "" {
		var missing []string
		if externalID == "" {
			missing = append(missing, HeaderExternalID)
		}
		if templateID == "" {
			missing = append(missing, HeaderTemplateID)
		}
		if transactionalID == "" {
			missing = append(missing, HeaderTransactionalID)
		}
		ctx.JSON(http.StatusBadRequest, dto.InternalErrorResponse{
			Error:   "missing required headers",
			Code:    "MISSING_HEADERS",
			Details: missing,
		})
		return
	}

	// Read raw body
	rawBody, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, dto.InternalErrorResponse{
			Error: "failed to read request body",
			Code:  "INVALID_BODY",
		})
		return
	}

	// Extract all headers
	headers := make(map[string]string)
	for key := range ctx.Request.Header {
		headers[key] = ctx.GetHeader(key)
	}

	// Build command
	cmd := usecase.InternalCreateCommand{
		ExternalID:      externalID,
		TemplateID:      templateID,
		TransactionalID: transactionalID,
		Headers:         headers,
		RawBody:         rawBody,
	}

	// Execute use case
	doc, err := c.internalDocUC.CreateDocument(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	// Build response
	response := dto.InternalCreateDocumentWithRecipientsResponse{
		InternalCreateDocumentResponse: dto.InternalCreateDocumentResponse{
			ID:                doc.ID,
			WorkspaceID:       doc.WorkspaceID,
			TemplateID:        templateID,
			TemplateVersionID: doc.TemplateVersionID,
			ExternalID:        externalID,
			TransactionalID:   transactionalID,
			OperationType:     string(doc.OperationType),
			Status:            string(doc.Status),
			SignerProvider:    doc.SignerProvider,
			CreatedAt:         doc.CreatedAt.Format(time.RFC3339),
		},
	}

	// Add recipients
	for _, r := range doc.Recipients {
		response.Recipients = append(response.Recipients, dto.InternalDocumentRecipientResponse{
			ID:    r.ID,
			Name:  r.Name,
			Email: r.Email,
		})
	}

	ctx.JSON(http.StatusCreated, response)
}
