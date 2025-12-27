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

// NewTemplateVersionService creates a new template version service.
func NewTemplateVersionService(
	versionRepo port.TemplateVersionRepository,
	injectableRepo port.TemplateVersionInjectableRepository,
	signerRoleRepo port.TemplateVersionSignerRoleRepository,
	templateRepo port.TemplateRepository,
) usecase.TemplateVersionUseCase {
	return &TemplateVersionService{
		versionRepo:    versionRepo,
		injectableRepo: injectableRepo,
		signerRoleRepo: signerRoleRepo,
		templateRepo:   templateRepo,
	}
}

// TemplateVersionService implements template version business logic.
type TemplateVersionService struct {
	versionRepo    port.TemplateVersionRepository
	injectableRepo port.TemplateVersionInjectableRepository
	signerRoleRepo port.TemplateVersionSignerRoleRepository
	templateRepo   port.TemplateRepository
}

// CreateVersion creates a new version for a template.
func (s *TemplateVersionService) CreateVersion(ctx context.Context, cmd usecase.CreateVersionCommand) (*entity.TemplateVersion, error) {
	// Verify template exists
	_, err := s.templateRepo.FindByID(ctx, cmd.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("finding template: %w", err)
	}

	// Check for duplicate name
	exists, err := s.versionRepo.ExistsByName(ctx, cmd.TemplateID, cmd.Name)
	if err != nil {
		return nil, fmt.Errorf("checking version name: %w", err)
	}
	if exists {
		return nil, entity.ErrVersionNameExists
	}

	// Get next version number
	versionNumber, err := s.versionRepo.GetNextVersionNumber(ctx, cmd.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("getting next version number: %w", err)
	}

	version := entity.NewTemplateVersion(cmd.TemplateID, versionNumber, cmd.Name, cmd.CreatedBy)
	version.ID = uuid.NewString()
	version.Description = cmd.Description

	if err := version.Validate(); err != nil {
		return nil, fmt.Errorf("validating version: %w", err)
	}

	id, err := s.versionRepo.Create(ctx, version)
	if err != nil {
		return nil, fmt.Errorf("creating version: %w", err)
	}
	version.ID = id

	slog.Info("template version created",
		slog.String("version_id", version.ID),
		slog.String("template_id", cmd.TemplateID),
		slog.Int("version_number", versionNumber),
		slog.String("name", cmd.Name),
	)

	return version, nil
}

// CreateVersionFromExisting creates a new version copying content from an existing version.
func (s *TemplateVersionService) CreateVersionFromExisting(ctx context.Context, sourceVersionID string, name string, description *string, createdBy *string) (*entity.TemplateVersion, error) {
	source, err := s.versionRepo.FindByID(ctx, sourceVersionID)
	if err != nil {
		return nil, fmt.Errorf("finding source version: %w", err)
	}

	// Check for duplicate name
	exists, err := s.versionRepo.ExistsByName(ctx, source.TemplateID, name)
	if err != nil {
		return nil, fmt.Errorf("checking version name: %w", err)
	}
	if exists {
		return nil, entity.ErrVersionNameExists
	}

	// Get next version number
	versionNumber, err := s.versionRepo.GetNextVersionNumber(ctx, source.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("getting next version number: %w", err)
	}

	version := entity.NewTemplateVersion(source.TemplateID, versionNumber, name, createdBy)
	version.ID = uuid.NewString()
	version.Description = description
	version.ContentStructure = source.ContentStructure

	id, err := s.versionRepo.Create(ctx, version)
	if err != nil {
		return nil, fmt.Errorf("creating version: %w", err)
	}
	version.ID = id

	// Copy injectables
	if err := s.injectableRepo.CopyFromVersion(ctx, sourceVersionID, version.ID); err != nil {
		slog.Warn("failed to copy injectables", slog.Any("error", err))
	}

	// Copy signer roles
	if err := s.signerRoleRepo.CopyFromVersion(ctx, sourceVersionID, version.ID); err != nil {
		slog.Warn("failed to copy signer roles", slog.Any("error", err))
	}

	slog.Info("template version created from existing",
		slog.String("version_id", version.ID),
		slog.String("source_version_id", sourceVersionID),
		slog.Int("version_number", versionNumber),
	)

	return version, nil
}

// GetVersion retrieves a template version by ID.
func (s *TemplateVersionService) GetVersion(ctx context.Context, id string) (*entity.TemplateVersion, error) {
	version, err := s.versionRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding version %s: %w", id, err)
	}
	return version, nil
}

// GetVersionWithDetails retrieves a version with all related data.
func (s *TemplateVersionService) GetVersionWithDetails(ctx context.Context, id string) (*entity.TemplateVersionWithDetails, error) {
	details, err := s.versionRepo.FindByIDWithDetails(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding version details %s: %w", id, err)
	}
	return details, nil
}

