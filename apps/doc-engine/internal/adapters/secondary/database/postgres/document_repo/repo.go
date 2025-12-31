package documentrepo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// New creates a new document repository.
func New(pool *pgxpool.Pool) port.DocumentRepository {
	return &Repository{pool: pool}
}

// Repository implements port.DocumentRepository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new document.
func (r *Repository) Create(ctx context.Context, document *entity.Document) (string, error) {
	var id string
	err := r.pool.QueryRow(ctx, queryCreate,
		document.WorkspaceID,
		document.TemplateVersionID,
		document.Title,
		document.ClientExternalReferenceID,
		document.SignerDocumentID,
		document.SignerProvider,
		document.Status,
		document.InjectedValuesSnapshot,
		document.PDFStoragePath,
		document.CompletedPDFURL,
		document.CreatedAt,
	).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("creating document: %w", err)
	}

	return id, nil
}

// FindByID finds a document by ID.
func (r *Repository) FindByID(ctx context.Context, id string) (*entity.Document, error) {
	doc := &entity.Document{}
	err := r.pool.QueryRow(ctx, queryFindByID, id).Scan(
		&doc.ID,
		&doc.WorkspaceID,
		&doc.TemplateVersionID,
		&doc.Title,
		&doc.ClientExternalReferenceID,
		&doc.SignerDocumentID,
		&doc.SignerProvider,
		&doc.Status,
		&doc.InjectedValuesSnapshot,
		&doc.PDFStoragePath,
		&doc.CompletedPDFURL,
		&doc.CreatedAt,
		&doc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrDocumentNotFound
		}
		return nil, fmt.Errorf("finding document %s: %w", id, err)
	}

	return doc, nil
}

// FindByIDWithRecipients finds a document by ID with all recipients.
func (r *Repository) FindByIDWithRecipients(ctx context.Context, id string) (*entity.DocumentWithRecipients, error) {
	doc, err := r.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	result := &entity.DocumentWithRecipients{
		Document: *doc,
	}

	// Get recipients
	rows, err := r.pool.Query(ctx, `
		SELECT id, document_id, template_version_role_id, name, email,
			   signer_recipient_id, status, signed_at, created_at, updated_at
		FROM execution.document_recipients
		WHERE document_id = $1
		ORDER BY created_at ASC
	`, id)
	if err != nil {
		return nil, fmt.Errorf("querying document recipients: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		recipient := &entity.DocumentRecipient{}
		if err := rows.Scan(
			&recipient.ID,
			&recipient.DocumentID,
			&recipient.TemplateVersionRoleID,
			&recipient.Name,
			&recipient.Email,
			&recipient.SignerRecipientID,
			&recipient.Status,
			&recipient.SignedAt,
			&recipient.CreatedAt,
			&recipient.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning document recipient: %w", err)
		}
		result.Recipients = append(result.Recipients, recipient)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating document recipients: %w", err)
	}

	return result, nil
}

// FindByWorkspace lists all documents in a workspace with optional filters.
func (r *Repository) FindByWorkspace(ctx context.Context, workspaceID string, filters port.DocumentFilters) ([]*entity.DocumentListItem, error) {
	query := queryFindByWorkspaceBase
	args := []any{workspaceID}
	argPos := 2

	if filters.Status != nil {
		query += fmt.Sprintf(" AND status = $%d", argPos)
		args = append(args, *filters.Status)
		argPos++
	}

	if filters.SignerProvider != nil {
		query += fmt.Sprintf(" AND signer_provider = $%d", argPos)
		args = append(args, *filters.SignerProvider)
		argPos++
	}

	if filters.ClientExternalReferenceID != nil {
		query += fmt.Sprintf(" AND client_external_reference_id = $%d", argPos)
		args = append(args, *filters.ClientExternalReferenceID)
		argPos++
	}

	if filters.TemplateVersionID != nil {
		query += fmt.Sprintf(" AND template_version_id = $%d", argPos)
		args = append(args, *filters.TemplateVersionID)
		argPos++
	}

	if filters.Search != "" {
		query += fmt.Sprintf(" AND title ILIKE $%d", argPos)
		args = append(args, "%"+filters.Search+"%")
		argPos++
	}

	query += " ORDER BY created_at DESC"

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
		return nil, fmt.Errorf("querying documents: %w", err)
	}
	defer rows.Close()

	var documents []*entity.DocumentListItem
	for rows.Next() {
		item := &entity.DocumentListItem{}
		if err := rows.Scan(
			&item.ID,
			&item.WorkspaceID,
			&item.TemplateVersionID,
			&item.Title,
			&item.ClientExternalReferenceID,
			&item.SignerProvider,
			&item.Status,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning document: %w", err)
		}
		documents = append(documents, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating documents: %w", err)
	}

	return documents, nil
}

// FindBySignerDocumentID finds a document by the external signing provider's document ID.
func (r *Repository) FindBySignerDocumentID(ctx context.Context, signerDocumentID string) (*entity.Document, error) {
	doc := &entity.Document{}
	err := r.pool.QueryRow(ctx, queryFindBySignerDocumentID, signerDocumentID).Scan(
		&doc.ID,
		&doc.WorkspaceID,
		&doc.TemplateVersionID,
		&doc.Title,
		&doc.ClientExternalReferenceID,
		&doc.SignerDocumentID,
		&doc.SignerProvider,
		&doc.Status,
		&doc.InjectedValuesSnapshot,
		&doc.PDFStoragePath,
		&doc.CompletedPDFURL,
		&doc.CreatedAt,
		&doc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrDocumentNotFound
		}
		return nil, fmt.Errorf("finding document by signer document ID %s: %w", signerDocumentID, err)
	}

	return doc, nil
}

