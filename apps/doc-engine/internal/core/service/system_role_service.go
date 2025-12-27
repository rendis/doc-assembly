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

// NewSystemRoleService creates a new system role service.
func NewSystemRoleService(
	systemRoleRepo port.SystemRoleRepository,
	userRepo port.UserRepository,
) usecase.SystemRoleUseCase {
	return &SystemRoleService{
		systemRoleRepo: systemRoleRepo,
		userRepo:       userRepo,
	}
}

// SystemRoleService implements the SystemRoleUseCase interface.
type SystemRoleService struct {
	systemRoleRepo port.SystemRoleRepository
	userRepo       port.UserRepository
}

// ListUsersWithSystemRoles lists all users that have system roles.
func (s *SystemRoleService) ListUsersWithSystemRoles(ctx context.Context) ([]*entity.SystemRoleWithUser, error) {
	assignments, err := s.systemRoleRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing system roles: %w", err)
	}

	result := make([]*entity.SystemRoleWithUser, 0, len(assignments))
	for _, assignment := range assignments {
		user, err := s.userRepo.FindByID(ctx, assignment.UserID)
		if err != nil {
			slog.Warn("user not found for system role",
				slog.String("user_id", assignment.UserID),
				slog.Any("error", err),
			)
			continue
		}
		result = append(result, &entity.SystemRoleWithUser{
			SystemRoleAssignment: *assignment,
			User:                 user,
		})
	}

	return result, nil
}

// AssignRole assigns a system role to a user.
func (s *SystemRoleService) AssignRole(ctx context.Context, cmd usecase.AssignSystemRoleCommand) (*entity.SystemRoleAssignment, error) {
	// Check if user exists
	_, err := s.userRepo.FindByID(ctx, cmd.UserID)
	if err != nil {
		return nil, fmt.Errorf("finding user: %w", err)
	}

	// Check if user already has a system role
	existing, err := s.systemRoleRepo.FindByUserID(ctx, cmd.UserID)
	if err == nil && existing != nil {
		// Update existing role
		if err := s.systemRoleRepo.UpdateRole(ctx, cmd.UserID, cmd.Role); err != nil {
			return nil, fmt.Errorf("updating system role: %w", err)
		}
		existing.Role = cmd.Role
		slog.Info("system role updated",
			slog.String("user_id", cmd.UserID),
			slog.String("role", string(cmd.Role)),
		)
		return existing, nil
	}

	// Create new assignment
	assignment := &entity.SystemRoleAssignment{
		ID:        uuid.NewString(),
		UserID:    cmd.UserID,
		Role:      cmd.Role,
		GrantedBy: &cmd.GrantedBy,
		CreatedAt: time.Now().UTC(),
	}

	id, err := s.systemRoleRepo.Create(ctx, assignment)
	if err != nil {
		return nil, fmt.Errorf("creating system role: %w", err)
	}
	assignment.ID = id

	slog.Info("system role assigned",
		slog.String("user_id", cmd.UserID),
		slog.String("role", string(cmd.Role)),
		slog.String("granted_by", cmd.GrantedBy),
	)

	return assignment, nil
}

// RevokeRole revokes a user's system role.
func (s *SystemRoleService) RevokeRole(ctx context.Context, cmd usecase.RevokeSystemRoleCommand) error {
	if err := s.systemRoleRepo.Delete(ctx, cmd.UserID); err != nil {
		return fmt.Errorf("revoking system role: %w", err)
	}

	slog.Info("system role revoked",
		slog.String("user_id", cmd.UserID),
		slog.String("revoked_by", cmd.RevokedBy),
	)

	return nil
}

// GetUserSystemRole gets a user's system role.
func (s *SystemRoleService) GetUserSystemRole(ctx context.Context, userID string) (*entity.SystemRoleAssignment, error) {
	return s.systemRoleRepo.FindByUserID(ctx, userID)
}
