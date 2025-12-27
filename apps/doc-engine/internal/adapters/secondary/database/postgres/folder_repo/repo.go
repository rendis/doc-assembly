package folderrepo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// New creates a new folder repository.
func New(pool *pgxpool.Pool) port.FolderRepository {
	return &Repository{pool: pool}
}

// Repository implements the folder repository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new folder.
func (r *Repository) Create(ctx context.Context, folder *entity.Folder) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, queryCreate,
		folder.ID,
		folder.WorkspaceID,
		folder.ParentID,
		folder.Name,
		folder.CreatedAt,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("inserting folder: %w", err)
	}

	return id, nil
}

// FindByID finds a folder by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*entity.Folder, error) {
	var folder entity.Folder
	err := r.pool.QueryRow(ctx, queryFindByID, id).Scan(
		&folder.ID,
		&folder.WorkspaceID,
		&folder.ParentID,
		&folder.Name,
		&folder.CreatedAt,
		&folder.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, entity.ErrFolderNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("querying folder: %w", err)
	}

	return &folder, nil
}

// FindByWorkspace lists all folders in a workspace.
func (r *Repository) FindByWorkspace(ctx context.Context, workspaceID string) ([]*entity.Folder, error) {
	rows, err := r.pool.Query(ctx, queryFindByWorkspace, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("querying folders: %w", err)
	}
	defer rows.Close()

	return scanFolders(rows)
}

// FindByParent lists all child folders of a parent folder.
func (r *Repository) FindByParent(ctx context.Context, workspaceID string, parentID *string) ([]*entity.Folder, error) {
	var rows pgx.Rows
	var err error

	if parentID == nil {
		rows, err = r.pool.Query(ctx, queryFindByParentNull, workspaceID)
	} else {
		rows, err = r.pool.Query(ctx, queryFindByParent, workspaceID, *parentID)
	}

	if err != nil {
		return nil, fmt.Errorf("querying child folders: %w", err)
	}
	defer rows.Close()

	return scanFolders(rows)
}

// FindRootFolders lists all root folders in a workspace.
func (r *Repository) FindRootFolders(ctx context.Context, workspaceID string) ([]*entity.Folder, error) {
	return r.FindByParent(ctx, workspaceID, nil)
}

// Update updates a folder.
func (r *Repository) Update(ctx context.Context, folder *entity.Folder) error {
	_, err := r.pool.Exec(ctx, queryUpdate,
		folder.ID,
		folder.ParentID,
		folder.Name,
		folder.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("updating folder: %w", err)
	}

	return nil
}

// Delete deletes a folder.
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, queryDelete, id)
	if err != nil {
		return fmt.Errorf("deleting folder: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrFolderNotFound
	}

	return nil
}

// HasChildren checks if a folder has child folders.
func (r *Repository) HasChildren(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryHasChildren, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking folder children: %w", err)
	}

	return exists, nil
}

// HasTemplates checks if a folder contains templates.
func (r *Repository) HasTemplates(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, queryHasTemplates, id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("checking folder templates: %w", err)
	}

	return exists, nil
}

// ExistsByNameAndParent checks if a folder with the same name exists under the same parent.
func (r *Repository) ExistsByNameAndParent(ctx context.Context, workspaceID string, parentID *string, name string) (bool, error) {
	var exists bool
	var err error

	if parentID == nil {
		err = r.pool.QueryRow(ctx, queryExistsByNameAndParentNull, workspaceID, name).Scan(&exists)
	} else {
		err = r.pool.QueryRow(ctx, queryExistsByNameAndParent, workspaceID, *parentID, name).Scan(&exists)
	}

	if err != nil {
		return false, fmt.Errorf("checking folder existence: %w", err)
	}

	return exists, nil
}

// ExistsByNameAndParentExcluding checks excluding a specific folder ID.
func (r *Repository) ExistsByNameAndParentExcluding(ctx context.Context, workspaceID string, parentID *string, name, excludeID string) (bool, error) {
	var exists bool
	var err error

	if parentID == nil {
		err = r.pool.QueryRow(ctx, queryExistsByNameAndParentNullExcluding, workspaceID, name, excludeID).Scan(&exists)
	} else {
		err = r.pool.QueryRow(ctx, queryExistsByNameAndParentExcluding, workspaceID, *parentID, name, excludeID).Scan(&exists)
	}

	if err != nil {
		return false, fmt.Errorf("checking folder existence: %w", err)
	}

	return exists, nil
}

// scanFolders scans folder rows into a slice.
func scanFolders(rows pgx.Rows) ([]*entity.Folder, error) {
	var result []*entity.Folder
	for rows.Next() {
		var folder entity.Folder
		err := rows.Scan(
			&folder.ID,
			&folder.WorkspaceID,
			&folder.ParentID,
			&folder.Name,
			&folder.CreatedAt,
			&folder.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning folder: %w", err)
		}
		result = append(result, &folder)
	}
	return result, rows.Err()
}