// ListVersions lists all versions for a template.
func (s *TemplateVersionService) ListVersions(ctx context.Context, templateID string) ([]*entity.TemplateVersion, error) {
	versions, err := s.versionRepo.FindByTemplateID(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("listing versions: %w", err)
	}
	return versions, nil
}

// GetPublishedVersion gets the currently published version for a template.
func (s *TemplateVersionService) GetPublishedVersion(ctx context.Context, templateID string) (*entity.TemplateVersionWithDetails, error) {
	details, err := s.versionRepo.FindPublishedByTemplateIDWithDetails(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("finding published version: %w", err)
	}
	return details, nil
}

// UpdateVersion updates a template version.
func (s *TemplateVersionService) UpdateVersion(ctx context.Context, cmd usecase.UpdateVersionCommand) (*entity.TemplateVersion, error) {
	version, err := s.versionRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("finding version: %w", err)
	}

	if err := version.CanEdit(); err != nil {
		return nil, err
	}

	// Check for duplicate name if changed
	if cmd.Name != nil && *cmd.Name != version.Name {
		exists, err := s.versionRepo.ExistsByNameExcluding(ctx, version.TemplateID, *cmd.Name, version.ID)
		if err != nil {
			return nil, fmt.Errorf("checking version name: %w", err)
		}
		if exists {
			return nil, entity.ErrVersionNameExists
		}
		version.Name = *cmd.Name
	}

	if cmd.Description != nil {
		version.Description = cmd.Description
	}
	if cmd.ContentStructure != nil {
		version.ContentStructure = cmd.ContentStructure
	}

	now := time.Now().UTC()
	version.UpdatedAt = &now

	if err := version.Validate(); err != nil {
		return nil, fmt.Errorf("validating version: %w", err)
	}

	if err := s.versionRepo.Update(ctx, version); err != nil {
		return nil, fmt.Errorf("updating version: %w", err)
	}

	slog.Info("template version updated", slog.String("version_id", version.ID))
	return version, nil
}

// PublishVersion publishes a version (archives current published if exists).
func (s *TemplateVersionService) PublishVersion(ctx context.Context, id string, userID string) error {
	version, err := s.versionRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}

	if err := version.CanPublish(); err != nil {
		return err
	}

	// Archive current published version if exists
	currentPublished, err := s.versionRepo.FindPublishedByTemplateID(ctx, version.TemplateID)
	if err == nil && currentPublished != nil {
		currentPublished.Archive(userID)
		if err := s.versionRepo.Update(ctx, currentPublished); err != nil {
			return fmt.Errorf("archiving current version: %w", err)
		}
		slog.Info("previous version archived",
			slog.String("archived_version_id", currentPublished.ID),
			slog.String("new_version_id", id),
		)
	}

	// Publish the new version
	version.Publish(userID)
	if err := s.versionRepo.Update(ctx, version); err != nil {
		return fmt.Errorf("publishing version: %w", err)
	}

	slog.Info("template version published",
		slog.String("version_id", id),
		slog.String("template_id", version.TemplateID),
	)
	return nil
}

// SchedulePublish schedules a version for future publication.
func (s *TemplateVersionService) SchedulePublish(ctx context.Context, cmd usecase.SchedulePublishCommand) error {
	version, err := s.versionRepo.FindByID(ctx, cmd.VersionID)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}

	if err := version.SchedulePublish(cmd.PublishAt); err != nil {
		return err
	}

	if err := s.versionRepo.Update(ctx, version); err != nil {
		return fmt.Errorf("scheduling publish: %w", err)
	}

	slog.Info("version scheduled for publication",
		slog.String("version_id", cmd.VersionID),
		slog.Time("publish_at", cmd.PublishAt),
	)
	return nil
}

// ScheduleArchive schedules the current published version for future archival.
func (s *TemplateVersionService) ScheduleArchive(ctx context.Context, cmd usecase.ScheduleArchiveCommand) error {
	version, err := s.versionRepo.FindByID(ctx, cmd.VersionID)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}

	// Check if there's a scheduled replacement
	hasScheduled, err := s.versionRepo.HasScheduledVersion(ctx, version.TemplateID)
	if err != nil {
		return fmt.Errorf("checking for scheduled version: %w", err)
	}
	if !hasScheduled {
		return entity.ErrCannotArchiveWithoutReplacement
	}

	if err := version.ScheduleArchive(cmd.ArchiveAt); err != nil {
		return err
	}

	if err := s.versionRepo.Update(ctx, version); err != nil {
		return fmt.Errorf("scheduling archive: %w", err)
	}

	slog.Info("version scheduled for archival",
		slog.String("version_id", cmd.VersionID),
		slog.Time("archive_at", cmd.ArchiveAt),
	)
	return nil
}

