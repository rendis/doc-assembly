package usecase

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// InjectableUseCase defines the input port for injectable definition operations.
// Note: Injectables are read-only - they are managed via database migrations/seeds.
type InjectableUseCase interface {
	// GetInjectable retrieves an injectable definition by ID.
	GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error)

	// ListInjectables lists all injectable definitions for a workspace (including global).
	ListInjectables(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error)

	// ListGlobalInjectables lists all global injectable definitions.
	ListGlobalInjectables(ctx context.Context) ([]*entity.InjectableDefinition, error)

	// FindByKey finds an injectable by key.
	FindByKey(ctx context.Context, workspaceID *string, key string) (*entity.InjectableDefinition, error)
}
