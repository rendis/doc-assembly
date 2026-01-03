package usecase

import (
	"context"
	"encoding/json"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// CreateTemplateCommand represents the command to create a template.
type CreateTemplateCommand struct {
	WorkspaceID      string
	FolderID         *string
	Title            string
	ContentStructure json.RawMessage
	IsPublicLibrary  bool
	CreatedBy        string
}

// UpdateTemplateCommand represents the command to update a template.
// All fields except ID are optional to support partial updates.
type UpdateTemplateCommand struct {
	ID              string
	Title           *string
	FolderID        *string
	IsPublicLibrary *bool
}

// CloneTemplateCommand represents the command to clone a template.
type CloneTemplateCommand struct {
	SourceTemplateID string
	VersionID        string
	NewTitle         string
	TargetFolderID   *string
	ClonedBy         string
}

// TemplateUseCase defines the input port for template operations.
type TemplateUseCase interface {
	// CreateTemplate creates a new template with an initial draft version.
	CreateTemplate(ctx context.Context, cmd CreateTemplateCommand) (*entity.Template, *entity.TemplateVersion, error)

	// GetTemplate retrieves a template by ID.
	GetTemplate(ctx context.Context, id string) (*entity.Template, error)

	// GetTemplateWithDetails retrieves a template with published version, tags, and folder.
	GetTemplateWithDetails(ctx context.Context, id string) (*entity.TemplateWithDetails, error)

	// GetTemplateWithAllVersions retrieves a template with all its versions.
	GetTemplateWithAllVersions(ctx context.Context, id string) (*entity.TemplateWithAllVersions, error)

	// ListTemplates lists all templates in a workspace with optional filters.
	ListTemplates(ctx context.Context, workspaceID string, filters port.TemplateFilters) ([]*entity.TemplateListItem, error)

	// ListTemplatesByFolder lists all templates in a folder.
	ListTemplatesByFolder(ctx context.Context, folderID string) ([]*entity.TemplateListItem, error)

	// ListPublicLibrary lists all public library templates.
	ListPublicLibrary(ctx context.Context, workspaceID string) ([]*entity.TemplateListItem, error)

	// UpdateTemplate updates a template's metadata.
	UpdateTemplate(ctx context.Context, cmd UpdateTemplateCommand) (*entity.Template, error)

	// CloneTemplate creates a copy of an existing template from its published version.
	CloneTemplate(ctx context.Context, cmd CloneTemplateCommand) (*entity.Template, *entity.TemplateVersion, error)

	// DeleteTemplate deletes a template and all its versions.
	DeleteTemplate(ctx context.Context, id string) error

	// AddTag adds a tag to a template.
	AddTag(ctx context.Context, templateID, tagID string) error

	// RemoveTag removes a tag from a template.
	RemoveTag(ctx context.Context, templateID, tagID string) error
}
