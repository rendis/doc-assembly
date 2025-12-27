package port

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// InjectableRepository defines the interface for injectable definition data access.
type InjectableRepository interface {
	// Create creates a new injectable definition.
	Create(ctx context.Context, injectable *entity.InjectableDefinition) (string, error)

	// FindByID finds an injectable definition by ID.
	FindByID(ctx context.Context, id string) (*entity.InjectableDefinition, error)

	// FindByWorkspace lists all injectable definitions for a workspace (including global).
	FindByWorkspace(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error)

	// FindGlobal lists all global injectable definitions.
	FindGlobal(ctx context.Context) ([]*entity.InjectableDefinition, error)

	// FindByKey finds an injectable by key within a workspace or globally.
	FindByKey(ctx context.Context, workspaceID *string, key string) (*entity.InjectableDefinition, error)

	// Update updates an injectable definition.
	Update(ctx context.Context, injectable *entity.InjectableDefinition) error

	// Delete deletes an injectable definition.
	Delete(ctx context.Context, id string) error

	// ExistsByKey checks if an injectable with the given key exists.
	ExistsByKey(ctx context.Context, workspaceID *string, key string) (bool, error)

	// ExistsByKeyExcluding checks excluding a specific injectable ID.
	ExistsByKeyExcluding(ctx context.Context, workspaceID *string, key, excludeID string) (bool, error)

	// IsInUse checks if an injectable is used by any template versions.
	IsInUse(ctx context.Context, id string) (bool, error)

	// GetVersionCount returns the number of template versions using this injectable.
	GetVersionCount(ctx context.Context, id string) (int, error)
}
