package templaterepo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// New creates a new template repository.
func New(pool *pgxpool.Pool) port.TemplateRepository {
	return &Repository{pool: pool}
}

// Repository implements port.TemplateRepository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new template.
func (r *Repository) Create(ctx context.Context, template *entity.Template) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, queryCreate,
		template.WorkspaceID,
		template.FolderID,
		template.Title,
		template.IsPublicLibrary,
		template.CreatedAt,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("creating template: %w", err)
	}

	return id, nil
}

// FindByID finds a template by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*entity.Template, error) {
	template := &entity.Template{}
	err := r.pool.QueryRow(ctx, queryFindByID, id).Scan(
		&template.ID,
		&template.WorkspaceID,
		&template.FolderID,
		&template.Title,
		&template.IsPublicLibrary,
		&template.CreatedAt,
		&template.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrTemplateNotFound
		}
		return nil, fmt.Errorf("finding template %s: %w", id, err)
	}

	return template, nil
}

// FindByIDWithDetails finds a template by ID with published version, tags, and folder.
func (r *Repository) FindByIDWithDetails(ctx context.Context, id string) (*entity.TemplateWithDetails, error) {
	template, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	details := &entity.TemplateWithDetails{
		Template: *template,
	}

	// Get published version with details (if exists)
	version := &entity.TemplateVersion{}
	err = r.pool.QueryRow(ctx, queryPublishedVersion, id).Scan(
		&version.ID,
		&version.TemplateID,
		&version.VersionNumber,
		&version.Name,
		&version.Description,
		&version.ContentStructure,
		&version.Status,
		&version.ScheduledPublishAt,
		&version.ScheduledArchiveAt,
		&version.PublishedAt,
		&version.ArchivedAt,
		&version.PublishedBy,
		&version.ArchivedBy,
		&version.CreatedBy,
		&version.CreatedAt,
		&version.UpdatedAt,
	)
	if err == nil {
		versionDetails := &entity.TemplateVersionWithDetails{
			TemplateVersion: *version,
		}

		// Get version injectables
		injectableRows, err := r.pool.Query(ctx, queryVersionInjectables, version.ID)
		if err != nil {
			return nil, fmt.Errorf("querying version injectables: %w", err)
		}
		defer injectableRows.Close()

		for injectableRows.Next() {
			iwd := &entity.VersionInjectableWithDefinition{
				Definition: &entity.InjectableDefinition{},
			}
			if err := injectableRows.Scan(
				&iwd.TemplateVersionInjectable.ID,
				&iwd.TemplateVersionInjectable.TemplateVersionID,
				&iwd.TemplateVersionInjectable.InjectableDefinitionID,
				&iwd.TemplateVersionInjectable.IsRequired,
				&iwd.TemplateVersionInjectable.DefaultValue,
				&iwd.TemplateVersionInjectable.CreatedAt,
				&iwd.Definition.ID,
				&iwd.Definition.WorkspaceID,
				&iwd.Definition.Key,
				&iwd.Definition.Label,
				&iwd.Definition.Description,
				&iwd.Definition.DataType,
				&iwd.Definition.CreatedAt,
				&iwd.Definition.UpdatedAt,
			); err != nil {
				return nil, fmt.Errorf("scanning version injectable: %w", err)
			}
			versionDetails.Injectables = append(versionDetails.Injectables, iwd)
		}

		// Get version signer roles
		roleRows, err := r.pool.Query(ctx, queryVersionSignerRoles, version.ID)
		if err != nil {
			return nil, fmt.Errorf("querying version signer roles: %w", err)
		}
		defer roleRows.Close()

		for roleRows.Next() {
			role := &entity.TemplateVersionSignerRole{}
			if err := roleRows.Scan(
				&role.ID,
				&role.TemplateVersionID,
				&role.RoleName,
				&role.AnchorString,
				&role.SignerOrder,
				&role.CreatedAt,
				&role.UpdatedAt,
			); err != nil {
				return nil, fmt.Errorf("scanning version signer role: %w", err)
			}
			versionDetails.SignerRoles = append(versionDetails.SignerRoles, role)
		}

		details.PublishedVersion = versionDetails
	}

	// Get tags
	tagRows, err := r.pool.Query(ctx, queryTemplateTags, id)
	if err != nil {
		return nil, fmt.Errorf("querying template tags: %w", err)
	}
	defer tagRows.Close()

	for tagRows.Next() {
		tag := &entity.Tag{}
		if err := tagRows.Scan(
			&tag.ID,
			&tag.WorkspaceID,
			&tag.Name,
			&tag.Color,
			&tag.CreatedAt,
			&tag.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning template tag: %w", err)
		}
		details.Tags = append(details.Tags, tag)
	}

	// Get folder if exists
	if template.FolderID != nil {
		folder := &entity.Folder{}
		err := r.pool.QueryRow(ctx, queryFolder, *template.FolderID).Scan(
			&folder.ID,
			&folder.WorkspaceID,
			&folder.ParentID,
			&folder.Name,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		)
		if err == nil {
			details.Folder = folder
		}
	}

	return details, nil
}

