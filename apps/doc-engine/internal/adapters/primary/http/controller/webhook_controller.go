package controller

import (
	"io"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	_ "github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// WebhookController handles incoming webhooks from signing providers.
type WebhookController struct {
	documentUC      usecase.DocumentUseCase
	webhookHandlers map[string]port.WebhookHandler
}

// NewWebhookController creates a new webhook controller.
func NewWebhookController(
	documentUC usecase.DocumentUseCase,
	webhookHandlers map[string]port.WebhookHandler,
) *WebhookController {
	return &WebhookController{
		documentUC:      documentUC,
		webhookHandlers: webhookHandlers,
	}
}

// RegisterRoutes registers webhook routes.
// Webhooks are not protected by auth middleware as they come from external providers.
func (c *WebhookController) RegisterRoutes(router *gin.Engine) {
	webhooks := router.Group("/webhooks")
	{
		// Provider-specific webhook endpoints
		webhooks.POST("/signing/:provider", c.HandleSigningWebhook)
	}
}

// HandleSigningWebhook processes incoming webhooks from signing providers.
// @Summary Handle signing provider webhook
// @Tags Webhooks
// @Accept json
// @Produce json
// @Param provider path string true "Provider name (e.g., documenso)"
// @Param X-Documenso-Secret header string false "Webhook signature (for Documenso)"
// @Param X-Webhook-Signature header string false "Webhook signature (generic)"
// @Success 200 {object} map[string]string
// @Failure 400 {object} dto.ErrorResponse
// @Failure 401 {object} dto.ErrorResponse
// @Failure 500 {object} dto.ErrorResponse
// @Router /webhooks/signing/{provider} [post]
func (c *WebhookController) HandleSigningWebhook(ctx *gin.Context) {
	provider := ctx.Param("provider")

	// Get the appropriate webhook handler
	handler, ok := c.webhookHandlers[provider]
	if !ok {
		slog.Warn("webhook received for unknown provider",
			slog.String("provider", provider),
		)
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error": "unknown provider",
		})
		return
	}

	// Read body
	body, err := io.ReadAll(ctx.Request.Body)
	if err != nil {
		slog.Error("failed to read webhook body",
			slog.String("provider", provider),
			slog.String("error", err.Error()),
		)
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error": "failed to read request body",
		})
		return
	}

	// Get signature header (different providers use different header names)
	signature := ctx.GetHeader("X-Documenso-Secret")
	if signature == "" {
		signature = ctx.GetHeader("X-Webhook-Signature")
	}
	if signature == "" {
		signature = ctx.GetHeader("X-Signature")
	}

	slog.Info("processing signing webhook",
		slog.String("provider", provider),
		slog.Int("body_length", len(body)),
		slog.Bool("has_signature", signature != ""),
	)

	// Parse and validate webhook
	event, err := handler.ParseWebhook(ctx.Request.Context(), body, signature)
	if err != nil {
		if err == entity.ErrInvalidWebhookSignature {
			slog.Warn("invalid webhook signature",
				slog.String("provider", provider),
			)
			ctx.JSON(http.StatusUnauthorized, gin.H{
				"error": "invalid signature",
			})
			return
		}

		slog.Error("failed to parse webhook",
			slog.String("provider", provider),
			slog.String("error", err.Error()),
		)
		ctx.JSON(http.StatusBadRequest, gin.H{
			"error": "failed to parse webhook",
		})
		return
	}

	// Process the event
	if err := c.documentUC.HandleWebhookEvent(ctx.Request.Context(), event); err != nil {
		slog.Error("failed to process webhook event",
			slog.String("provider", provider),
			slog.String("event_type", event.EventType),
			slog.String("document_id", event.ProviderDocumentID),
			slog.String("error", err.Error()),
		)
		// Return 200 anyway to prevent retries for business logic errors
		// Only return error status for signature/parsing failures
		ctx.JSON(http.StatusOK, gin.H{
			"status":  "error",
			"message": "event processing failed",
		})
		return
	}

	slog.Info("webhook processed successfully",
		slog.String("provider", provider),
		slog.String("event_type", event.EventType),
		slog.String("document_id", event.ProviderDocumentID),
	)

	ctx.JSON(http.StatusOK, gin.H{
		"status": "ok",
	})
}
