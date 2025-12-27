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

// NewInjectableService creates a new injectable service.
func NewInjectableService(injectableRepo port.InjectableRepository) usecase.InjectableUseCase {
	return &InjectableService{
		injectableRepo: injectableRepo,
	}
}

// InjectableService implements injectable definition business logic.
type InjectableService struct {
	injectableRepo port.InjectableRepository
}

// CreateInjectable creates a new injectable definition.
func (s *InjectableService) CreateInjectable(ctx context.Context, cmd usecase.CreateInjectableCommand) (*entity.InjectableDefinition, error) {
	// Check for duplicate key
	exists, err := s.injectableRepo.ExistsByKey(ctx, cmd.WorkspaceID, cmd.Key)
	if err != nil {
		return nil, fmt.Errorf("checking injectable existence: %w", err)
	}
	if exists {
		return nil, entity.ErrInjectableAlreadyExists
	}

	injectable := &entity.InjectableDefinition{
		ID:          uuid.NewString(),
		WorkspaceID: cmd.WorkspaceID,
		Key:         cmd.Key,
		Label:       cmd.Label,
		Description: cmd.Description,
		DataType:    cmd.DataType,
		CreatedAt:   time.Now().UTC(),
	}

	if err := injectable.Validate(); err != nil {
		return nil, fmt.Errorf("validating injectable: %w", err)
	}

	id, err := s.injectableRepo.Create(ctx, injectable)
	if err != nil {
		return nil, fmt.Errorf("creating injectable: %w", err)
	}
	injectable.ID = id

	slog.Info("injectable created",
		slog.String("injectable_id", injectable.ID),
		slog.String("key", injectable.Key),
		slog.Any("workspace_id", injectable.WorkspaceID),
	)

	return injectable, nil
}

// GetInjectable retrieves an injectable definition by ID.
func (s *InjectableService) GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding injectable %s: %w", id, err)
	}
	return injectable, nil
}

// ListInjectables lists all injectable definitions for a workspace (including global).
func (s *InjectableService) ListInjectables(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error) {
	injectables, err := s.injectableRepo.FindByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing injectables: %w", err)
	}
	return injectables, nil
}

// ListGlobalInjectables lists all global injectable definitions.
func (s *InjectableService) ListGlobalInjectables(ctx context.Context) ([]*entity.InjectableDefinition, error) {
	injectables, err := s.injectableRepo.FindGlobal(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing global injectables: %w", err)
	}
	return injectables, nil
}

// UpdateInjectable updates an injectable definition.
func (s *InjectableService) UpdateInjectable(ctx context.Context, cmd usecase.UpdateInjectableCommand) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("finding injectable: %w", err)
	}

	// Key cannot be changed, only label and description
	injectable.Label = cmd.Label
	injectable.Description = cmd.Description
	now := time.Now().UTC()
	injectable.UpdatedAt = &now

	if err := injectable.Validate(); err != nil {
		return nil, fmt.Errorf("validating injectable: %w", err)
	}

	if err := s.injectableRepo.Update(ctx, injectable); err != nil {
		return nil, fmt.Errorf("updating injectable: %w", err)
	}

	slog.Info("injectable updated",
		slog.String("injectable_id", injectable.ID),
		slog.String("key", injectable.Key),
	)

	return injectable, nil
}

// DeleteInjectable deletes an injectable definition.
func (s *InjectableService) DeleteInjectable(ctx context.Context, id string) error {
	// Check if injectable is in use
	inUse, err := s.injectableRepo.IsInUse(ctx, id)
	if err != nil {
		return fmt.Errorf("checking injectable usage: %w", err)
	}
	if inUse {
		return entity.ErrInjectableInUse
	}

	if err := s.injectableRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting injectable: %w", err)
	}

	slog.Info("injectable deleted", slog.String("injectable_id", id))
	return nil
}

// FindByKey finds an injectable by key.
func (s *InjectableService) FindByKey(ctx context.Context, workspaceID *string, key string) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByKey(ctx, workspaceID, key)
	if err != nil {
		return nil, fmt.Errorf("finding injectable by key: %w", err)
	}
	return injectable, nil
}