// CancelSchedule cancels any scheduled publication or archival.
func (s *TemplateVersionService) CancelSchedule(ctx context.Context, versionID string) error {
	version, err := s.versionRepo.FindByID(ctx, versionID)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}

	if err := version.CancelSchedule(); err != nil {
		return err
	}

	if err := s.versionRepo.Update(ctx, version); err != nil {
		return fmt.Errorf("canceling schedule: %w", err)
	}

	slog.Info("version schedule canceled", slog.String("version_id", versionID))
	return nil
}

// ArchiveVersion manually archives a published version.
func (s *TemplateVersionService) ArchiveVersion(ctx context.Context, id string, userID string) error {
	version, err := s.versionRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}

	if err := version.CanArchive(); err != nil {
		return err
	}

	version.Archive(userID)
	if err := s.versionRepo.Update(ctx, version); err != nil {
		return fmt.Errorf("archiving version: %w", err)
	}

	slog.Info("template version archived", slog.String("version_id", id))
	return nil
}

// DeleteVersion deletes a draft version.
func (s *TemplateVersionService) DeleteVersion(ctx context.Context, id string) error {
	version, err := s.versionRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}

	if !version.IsDraft() && !version.IsScheduled() {
		return entity.ErrCannotEditPublished
	}

	// Delete related data first
	if err := s.injectableRepo.DeleteByVersionID(ctx, id); err != nil {
		slog.Warn("failed to delete version injectables", slog.Any("error", err))
	}
	if err := s.signerRoleRepo.DeleteByVersionID(ctx, id); err != nil {
		slog.Warn("failed to delete version signer roles", slog.Any("error", err))
	}

	if err := s.versionRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting version: %w", err)
	}

	slog.Info("template version deleted", slog.String("version_id", id))
	return nil
}

// AddInjectable adds an injectable to a version.
func (s *TemplateVersionService) AddInjectable(ctx context.Context, cmd usecase.AddVersionInjectableCommand) (*entity.TemplateVersionInjectable, error) {
	// Verify version exists and can be edited
	version, err := s.versionRepo.FindByID(ctx, cmd.VersionID)
	if err != nil {
		return nil, fmt.Errorf("finding version: %w", err)
	}
	if err := version.CanEdit(); err != nil {
		return nil, err
	}

	// Check if already linked
	exists, err := s.injectableRepo.Exists(ctx, cmd.VersionID, cmd.InjectableDefinitionID)
	if err != nil {
		return nil, fmt.Errorf("checking injectable link: %w", err)
	}
	if exists {
		return nil, entity.ErrInjectableAlreadyExists
	}

	injectable := entity.NewTemplateVersionInjectable(
		cmd.VersionID,
		cmd.InjectableDefinitionID,
		cmd.IsRequired,
		cmd.DefaultValue,
	)
	injectable.ID = uuid.NewString()

	if err := injectable.Validate(); err != nil {
		return nil, fmt.Errorf("validating injectable: %w", err)
	}

	id, err := s.injectableRepo.Create(ctx, injectable)
	if err != nil {
		return nil, fmt.Errorf("adding injectable: %w", err)
	}
	injectable.ID = id

	slog.Info("injectable added to version",
		slog.String("version_id", cmd.VersionID),
		slog.String("injectable_id", cmd.InjectableDefinitionID),
	)

	return injectable, nil
}

// RemoveInjectable removes an injectable from a version.
func (s *TemplateVersionService) RemoveInjectable(ctx context.Context, id string) error {
	injectable, err := s.injectableRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding injectable: %w", err)
	}

	// Verify version can be edited
	version, err := s.versionRepo.FindByID(ctx, injectable.TemplateVersionID)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}
	if err := version.CanEdit(); err != nil {
		return err
	}

	if err := s.injectableRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("removing injectable: %w", err)
	}

	slog.Info("injectable removed from version", slog.String("injectable_id", id))
	return nil
}

