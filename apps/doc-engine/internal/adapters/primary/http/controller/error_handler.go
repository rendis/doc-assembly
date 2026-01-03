package controller

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// respondError sends an error response.
func respondError(ctx *gin.Context, statusCode int, err error) {
	ctx.JSON(statusCode, dto.NewErrorResponse(err))
}

// HandleError maps domain errors to HTTP status codes.
// This is a centralized error handler that consolidates all error handling logic
// from the various controller-specific error handlers.
func HandleError(ctx *gin.Context, err error) {
	// Check for ContentValidationError first (special handling)
	var validationErr *entity.ContentValidationError
	if errors.As(err, &validationErr) {
		ctx.JSON(http.StatusUnprocessableEntity, dto.NewContentValidationErrorResponse(validationErr))
		return
	}

	var statusCode int

	switch {
	// 404 Not Found - Entity not found errors
	case errors.Is(err, entity.ErrInjectableNotFound),
		errors.Is(err, entity.ErrTemplateNotFound),
		errors.Is(err, entity.ErrTagNotFound),
		errors.Is(err, entity.ErrVersionNotFound),
		errors.Is(err, entity.ErrSignerRoleNotFound),
		errors.Is(err, entity.ErrVersionInjectableNotFound),
		errors.Is(err, entity.ErrWorkspaceNotFound),
		errors.Is(err, entity.ErrFolderNotFound),
		errors.Is(err, entity.ErrUserNotFound),
		errors.Is(err, entity.ErrMemberNotFound),
		errors.Is(err, entity.ErrTenantNotFound),
		errors.Is(err, entity.ErrTenantMemberNotFound),
		errors.Is(err, entity.ErrSystemRoleNotFound):
		statusCode = http.StatusNotFound

	// 409 Conflict - Entity already exists or duplicate errors
	case errors.Is(err, entity.ErrInjectableAlreadyExists),
		errors.Is(err, entity.ErrTemplateAlreadyExists),
		errors.Is(err, entity.ErrVersionAlreadyExists),
		errors.Is(err, entity.ErrVersionNameExists),
		errors.Is(err, entity.ErrDuplicateSignerAnchor),
		errors.Is(err, entity.ErrDuplicateSignerOrder),
		errors.Is(err, entity.ErrWorkspaceAlreadyExists),
		errors.Is(err, entity.ErrFolderAlreadyExists),
		errors.Is(err, entity.ErrTagAlreadyExists),
		errors.Is(err, entity.ErrSystemWorkspaceExists),
		errors.Is(err, entity.ErrMemberAlreadyExists),
		errors.Is(err, entity.ErrTenantAlreadyExists),
		errors.Is(err, entity.ErrGlobalWorkspaceExists),
		errors.Is(err, entity.ErrTenantMemberExists):
		statusCode = http.StatusConflict

	// 400 Bad Request - Validation and business rule errors
	case errors.Is(err, entity.ErrInjectableInUse),
		errors.Is(err, entity.ErrNoPublishedVersion),
		errors.Is(err, entity.ErrInvalidInjectableKey),
		errors.Is(err, entity.ErrRequiredField),
		errors.Is(err, entity.ErrFieldTooLong),
		errors.Is(err, entity.ErrInvalidDataType),
		errors.Is(err, entity.ErrCannotEditPublished),
		errors.Is(err, entity.ErrCannotEditArchived),
		errors.Is(err, entity.ErrVersionNotPublished),
		errors.Is(err, entity.ErrVersionAlreadyPublished),
		errors.Is(err, entity.ErrCannotArchiveWithoutReplacement),
		errors.Is(err, entity.ErrInvalidVersionStatus),
		errors.Is(err, entity.ErrInvalidVersionNumber),
		errors.Is(err, entity.ErrScheduledTimeInPast),
		errors.Is(err, entity.ErrInvalidSignerRole),
		errors.Is(err, entity.ErrFolderHasChildren),
		errors.Is(err, entity.ErrFolderHasTemplates),
		errors.Is(err, entity.ErrTagInUse),
		errors.Is(err, entity.ErrCircularReference),
		errors.Is(err, entity.ErrCannotArchiveSystem),
		errors.Is(err, entity.ErrInvalidParentFolder),
		errors.Is(err, entity.ErrCannotRemoveOwner),
		errors.Is(err, entity.ErrInvalidRole),
		errors.Is(err, entity.ErrInvalidTenantCode),
		errors.Is(err, entity.ErrInvalidWorkspaceType),
		errors.Is(err, entity.ErrInvalidSystemRole),
		errors.Is(err, entity.ErrMissingTenantID),
		errors.Is(err, entity.ErrCannotRemoveTenantOwner),
		errors.Is(err, entity.ErrInvalidTenantRole),
		errors.Is(err, entity.ErrVersionDoesNotBelongToTemplate):
		statusCode = http.StatusBadRequest

	// 403 Forbidden - Access denied errors
	case errors.Is(err, entity.ErrWorkspaceAccessDenied),
		errors.Is(err, entity.ErrForbidden),
		errors.Is(err, entity.ErrInsufficientRole),
		errors.Is(err, entity.ErrTenantAccessDenied):
		statusCode = http.StatusForbidden

	// 401 Unauthorized - Authentication errors
	case errors.Is(err, entity.ErrUnauthorized):
		statusCode = http.StatusUnauthorized

	// 503 Service Unavailable - External service errors
	case errors.Is(err, entity.ErrLLMServiceUnavailable):
		statusCode = http.StatusServiceUnavailable

	// 500 Internal Server Error - Unhandled errors
	default:
		statusCode = http.StatusInternalServerError
		slog.Error("unhandled error", slog.Any("error", err))
	}

	respondError(ctx, statusCode, err)
}
