package service

import (
	"context"
	"fmt"

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
// Note: Injectables are read-only - they are managed via database migrations/seeds.
type InjectableService struct {
	injectableRepo port.InjectableRepository
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

// FindByKey finds an injectable by key.
func (s *InjectableService) FindByKey(ctx context.Context, workspaceID *string, key string) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByKey(ctx, workspaceID, key)
	if err != nil {
		return nil, fmt.Errorf("finding injectable by key: %w", err)
	}
	return injectable, nil
}
