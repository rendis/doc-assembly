package middleware

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

const (
	// WorkspaceIDHeader is the header name for the workspace ID.
	WorkspaceIDHeader = "X-Workspace-ID"
	// internalUserIDKey is the context key for the internal user ID (from DB).
	internalUserIDKey = "internal_user_id"
	// workspaceIDKey is the context key for the current workspace ID.
	workspaceIDKey = "workspace_id"
	// workspaceRoleKey is the context key for the user's role in the current workspace.
	workspaceRoleKey = "workspace_role"
)

// IdentityContext creates a middleware that syncs the user from IdP and loads workspace context.
// It requires JWTAuth middleware to be applied before this.
func IdentityContext(userRepo port.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip for OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Get user info from JWT (set by JWTAuth middleware)
		email, _ := GetUserEmail(c)

		// Get user from database by email
		user, err := userRepo.FindByEmail(c.Request.Context(), email)
		if err != nil {
			if errors.Is(err, entity.ErrUserNotFound) {
				abortWithError(c, http.StatusForbidden, entity.ErrUserNotFound)
				return
			}
		}

		// Store user ID in context
		c.Set(internalUserIDKey, user.ID)

		c.Next()
	}
}

// WorkspaceContext creates a middleware that requires and loads the user's role for a specific workspace.
// The workspace ID must come from the X-Workspace-ID header.
// This middleware should only be applied to routes that require workspace context.
// Users with system roles (SUPERADMIN) get automatic access as OWNER.
// Users with tenant roles (TENANT_OWNER) get automatic access as ADMIN for workspaces in their tenant.
func WorkspaceContext(
	workspaceRepo port.WorkspaceRepository,
	workspaceMemberRepo port.WorkspaceMemberRepository,
	tenantMemberRepo port.TenantMemberRepository,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip for OPTIONS requests
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Get workspace ID from header (required)
		workspaceID := c.GetHeader(WorkspaceIDHeader)
		if workspaceID == "" {
			abortWithError(c, http.StatusBadRequest, entity.ErrMissingWorkspaceID)
			return
		}

		// Get internal user ID
		internalUserID, ok := GetInternalUserID(c)
		if !ok {
			abortWithError(c, http.StatusUnauthorized, entity.ErrUnauthorized)
			return
		}

		// Check if user has system role (SUPERADMIN can access any workspace as OWNER)
		if sysRole, hasSysRole := GetSystemRole(c); hasSysRole {
			if sysRole.HasPermission(entity.SystemRoleSuperAdmin) {
				c.Set(workspaceIDKey, workspaceID)
				c.Set(workspaceRoleKey, entity.WorkspaceRoleOwner)
				slog.Debug("superadmin workspace access granted",
					slog.String("user_id", internalUserID),
					slog.String("workspace_id", workspaceID),
					slog.String("operation_id", GetOperationID(c)),
				)
				c.Next()
				return
			}
		}

		// Check if user has tenant role for this workspace's tenant
		ctx := c.Request.Context()
		workspace, err := workspaceRepo.FindByID(ctx, workspaceID)
		if err == nil && workspace.TenantID != nil && *workspace.TenantID != "" {
			tenantMember, err := tenantMemberRepo.FindActiveByUserAndTenant(ctx, internalUserID, *workspace.TenantID)
			if err == nil && tenantMember.Role.HasPermission(entity.TenantRoleOwner) {
				// TENANT_OWNER gets ADMIN access to workspaces in their tenant
				c.Set(workspaceIDKey, workspaceID)
				c.Set(workspaceRoleKey, entity.WorkspaceRoleAdmin)
				slog.Debug("tenant owner workspace access granted",
					slog.String("user_id", internalUserID),
					slog.String("workspace_id", workspaceID),
					slog.String("tenant_id", *workspace.TenantID),
					slog.String("operation_id", GetOperationID(c)),
				)
				c.Next()
				return
			}
		}

		// Load user's role in this workspace
		member, err := workspaceMemberRepo.FindActiveByUserAndWorkspace(ctx, internalUserID, workspaceID)
		if err != nil {
			slog.Warn("workspace access denied",
				slog.String("error", err.Error()),
				slog.String("user_id", internalUserID),
				slog.String("workspace_id", workspaceID),
				slog.String("operation_id", GetOperationID(c)),
			)
			abortWithError(c, http.StatusForbidden, entity.ErrWorkspaceAccessDenied)
			return
		}

		// Store workspace context
		c.Set(workspaceIDKey, workspaceID)
		c.Set(workspaceRoleKey, member.Role)

		c.Next()
	}
}

// GetInternalUserID retrieves the internal user ID from the Gin context.
func GetInternalUserID(c *gin.Context) (string, bool) {
	if val, exists := c.Get(internalUserIDKey); exists {
		if userID, ok := val.(string); ok && userID != "" {
			return userID, true
		}
	}
	return "", false
}

// GetWorkspaceID retrieves the current workspace ID from the Gin context.
func GetWorkspaceID(c *gin.Context) (string, bool) {
	if val, exists := c.Get(workspaceIDKey); exists {
		if wsID, ok := val.(string); ok && wsID != "" {
			return wsID, true
		}
	}
	return "", false
}

// GetWorkspaceRole retrieves the user's role in the current workspace.
func GetWorkspaceRole(c *gin.Context) (entity.WorkspaceRole, bool) {
	if val, exists := c.Get(workspaceRoleKey); exists {
		if role, ok := val.(entity.WorkspaceRole); ok {
			return role, true
		}
	}
	return "", false
}
