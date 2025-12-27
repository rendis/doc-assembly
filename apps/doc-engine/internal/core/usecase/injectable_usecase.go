package usecase

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// CreateInjectableCommand represents the command to create an injectable definition.
type CreateInjectableCommand struct {
	WorkspaceID *string
	Key         string
	Label       string
	Description string
	DataType    entity.InjectableDataType
	CreatedBy   string
}

// UpdateInjectableCommand represents the command to update an injectable definition.
type UpdateInjectableCommand struct {
	ID          string
	Label       string
	Description string
}

// InjectableUseCase defines the input port for injectable definition operations.
type InjectableUseCase interface {
	// CreateInjectable creates a new injectable definition.
	CreateInjectable(ctx context.Context, cmd CreateInjectableCommand) (*entity.InjectableDefinition, error)

	// GetInjectable retrieves an injectable definition by ID.
	GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error)

	// ListInjectables lists all injectable definitions for a workspace (including global).
	ListInjectables(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error)

	// ListGlobalInjectables lists all global injectable definitions.
	ListGlobalInjectables(ctx context.Context) ([]*entity.InjectableDefinition, error)

	// UpdateInjectable updates an injectable definition.
	UpdateInjectable(ctx context.Context, cmd UpdateInjectableCommand) (*entity.InjectableDefinition, error)

	// DeleteInjectable deletes an injectable definition.
	// Returns error if injectable is in use by templates.
	DeleteInjectable(ctx context.Context, id string) error

	// FindByKey finds an injectable by key.
	FindByKey(ctx context.Context, workspaceID *string, key string) (*entity.InjectableDefinition, error)
}
