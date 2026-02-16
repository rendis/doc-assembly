package controller

import (
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/dto"
	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/middleware"
	"github.com/rendis/doc-assembly/core/internal/core/entity"
	documentuc "github.com/rendis/doc-assembly/core/internal/core/usecase/document"
)

// Internal API header constants.
const (
	HeaderExternalID      = "X-External-ID"
	HeaderTemplateID      = "X-Template-ID"
	HeaderTransactionalID = "X-Transactional-ID"
)

// internalDocHeaders holds the required headers for internal document operations.
type internalDocHeaders struct {
	ExternalID      string
	TemplateID      string
	TransactionalID string
}

// InternalDocumentController handles internal API document requests.
// These endpoints are used for service-to-service communication.
type InternalDocumentController struct {
	internalDocUC documentuc.InternalDocumentUseCase
}

// NewInternalDocumentController creates a new internal document controller.
func NewInternalDocumentController(
	internalDocUC documentuc.InternalDocumentUseCase,
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
	h, missing := validateAndExtractHeaders(ctx)
	if len(missing) > 0 {
		ctx.JSON(http.StatusBadRequest, dto.InternalErrorResponse{
			Error:   "missing required headers",
			Code:    "MISSING_HEADERS",
			Details: missing,
		})
		return
	}

	rawBody, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, dto.InternalErrorResponse{
			Error: "failed to read request body",
			Code:  "INVALID_BODY",
		})
		return
	}

	headers := make(map[string]string)
	for key := range ctx.Request.Header {
		headers[key] = ctx.GetHeader(key)
	}

	cmd := documentuc.InternalCreateCommand{
		ExternalID:      h.ExternalID,
		TemplateID:      h.TemplateID,
		TransactionalID: h.TransactionalID,
		Headers:         headers,
		RawBody:         rawBody,
	}

	doc, err := c.internalDocUC.CreateDocument(ctx.Request.Context(), cmd)
	if err != nil {
		HandleError(ctx, err)
		return
	}

	ctx.JSON(http.StatusCreated, buildCreateDocumentResponse(doc, h))
}

// validateAndExtractHeaders validates and extracts required headers from the request.
// Returns the headers struct and a list of missing header names (empty if all present).
func validateAndExtractHeaders(ctx *gin.Context) (*internalDocHeaders, []string) {
	h := &internalDocHeaders{
		ExternalID:      ctx.GetHeader(HeaderExternalID),
		TemplateID:      ctx.GetHeader(HeaderTemplateID),
		TransactionalID: ctx.GetHeader(HeaderTransactionalID),
	}

	var missing []string
	if h.ExternalID == "" {
		missing = append(missing, HeaderExternalID)
	}
	if h.TemplateID == "" {
		missing = append(missing, HeaderTemplateID)
	}
	if h.TransactionalID == "" {
		missing = append(missing, HeaderTransactionalID)
	}

	return h, missing
}

// buildCreateDocumentResponse builds the response DTO from the document and headers.
func buildCreateDocumentResponse(
	doc *entity.DocumentWithRecipients,
	h *internalDocHeaders,
) dto.InternalCreateDocumentWithRecipientsResponse {
	response := dto.InternalCreateDocumentWithRecipientsResponse{
		InternalCreateDocumentResponse: dto.InternalCreateDocumentResponse{
			ID:                doc.ID,
			WorkspaceID:       doc.WorkspaceID,
			TemplateID:        h.TemplateID,
			TemplateVersionID: doc.TemplateVersionID,
			ExternalID:        h.ExternalID,
			TransactionalID:   h.TransactionalID,
			OperationType:     string(doc.OperationType),
			Status:            string(doc.Status),
			SignerProvider:    doc.SignerProvider,
			CreatedAt:         doc.CreatedAt.Format(time.RFC3339),
		},
	}

	for _, r := range doc.Recipients {
		response.Recipients = append(response.Recipients, dto.InternalDocumentRecipientResponse{
			ID:         r.ID,
			Name:       r.Name,
			Email:      r.Email,
			SigningURL: r.SigningURL,
		})
	}

	return response
}
