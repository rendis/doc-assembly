package controller

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	documentuc "github.com/rendis/doc-assembly/core/internal/core/usecase/document"
)

// PublicDocumentAccessController handles public document access endpoints.
// These endpoints implement the email-verification gate for public signing.
type PublicDocumentAccessController struct {
	accessUC documentuc.DocumentAccessUseCase
}

// NewPublicDocumentAccessController creates a new public document access controller.
func NewPublicDocumentAccessController(accessUC documentuc.DocumentAccessUseCase) *PublicDocumentAccessController {
	return &PublicDocumentAccessController{accessUC: accessUC}
}

// RegisterRoutes registers public document access routes.
// These routes are NOT behind the auth middleware chain.
func (c *PublicDocumentAccessController) RegisterRoutes(router gin.IRouter) {
	public := router.Group("/public/doc")
	{
		public.GET("/:documentId", c.GetPublicDocumentInfo)
		public.POST("/:documentId/request-access", c.RequestAccess)
	}
}

// requestAccessBody is the request body for requesting document access.
type requestAccessBody struct {
	Email string `json:"email" binding:"required,email"`
}

// GetPublicDocumentInfo returns minimal public info about a document.
// @Summary Get public document info
// @Description Returns document title and status for the public access page.
// @Tags Public Document Access
// @Produce json
// @Param documentId path string true "Document ID"
// @Success 200 {object} documentuc.PublicDocumentInfoResponse
// @Failure 404 {object} map[string]string
// @Router /public/doc/{documentId} [get]
func (c *PublicDocumentAccessController) GetPublicDocumentInfo(ctx *gin.Context) {
	documentID := ctx.Param("documentId")

	resp, err := c.accessUC.GetPublicDocumentInfo(ctx.Request.Context(), documentID)
	if err != nil {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "document not found"})
		return
	}

	ctx.JSON(http.StatusOK, resp)
}

// RequestAccess validates email and sends an access link.
// Always returns 200 to prevent email enumeration.
// @Summary Request document access
// @Description Validates email against document recipients and sends an access link via email. Always returns 200.
// @Tags Public Document Access
// @Accept json
// @Produce json
// @Param documentId path string true "Document ID"
// @Param request body requestAccessBody true "Email address"
// @Success 200 {object} map[string]string
// @Router /public/doc/{documentId}/request-access [post]
func (c *PublicDocumentAccessController) RequestAccess(ctx *gin.Context) {
	documentID := ctx.Param("documentId")

	var req requestAccessBody
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "a valid email address is required"})
		return
	}

	email := strings.TrimSpace(req.Email)
	_ = c.accessUC.RequestAccess(ctx.Request.Context(), documentID, email)

	ctx.JSON(http.StatusOK, gin.H{
		"message": "If your email is associated with this document, you will receive a signing link shortly.",
	})
}