// FindByClientExternalRef finds documents by the client's external reference ID.
func (r *Repository) FindByClientExternalRef(ctx context.Context, workspaceID, clientExternalRef string) ([]*entity.Document, error) {
	rows, err := r.pool.Query(ctx, queryFindByClientExternalRef, workspaceID, clientExternalRef)
	if err != nil {
		return nil, fmt.Errorf("querying documents by client external ref: %w", err)
	}
	defer rows.Close()

	var documents []*entity.Document
	for rows.Next() {
		doc := &entity.Document{}
		if err := rows.Scan(
			&doc.ID,
			&doc.WorkspaceID,
			&doc.TemplateVersionID,
			&doc.Title,
			&doc.ClientExternalReferenceID,
			&doc.SignerDocumentID,
			&doc.SignerProvider,
			&doc.Status,
			&doc.InjectedValuesSnapshot,
			&doc.PDFStoragePath,
			&doc.CompletedPDFURL,
			&doc.CreatedAt,
			&doc.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning document: %w", err)
		}
		documents = append(documents, doc)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating documents: %w", err)
	}

	return documents, nil
}

// FindByTemplateVersion finds all documents generated from a specific template version.
func (r *Repository) FindByTemplateVersion(ctx context.Context, templateVersionID string) ([]*entity.DocumentListItem, error) {
	rows, err := r.pool.Query(ctx, queryFindByTemplateVersion, templateVersionID)
	if err != nil {
		return nil, fmt.Errorf("querying documents by template version: %w", err)
	}
	defer rows.Close()

	var documents []*entity.DocumentListItem
	for rows.Next() {
		item := &entity.DocumentListItem{}
		if err := rows.Scan(
			&item.ID,
			&item.WorkspaceID,
			&item.TemplateVersionID,
			&item.Title,
			&item.ClientExternalReferenceID,
			&item.SignerProvider,
			&item.Status,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning document: %w", err)
		}
		documents = append(documents, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating documents: %w", err)
	}

	return documents, nil
}

// FindPendingForPolling finds documents that need status polling (PENDING or IN_PROGRESS).
func (r *Repository) FindPendingForPolling(ctx context.Context, limit int) ([]*entity.Document, error) {
	rows, err := r.pool.Query(ctx, queryFindPendingForPolling, limit)
	if err != nil {
		return nil, fmt.Errorf("querying pending documents for polling: %w", err)
	}
	defer rows.Close()

	var documents []*entity.Document
	for rows.Next() {
		doc := &entity.Document{}
		if err := rows.Scan(
			&doc.ID,
			&doc.WorkspaceID,
			&doc.TemplateVersionID,
			&doc.Title,
			&doc.ClientExternalReferenceID,
			&doc.SignerDocumentID,
			&doc.SignerProvider,
			&doc.Status,
			&doc.InjectedValuesSnapshot,
			&doc.PDFStoragePath,
			&doc.CompletedPDFURL,
			&doc.CreatedAt,
			&doc.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scanning document: %w", err)
		}
		documents = append(documents, doc)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating documents: %w", err)
	}

	return documents, nil
}

// Update updates a document.
func (r *Repository) Update(ctx context.Context, document *entity.Document) error {
	result, err := r.pool.Exec(ctx, queryUpdate,
		document.ID,
		document.Title,
		document.ClientExternalReferenceID,
		document.SignerDocumentID,
		document.SignerProvider,
		document.Status,
		document.InjectedValuesSnapshot,
		document.PDFStoragePath,
		document.CompletedPDFURL,
		document.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrDocumentNotFound
	}

	return nil
}

// UpdateStatus updates only the status of a document.
func (r *Repository) UpdateStatus(ctx context.Context, id string, status entity.DocumentStatus) error {
	result, err := r.pool.Exec(ctx, queryUpdateStatus, id, status)
	if err != nil {
		return fmt.Errorf("updating document status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrDocumentNotFound
	}

	return nil
}

// Delete deletes a document and all its recipients (cascade).
func (r *Repository) Delete(ctx context.Context, id string) error {
	result, err := r.pool.Exec(ctx, queryDelete, id)
	if err != nil {
		return fmt.Errorf("deleting document: %w", err)
	}

	if result.RowsAffected() == 0 {
		return entity.ErrDocumentNotFound
	}

	return nil
}

// CountByWorkspace returns the total number of documents in a workspace.
func (r *Repository) CountByWorkspace(ctx context.Context, workspaceID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, queryCountByWorkspace, workspaceID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting documents in workspace: %w", err)
	}

	return count, nil
}

// CountByStatus returns the count of documents by status in a workspace.
func (r *Repository) CountByStatus(ctx context.Context, workspaceID string, status entity.DocumentStatus) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, queryCountByStatus, workspaceID, status).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("counting documents by status: %w", err)
	}

	return count, nil
}