// AddSignerRole adds a signer role to a version.
func (s *TemplateVersionService) AddSignerRole(ctx context.Context, cmd usecase.AddVersionSignerRoleCommand) (*entity.TemplateVersionSignerRole, error) {
	// Verify version exists and can be edited
	version, err := s.versionRepo.FindByID(ctx, cmd.VersionID)
	if err != nil {
		return nil, fmt.Errorf("finding version: %w", err)
	}
	if err := version.CanEdit(); err != nil {
		return nil, err
	}

	// Check for duplicate anchor
	anchorExists, err := s.signerRoleRepo.ExistsByAnchor(ctx, cmd.VersionID, cmd.AnchorString)
	if err != nil {
		return nil, fmt.Errorf("checking anchor existence: %w", err)
	}
	if anchorExists {
		return nil, entity.ErrDuplicateSignerAnchor
	}

	// Check for duplicate order
	orderExists, err := s.signerRoleRepo.ExistsByOrder(ctx, cmd.VersionID, cmd.SignerOrder)
	if err != nil {
		return nil, fmt.Errorf("checking order existence: %w", err)
	}
	if orderExists {
		return nil, entity.ErrDuplicateSignerOrder
	}

	role := entity.NewTemplateVersionSignerRole(cmd.VersionID, cmd.RoleName, cmd.AnchorString, cmd.SignerOrder)
	role.ID = uuid.NewString()

	if err := role.Validate(); err != nil {
		return nil, fmt.Errorf("validating signer role: %w", err)
	}

	id, err := s.signerRoleRepo.Create(ctx, role)
	if err != nil {
		return nil, fmt.Errorf("adding signer role: %w", err)
	}
	role.ID = id

	slog.Info("signer role added to version",
		slog.String("version_id", cmd.VersionID),
		slog.String("role_name", cmd.RoleName),
	)

	return role, nil
}

// UpdateSignerRole updates a signer role.
func (s *TemplateVersionService) UpdateSignerRole(ctx context.Context, cmd usecase.UpdateVersionSignerRoleCommand) (*entity.TemplateVersionSignerRole, error) {
	role, err := s.signerRoleRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("finding signer role: %w", err)
	}

	// Verify version can be edited
	version, err := s.versionRepo.FindByID(ctx, role.TemplateVersionID)
	if err != nil {
		return nil, fmt.Errorf("finding version: %w", err)
	}
	if err := version.CanEdit(); err != nil {
		return nil, err
	}

	// Check for duplicate order if changed
	if role.SignerOrder != cmd.SignerOrder {
		orderExists, err := s.signerRoleRepo.ExistsByOrderExcluding(ctx, role.TemplateVersionID, cmd.SignerOrder, role.ID)
		if err != nil {
			return nil, fmt.Errorf("checking order existence: %w", err)
		}
		if orderExists {
			return nil, entity.ErrDuplicateSignerOrder
		}
	}

	role.RoleName = cmd.RoleName
	role.SignerOrder = cmd.SignerOrder
	now := time.Now().UTC()
	role.UpdatedAt = &now

	if err := role.Validate(); err != nil {
		return nil, fmt.Errorf("validating signer role: %w", err)
	}

	if err := s.signerRoleRepo.Update(ctx, role); err != nil {
		return nil, fmt.Errorf("updating signer role: %w", err)
	}

	slog.Info("signer role updated", slog.String("role_id", cmd.ID))
	return role, nil
}

// RemoveSignerRole removes a signer role from a version.
func (s *TemplateVersionService) RemoveSignerRole(ctx context.Context, id string) error {
	role, err := s.signerRoleRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding signer role: %w", err)
	}

	// Verify version can be edited
	version, err := s.versionRepo.FindByID(ctx, role.TemplateVersionID)
	if err != nil {
		return fmt.Errorf("finding version: %w", err)
	}
	if err := version.CanEdit(); err != nil {
		return err
	}

	if err := s.signerRoleRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("removing signer role: %w", err)
	}

	slog.Info("signer role removed", slog.String("role_id", id))
	return nil
}

// ProcessScheduledPublications publishes all versions whose scheduled time has passed.
func (s *TemplateVersionService) ProcessScheduledPublications(ctx context.Context) error {
	versions, err := s.versionRepo.FindScheduledToPublish(ctx, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("finding scheduled versions: %w", err)
	}

	for _, version := range versions {
		if err := s.PublishVersion(ctx, version.ID, "system"); err != nil {
			slog.Error("failed to process scheduled publication",
				slog.String("version_id", version.ID),
				slog.Any("error", err),
			)
			continue
		}
		slog.Info("scheduled publication processed", slog.String("version_id", version.ID))
	}

	return nil
}

// ProcessScheduledArchivals archives all published versions whose scheduled archive time has passed.
func (s *TemplateVersionService) ProcessScheduledArchivals(ctx context.Context) error {
	versions, err := s.versionRepo.FindScheduledToArchive(ctx, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("finding scheduled archivals: %w", err)
	}

	for _, version := range versions {
		if err := s.ArchiveVersion(ctx, version.ID, "system"); err != nil {
			slog.Error("failed to process scheduled archival",
				slog.String("version_id", version.ID),
				slog.Any("error", err),
			)
			continue
		}
		slog.Info("scheduled archival processed", slog.String("version_id", version.ID))
	}

	return nil
}
