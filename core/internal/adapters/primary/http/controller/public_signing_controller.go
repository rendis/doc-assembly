package controller

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	documentuc "github.com/rendis/doc-assembly/core/internal/core/usecase/document"
)

// PublicSigningController handles public pre-signing endpoints.
// These endpoints do not require JWT authentication; they are validated by access token only.
type PublicSigningController struct {
	preSigningUC documentuc.PreSigningUseCase
}

// NewPublicSigningController creates a new public signing controller.
func NewPublicSigningController(preSigningUC documentuc.PreSigningUseCase) *PublicSigningController {
	return &PublicSigningController{
		preSigningUC: preSigningUC,
	}
}

// RegisterRoutes registers public signing routes.
// These routes are NOT behind the auth middleware chain.
func (c *PublicSigningController) RegisterRoutes(router gin.IRouter) {
	public := router.Group("/public/sign")
	{
		public.GET("/:token", c.GetPreSigningForm)
		public.POST("/:token", c.SubmitPreSigningForm)
	}
}

// GetPreSigningForm returns the pre-signing form data for a given access token.
// @Summary Get pre-signing form
// @Description Returns document content and interactive fields for the signer to fill in.
// @Tags Public Signing
// @Produce json
// @Param token path string true "Access token"
// @Success 200 {object} documentuc.PreSigningFormDTO
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /public/sign/{token} [get]
func (c *PublicSigningController) GetPreSigningForm(ctx *gin.Context) {
	token := ctx.Param("token")

	form, err := c.preSigningUC.GetPreSigningForm(ctx.Request.Context(), token)
	if err != nil {
		handlePublicError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, form)
}

// submitFormRequest is the request body for submitting pre-signing form responses.
type submitFormRequest struct {
	Responses []documentuc.FieldResponseInput `json:"responses" binding:"required"`
}

// SubmitPreSigningForm submits field responses and returns the signing URL.
// @Summary Submit pre-signing form
// @Description Validates and saves field responses, renders PDF, and sends for signing.
// @Tags Public Signing
// @Accept json
// @Produce json
// @Param token path string true "Access token"
// @Param request body submitFormRequest true "Field responses"
// @Success 200 {object} map[string]string "signingUrl"
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /public/sign/{token} [post]
func (c *PublicSigningController) SubmitPreSigningForm(ctx *gin.Context) {
	token := ctx.Param("token")

	var req submitFormRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	signingURL, err := c.preSigningUC.SubmitPreSigningForm(ctx.Request.Context(), token, req.Responses)
	if err != nil {
		handlePublicError(ctx, err)
		return
	}

	ctx.JSON(http.StatusOK, gin.H{
		"signingUrl": signingURL,
	})
}

// handlePublicError maps errors to appropriate HTTP responses for public endpoints.
// Token errors -> 401, validation errors -> 400, everything else -> 500 (without leaking internals).
func handlePublicError(ctx *gin.Context, err error) {
	switch {
	case errors.Is(err, entity.ErrInvalidToken):
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or unknown token"})
	case errors.Is(err, entity.ErrTokenExpired):
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "token has expired"})
	case errors.Is(err, entity.ErrMissingToken):
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
	case isPublicUserError(err):
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		slog.ErrorContext(ctx.Request.Context(), "public signing error", slog.String("error", err.Error()))
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "an internal error occurred"})
	}
}

// isPublicUserError checks if the error is safe to return to the public user.
// These are validation errors related to field responses or document state.
func isPublicUserError(err error) bool {
	msg := err.Error()
	return strings.HasPrefix(msg, "required field") ||
		strings.HasPrefix(msg, "unknown field") ||
		strings.HasPrefix(msg, "field ") ||
		strings.HasPrefix(msg, "document is not awaiting input") ||
		strings.HasPrefix(msg, "access token has already been used")
}
