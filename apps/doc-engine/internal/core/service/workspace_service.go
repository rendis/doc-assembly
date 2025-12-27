package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// NewWorkspaceService creates a new workspace service.
func NewWorkspaceService(
	workspaceRepo port.WorkspaceRepository,
	tenantRepo port.TenantRepository,
	memberRepo port.WorkspaceMemberRepository,
) usecase.WorkspaceUseCase {
	return &WorkspaceService{
		workspaceRepo: workspaceRepo,
		tenantRepo:    tenantRepo,
		memberRepo:    memberRepo,
	}
}

// WorkspaceService implements workspace business logic.
type WorkspaceService struct {
	workspaceRepo port.WorkspaceRepository
	tenantRepo    port.TenantRepository
	memberRepo    port.WorkspaceMemberRepository
}

// CreateWorkspace creates a new workspace.
func (s *WorkspaceService) CreateWorkspace(ctx context.Context, cmd usecase.CreateWorkspaceCommand) (*entity.Workspace, error) {
	// For SYSTEM type, check if one already exists for the tenant
	if cmd.Type == entity.WorkspaceTypeSystem {
		exists, err := s.workspaceRepo.ExistsSystemForTenant(ctx, cmd.TenantID)
		if err != nil {
			return nil, fmt.Errorf("checking system workspace existence: %w", err)
		}
		if exists {
			return nil, entity.ErrSystemWorkspaceExists
		}
	}

	workspace := &entity.Workspace{
		ID:        uuid.NewString(),
		TenantID:  cmd.TenantID,
		Name:      cmd.Name,
		Type:      cmd.Type,
		Status:    entity.WorkspaceStatusActive,
		Settings:  cmd.Settings,
		CreatedAt: time.Now().UTC(),
	}

	if err := workspace.Validate(); err != nil {
		return nil, fmt.Errorf("validating workspace: %w", err)
	}

	id, err := s.workspaceRepo.Create(ctx, workspace)
	if err != nil {
		return nil, fmt.Errorf("creating workspace: %w", err)
	}
	workspace.ID = id

	// Add creator as owner using NewActiveMember
	member := entity.NewActiveMember(workspace.ID, cmd.CreatedBy, entity.WorkspaceRoleOwner)
	member.ID = uuid.NewString()
	if _, err := s.memberRepo.Create(ctx, member); err != nil {
		slog.Warn("failed to add creator as workspace owner",
			slog.String("workspace_id", workspace.ID),
			slog.String("user_id", cmd.CreatedBy),
			slog.Any("error", err),
		)
	}

	slog.Info("workspace created",
		slog.String("workspace_id", workspace.ID),
		slog.String("name", workspace.Name),
		slog.String("type", string(workspace.Type)),
	)

	return workspace, nil
}

// GetWorkspace retrieves a workspace by ID.
func (s *WorkspaceService) GetWorkspace(ctx context.Context, id string) (*entity.Workspace, error) {
	workspace, err := s.workspaceRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding workspace %s: %w", id, err)
	}
	return workspace, nil
}

// ListUserWorkspaces lists all workspaces a user has access to.
func (s *WorkspaceService) ListUserWorkspaces(ctx context.Context, userID string) ([]*entity.WorkspaceWithRole, error) {
	workspaces, err := s.workspaceRepo.FindByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user workspaces: %w", err)
	}
	return workspaces, nil
}

// ListUserWorkspacesInTenant lists all workspaces a user has access to within a specific tenant.
func (s *WorkspaceService) ListUserWorkspacesInTenant(ctx context.Context, userID, tenantID string) ([]*entity.WorkspaceWithRole, error) {
	workspaces, err := s.workspaceRepo.FindByUserAndTenant(ctx, userID, tenantID)
	if err != nil {
		return nil, fmt.Errorf("listing user workspaces in tenant: %w", err)
	}
	return workspaces, nil
}

// ListTenantWorkspaces lists all workspaces for a tenant.
func (s *WorkspaceService) ListTenantWorkspaces(ctx context.Context, tenantID string) ([]*entity.Workspace, error) {
	workspaces, err := s.workspaceRepo.FindByTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("listing tenant workspaces: %w", err)
	}
	return workspaces, nil
}

// UpdateWorkspace updates a workspace's details.
func (s *WorkspaceService) UpdateWorkspace(ctx context.Context, cmd usecase.UpdateWorkspaceCommand) (*entity.Workspace, error) {
	workspace, err := s.workspaceRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("finding workspace: %w", err)
	}

	workspace.Name = cmd.Name
	workspace.Settings = cmd.Settings
	now := time.Now().UTC()
	workspace.UpdatedAt = &now

	if err := workspace.Validate(); err != nil {
		return nil, fmt.Errorf("validating workspace: %w", err)
	}

	if err := s.workspaceRepo.Update(ctx, workspace); err != nil {
		return nil, fmt.Errorf("updating workspace: %w", err)
	}

	slog.Info("workspace updated",
		slog.String("workspace_id", workspace.ID),
		slog.String("name", workspace.Name),
	)

	return workspace, nil
}

// ArchiveWorkspace archives a workspace (soft delete).
func (s *WorkspaceService) ArchiveWorkspace(ctx context.Context, id string) error {
	workspace, err := s.workspaceRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding workspace: %w", err)
	}

	if workspace.Type == entity.WorkspaceTypeSystem {
		return entity.ErrCannotArchiveSystem
	}

	if err := s.workspaceRepo.UpdateStatus(ctx, id, entity.WorkspaceStatusArchived); err != nil {
		return fmt.Errorf("archiving workspace: %w", err)
	}

	slog.Info("workspace archived", slog.String("workspace_id", id))
	return nil
}

// ActivateWorkspace activates a workspace.
func (s *WorkspaceService) ActivateWorkspace(ctx context.Context, id string) error {
	if err := s.workspaceRepo.UpdateStatus(ctx, id, entity.WorkspaceStatusActive); err != nil {
		return fmt.Errorf("activating workspace: %w", err)
	}

	slog.Info("workspace activated", slog.String("workspace_id", id))
	return nil
}

// GetSystemWorkspace retrieves the system workspace for a tenant.
func (s *WorkspaceService) GetSystemWorkspace(ctx context.Context, tenantID *string) (*entity.Workspace, error) {
	workspace, err := s.workspaceRepo.FindSystemByTenant(ctx, tenantID)
	if err != nil {
		return nil, fmt.Errorf("finding system workspace: %w", err)
	}
	return workspace, nil
}
