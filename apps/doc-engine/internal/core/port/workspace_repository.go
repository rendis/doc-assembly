package port

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// WorkspaceRepository defines the interface for workspace data access.
type WorkspaceRepository interface {
	// Create creates a new workspace.
	Create(ctx context.Context, workspace *entity.Workspace) (string, error)

	// FindByID finds a workspace by ID.
	FindByID(ctx context.Context, id string) (*entity.Workspace, error)

	// FindByTenant lists all workspaces for a tenant.
	FindByTenant(ctx context.Context, tenantID string) ([]*entity.Workspace, error)

	// FindByUser lists all workspaces a user has access to.
	FindByUser(ctx context.Context, userID string) ([]*entity.WorkspaceWithRole, error)

	// FindByUserAndTenant lists all workspaces a user has access to within a specific tenant.
	FindByUserAndTenant(ctx context.Context, userID, tenantID string) ([]*entity.WorkspaceWithRole, error)

	// FindSystemByTenant finds the system workspace for a tenant.
	FindSystemByTenant(ctx context.Context, tenantID *string) (*entity.Workspace, error)

	// Update updates a workspace.
	Update(ctx context.Context, workspace *entity.Workspace) error

	// UpdateStatus updates a workspace's status.
	UpdateStatus(ctx context.Context, id string, status entity.WorkspaceStatus) error

	// Delete deletes a workspace (soft delete by archiving).
	Delete(ctx context.Context, id string) error

	// ExistsSystemForTenant checks if a system workspace exists for a tenant.
	ExistsSystemForTenant(ctx context.Context, tenantID *string) (bool, error)
}
