package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

const (
	// maxRecentAccesses is the maximum number of recent accesses to keep per entity type.
	maxRecentAccesses = 10
)

// NewUserAccessHistoryService creates a new user access history service.
func NewUserAccessHistoryService(
	accessHistoryRepo port.UserAccessHistoryRepository,
	tenantMemberRepo port.TenantMemberRepository,
	workspaceMemberRepo port.WorkspaceMemberRepository,
) usecase.UserAccessHistoryUseCase {
	return &UserAccessHistoryService{
		accessHistoryRepo:   accessHistoryRepo,
		tenantMemberRepo:    tenantMemberRepo,
		workspaceMemberRepo: workspaceMemberRepo,
	}
}

// UserAccessHistoryService implements user access history business logic.
type UserAccessHistoryService struct {
	accessHistoryRepo   port.UserAccessHistoryRepository
	tenantMemberRepo    port.TenantMemberRepository
	workspaceMemberRepo port.WorkspaceMemberRepository
}

// RecordTenantAccess records that a user accessed a tenant.
func (s *UserAccessHistoryService) RecordTenantAccess(ctx context.Context, userID, tenantID string) error {
	// Verify user has access to the tenant
	_, err := s.tenantMemberRepo.FindActiveByUserAndTenant(ctx, userID, tenantID)
	if err != nil {
		return fmt.Errorf("verifying tenant access: %w", err)
	}

	// Record the access
	_, err = s.accessHistoryRepo.RecordAccess(ctx, userID, entity.AccessEntityTypeTenant, tenantID)
	if err != nil {
		return fmt.Errorf("recording tenant access: %w", err)
	}

	// Cleanup old entries (keep only last 10)
	if err := s.accessHistoryRepo.DeleteOldAccesses(ctx, userID, entity.AccessEntityTypeTenant, maxRecentAccesses); err != nil {
		// Log but don't fail - cleanup is not critical
		slog.Warn("failed to cleanup old tenant accesses",
			slog.String("user_id", userID),
			slog.String("error", err.Error()))
	}

	slog.Debug("recorded tenant access",
		slog.String("user_id", userID),
		slog.String("tenant_id", tenantID))

	return nil
}

// RecordWorkspaceAccess records that a user accessed a workspace.
func (s *UserAccessHistoryService) RecordWorkspaceAccess(ctx context.Context, userID, workspaceID string) error {
	// Verify user has access to the workspace
	_, err := s.workspaceMemberRepo.FindActiveByUserAndWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return fmt.Errorf("verifying workspace access: %w", err)
	}

	// Record the access
	_, err = s.accessHistoryRepo.RecordAccess(ctx, userID, entity.AccessEntityTypeWorkspace, workspaceID)
	if err != nil {
		return fmt.Errorf("recording workspace access: %w", err)
	}

	// Cleanup old entries
	if err := s.accessHistoryRepo.DeleteOldAccesses(ctx, userID, entity.AccessEntityTypeWorkspace, maxRecentAccesses); err != nil {
		slog.Warn("failed to cleanup old workspace accesses",
			slog.String("user_id", userID),
			slog.String("error", err.Error()))
	}

	slog.Debug("recorded workspace access",
		slog.String("user_id", userID),
		slog.String("workspace_id", workspaceID))

	return nil
}

// GetRecentTenantIDs returns the IDs of recently accessed tenants.
func (s *UserAccessHistoryService) GetRecentTenantIDs(ctx context.Context, userID string) ([]string, error) {
	ids, err := s.accessHistoryRepo.GetRecentAccessIDs(ctx, userID, entity.AccessEntityTypeTenant, maxRecentAccesses)
	if err != nil {
		return nil, fmt.Errorf("getting recent tenant IDs: %w", err)
	}
	return ids, nil
}

// GetRecentWorkspaceIDs returns the IDs of recently accessed workspaces.
func (s *UserAccessHistoryService) GetRecentWorkspaceIDs(ctx context.Context, userID string) ([]string, error) {
	ids, err := s.accessHistoryRepo.GetRecentAccessIDs(ctx, userID, entity.AccessEntityTypeWorkspace, maxRecentAccesses)
	if err != nil {
		return nil, fmt.Errorf("getting recent workspace IDs: %w", err)
	}
	return ids, nil
}
