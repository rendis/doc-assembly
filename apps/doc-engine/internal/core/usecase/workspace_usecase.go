package usecase

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// CreateWorkspaceCommand represents the command to create a workspace.
type CreateWorkspaceCommand struct {
	TenantID  *string
	Name      string
	Type      entity.WorkspaceType
	Settings  entity.WorkspaceSettings
	CreatedBy string
}

// UpdateWorkspaceCommand represents the command to update a workspace.
type UpdateWorkspaceCommand struct {
	ID       string
	Name     string
	Settings entity.WorkspaceSettings
}

// WorkspaceUseCase defines the input port for workspace operations.
type WorkspaceUseCase interface {
	// CreateWorkspace creates a new workspace.
	CreateWorkspace(ctx context.Context, cmd CreateWorkspaceCommand) (*entity.Workspace, error)

	// GetWorkspace retrieves a workspace by ID.
	GetWorkspace(ctx context.Context, id string) (*entity.Workspace, error)

	// ListUserWorkspaces lists all workspaces a user has access to.
	ListUserWorkspaces(ctx context.Context, userID string) ([]*entity.WorkspaceWithRole, error)

	// ListUserWorkspacesInTenant lists all workspaces a user has access to within a specific tenant.
	ListUserWorkspacesInTenant(ctx context.Context, userID, tenantID string) ([]*entity.WorkspaceWithRole, error)

	// ListTenantWorkspaces lists all workspaces for a tenant.
	ListTenantWorkspaces(ctx context.Context, tenantID string) ([]*entity.Workspace, error)

	// UpdateWorkspace updates a workspace's details.
	UpdateWorkspace(ctx context.Context, cmd UpdateWorkspaceCommand) (*entity.Workspace, error)

	// ArchiveWorkspace archives a workspace (soft delete).
	ArchiveWorkspace(ctx context.Context, id string) error

	// ActivateWorkspace activates a workspace.
	ActivateWorkspace(ctx context.Context, id string) error

	// GetSystemWorkspace retrieves the system workspace for a tenant.
	GetSystemWorkspace(ctx context.Context, tenantID *string) (*entity.Workspace, error)
}

// CreateTenantCommand represents the command to create a tenant.
type CreateTenantCommand struct {
	Code        string
	Name        string
	Description string
}

// UpdateTenantCommand represents the command to update a tenant.
type UpdateTenantCommand struct {
	ID          string
	Name        string
	Description string
	Settings    map[string]any
}

// TenantUseCase defines the input port for tenant operations.
type TenantUseCase interface {
	// CreateTenant creates a new tenant with its system workspace.
	CreateTenant(ctx context.Context, cmd CreateTenantCommand) (*entity.Tenant, error)

	// GetTenant retrieves a tenant by ID.
	GetTenant(ctx context.Context, id string) (*entity.Tenant, error)

	// GetTenantByCode retrieves a tenant by its code.
	GetTenantByCode(ctx context.Context, code string) (*entity.Tenant, error)

	// ListTenants lists all tenants.
	ListTenants(ctx context.Context) ([]*entity.Tenant, error)

	// ListUserTenants lists all tenants a user belongs to with their roles.
	ListUserTenants(ctx context.Context, userID string) ([]*entity.TenantWithRole, error)

	// UpdateTenant updates a tenant's details.
	UpdateTenant(ctx context.Context, cmd UpdateTenantCommand) (*entity.Tenant, error)

	// DeleteTenant deletes a tenant and all its data.
	DeleteTenant(ctx context.Context, id string) error
}