// FindByIDWithAllVersions finds a template by ID with all versions.
func (r *Repository) FindByIDWithAllVersions(ctx context.Context, id string) (*entity.TemplateWithAllVersions, error) {
	template, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	result := &entity.TemplateWithAllVersions{
		Template: *template,
	}

	// Get all versions
	versionRows, err := r.pool.Query(ctx, queryAllVersions, id)
	if err != nil {
		return nil, fmt.Errorf("querying template versions: %w", err)
	}
	defer versionRows.Close()

	for versionRows.Next() {
		v := &entity.TemplateVersion{}
		if err := versionRows.Scan(
			&v.ID,
			&v.TemplateID,
			&v.VersionNumber,
			&v.Name,
			&v.Description,
			&v.ContentStructure,
			&v.Status,
			&v.ScheduledPublishAt,
			&v.ScheduledArchiveAt,
			&v.PublishedAt,
			&v.ArchivedAt,
			&v.PublishedBy,
			&v.ArchivedBy,
			&v.CreatedBy,
			&v.CreatedAt,
			&v.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning template version: %w", err)
		}

		versionDetails := &entity.TemplateVersionWithDetails{
			TemplateVersion: *v,
		}
		result.Versions = append(result.Versions, versionDetails)
	}

	// Get tags
	tagRows, err := r.pool.Query(ctx, queryTemplateTags, id)
	if err != nil {
		return nil, fmt.Errorf("querying template tags: %w", err)
	}
	defer tagRows.Close()

	for tagRows.Next() {
		tag := &entity.Tag{}
		if err := tagRows.Scan(
			&tag.ID,
			&tag.WorkspaceID,
			&tag.Name,
			&tag.Color,
			&tag.CreatedAt,
			&tag.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning template tag: %w", err)
		}
		result.Tags = append(result.Tags, tag)
	}

	// Get folder if exists
	if template.FolderID != nil {
		folder := &entity.Folder{}
		err := r.pool.QueryRow(ctx, queryFolder, *template.FolderID).Scan(
			&folder.ID,
			&folder.WorkspaceID,
			&folder.ParentID,
			&folder.Name,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		)
		if err == nil {
			result.Folder = folder
		}
	}

	return result, nil
}

