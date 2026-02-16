package middleware

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

const (
	// SandboxModeHeader is the header name for enabling sandbox mode.
	SandboxModeHeader = "X-Sandbox-Mode"
	// sandboxModeKey is the context key for sandbox mode flag.
	sandboxModeKey = "sandbox_mode"
	// parentWorkspaceIDKey is the context key for the parent workspace ID when in sandbox mode.
	parentWorkspaceIDKey = "parent_workspace_id"
)

// SandboxContext creates a middleware that resolves sandbox workspace when X-Sandbox-Mode header is set.
// This middleware must be applied after WorkspaceContext.
// When the header is set to "true", it looks up the sandbox workspace associated with the parent
// workspace ID and replaces the workspace ID in context with the sandbox ID.
func SandboxContext(workspaceRepo port.WorkspaceRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip for OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Check if X-Sandbox-Mode header is present and set to "true"
		sandboxHeader := c.GetHeader(SandboxModeHeader)
		if sandboxHeader != "true" {
			c.Next()
			return
		}

		// Get workspace ID from context (set by WorkspaceContext)
		parentWorkspaceID, ok := GetWorkspaceID(c)
		if !ok {
			// WorkspaceContext should have set this; if not, continue without sandbox resolution
			c.Next()
			return
		}

		// Look up the sandbox workspace for this parent
		sandbox, err := workspaceRepo.FindSandboxByParentID(c.Request.Context(), parentWorkspaceID)
		if err != nil {
			if errors.Is(err, entity.ErrSandboxNotFound) {
				slog.WarnContext(c.Request.Context(), "sandbox mode requested but workspace does not support sandbox",
					slog.String("parent_workspace_id", parentWorkspaceID),
					slog.String("operation_id", GetOperationID(c)),
				)
				abortWithError(c, http.StatusBadRequest, entity.ErrSandboxNotSupported)
				return
			}
			slog.ErrorContext(c.Request.Context(), "failed to find sandbox workspace",
				slog.String("error", err.Error()),
				slog.String("parent_workspace_id", parentWorkspaceID),
				slog.String("operation_id", GetOperationID(c)),
			)
			abortWithError(c, http.StatusInternalServerError, err)
			return
		}

		// Store parent workspace ID and replace workspace ID with sandbox ID
		c.Set(parentWorkspaceIDKey, parentWorkspaceID)
		c.Set(workspaceIDKey, sandbox.ID)
		c.Set(sandboxModeKey, true)

		slog.DebugContext(c.Request.Context(), "sandbox mode enabled",
			slog.String("parent_workspace_id", parentWorkspaceID),
			slog.String("sandbox_workspace_id", sandbox.ID),
			slog.String("operation_id", GetOperationID(c)),
		)

		c.Next()
	}
}

// IsSandboxMode returns true if the request is operating in sandbox mode.
func IsSandboxMode(c *gin.Context) bool {
	if val, exists := c.Get(sandboxModeKey); exists {
		if mode, ok := val.(bool); ok {
			return mode
		}
	}
	return false
}

// GetParentWorkspaceID returns the parent workspace ID when in sandbox mode.
// Returns empty string and false if not in sandbox mode or if parent ID is not set.
func GetParentWorkspaceID(c *gin.Context) (string, bool) {
	if val, exists := c.Get(parentWorkspaceIDKey); exists {
		if id, ok := val.(string); ok && id != "" {
			return id, true
		}
	}
	return "", false
}