// FindByWorkspace lists all templates in a workspace with filters.
func (r *Repository) FindByWorkspace(ctx context.Context, workspaceID string, filters port.TemplateFilters) ([]*entity.TemplateListItem, error) {
	query := queryFindByWorkspaceBase
	args := []any{workspaceID}
	argPos := 2

	// Apply filters
	if filters.RootOnly {
		// Filter for root folder only (templates with no folder)
		query += " AND t.folder_id IS NULL"
	} else if filters.FolderID != nil {
		// Direct search: find templates only in the specified folder
		query += fmt.Sprintf(` AND t.folder_id = $%d`, argPos)
		args = append(args, *filters.FolderID)
		argPos++
	}
	// If neither RootOnly nor FolderID is set, no filter is applied (returns all templates)

	if filters.HasPublishedVersion != nil {
		if *filters.HasPublishedVersion {
			query += " AND EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED')"
		} else {
			query += " AND NOT EXISTS(SELECT 1 FROM content.template_versions WHERE template_id = t.id AND status = 'PUBLISHED')"
		}
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND t.title ILIKE $%d", argPos)
		args = append(args, "%"+filters.Search+"%")
		argPos++
	}

	if len(filters.TagIDs) > 0 {
		query += fmt.Sprintf(` AND t.id IN (
			SELECT template_id FROM content.template_tags WHERE tag_id = ANY($%d)
			GROUP BY template_id HAVING COUNT(DISTINCT tag_id) = $%d
		)`, argPos, argPos+1)
		args = append(args, filters.TagIDs, len(filters.TagIDs))
		argPos += 2
	}

	query += " ORDER BY COALESCE(f.path, '') ASC, t.title ASC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT $%d", argPos)
		args = append(args, filters.Limit)
		argPos++
	}

	if filters.Offset > 0 {
		query += fmt.Sprintf(" OFFSET $%d", argPos)
		args = append(args, filters.Offset)
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying templates: %w", err)
	}
	defer rows.Close()

	var templates []*entity.TemplateListItem
	for rows.Next() {
		item := &entity.TemplateListItem{}
		if err := rows.Scan(
			&item.ID,
			&item.WorkspaceID,
			&item.FolderID,
			&item.Title,
			&item.IsPublicLibrary,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.HasPublishedVersion,
			&item.VersionCount,
			&item.ScheduledVersionCount,
			&item.PublishedVersionNumber,
		); err != nil {
			return nil, fmt.Errorf("scanning template: %w", err)
		}
		templates = append(templates, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating templates: %w", err)
	}

	// Load tags in batch for all templates
	if err := r.loadTagsForTemplates(ctx, templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// FindByFolder lists all templates in a folder.
func (r *Repository) FindByFolder(ctx context.Context, folderID string) ([]*entity.TemplateListItem, error) {
	rows, err := r.pool.Query(ctx, queryFindByFolder, folderID)
	if err != nil {
		return nil, fmt.Errorf("querying templates by folder: %w", err)
	}
	defer rows.Close()

	var templates []*entity.TemplateListItem
	for rows.Next() {
		item := &entity.TemplateListItem{}
		if err := rows.Scan(
			&item.ID,
			&item.WorkspaceID,
			&item.FolderID,
			&item.Title,
			&item.IsPublicLibrary,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.HasPublishedVersion,
			&item.VersionCount,
			&item.ScheduledVersionCount,
			&item.PublishedVersionNumber,
		); err != nil {
			return nil, fmt.Errorf("scanning template: %w", err)
		}
		templates = append(templates, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating templates: %w", err)
	}

	// Load tags in batch for all templates
	if err := r.loadTagsForTemplates(ctx, templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// FindPublicLibrary lists all public library templates (that have a published version).
func (r *Repository) FindPublicLibrary(ctx context.Context, workspaceID string) ([]*entity.TemplateListItem, error) {
	rows, err := r.pool.Query(ctx, queryFindPublicLibrary)
	if err != nil {
		return nil, fmt.Errorf("querying public library templates: %w", err)
	}
	defer rows.Close()

	var templates []*entity.TemplateListItem
	for rows.Next() {
		item := &entity.TemplateListItem{}
		if err := rows.Scan(
			&item.ID,
			&item.WorkspaceID,
			&item.FolderID,
			&item.Title,
			&item.IsPublicLibrary,
			&item.CreatedAt,
			&item.UpdatedAt,
			&item.HasPublishedVersion,
			&item.VersionCount,
			&item.ScheduledVersionCount,
			&item.PublishedVersionNumber,
		); err != nil {
			return nil, fmt.Errorf("scanning template: %w", err)
		}
		templates = append(templates, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating templates: %w", err)
	}

	// Load tags in batch for all templates
	if err := r.loadTagsForTemplates(ctx, templates); err != nil {
		return nil, err
	}

	return templates, nil
}

// loadTagsForTemplates loads tags for multiple templates in a single batch query.
func (r *Repository) loadTagsForTemplates(ctx context.Context, templates []*entity.TemplateListItem) error {
	if len(templates) == 0 {
		return nil
	}

	// Collect template IDs
	templateIDs := make([]string, len(templates))
	templateMap := make(map[string]*entity.TemplateListItem, len(templates))
	for i, t := range templates {
		templateIDs[i] = t.ID
		templateMap[t.ID] = t
		t.Tags = []*entity.Tag{} // Initialize empty slice
	}

	// Query all tags for these templates in one batch
	rows, err := r.pool.Query(ctx, queryTemplateTagsBatch, templateIDs)
	if err != nil {
		return fmt.Errorf("querying template tags batch: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var templateID string
		tag := &entity.Tag{}
		if err := rows.Scan(
			&templateID,
			&tag.ID,
			&tag.Name,
			&tag.Color,
		); err != nil {
			return fmt.Errorf("scanning template tag: %w", err)
		}

		if template, ok := templateMap[templateID]; ok {
			template.Tags = append(template.Tags, tag)
		}
	}

	if err := rows.Err(); err != nil {
		return fmt.Errorf("iterating template tags: %w", err)
	}

	return nil
}

// Update updates a template.
func (r *Repository) Update(ctx context.Context, template *entity.Template) error {
	result, err := r.pool.Exec(ctx, queryUpdate,
		template.ID,
		template.Title,
		template.FolderID,
		template.IsPublicLibrary,
		template.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("updating template: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrTemplateNotFound
	}

	return nil
}

// Delete deletes a template.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, queryDelete, id)
	if err != nil {
		return fmt.Errorf("deleting template: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrTemplateNotFound
	}

	return nil
}

// ExistsByTitle checks if a template with the given title exists in the workspace.
func (r *Repository) ExistsByTitle(ctx context.Context, workspaceID, title string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByTitle, workspaceID, title).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking template title existence: %w", err)
	}

	return exists, nil
}

// ExistsByTitleExcluding checks if a template with the given title exists, excluding a specific ID.
func (r *Repository) ExistsByTitleExcluding(ctx context.Context, workspaceID, title, excludeID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryExistsByTitleExcluding, workspaceID, title, excludeID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking template title existence: %w", err)
	}

	return exists, nil
}

// CountByFolder returns the number of templates in a folder.
func (r *Repository) CountByFolder(ctx context.Context, folderID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, queryCountByFolder, folderID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting templates in folder: %w", err)
	}

	return count, nil
}
