package db

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/signing-worker/internal/port"
)

// DocumentRepository handles document database operations.
type DocumentRepository struct {
	pool *pgxpool.Pool
}

// NewDocumentRepository creates a new document repository.
func NewDocumentRepository(pool *pgxpool.Pool) *DocumentRepository {
	return &DocumentRepository{pool: pool}
}

// FindByStatus retrieves documents with the given status.
func (r *DocumentRepository) FindByStatus(ctx context.Context, status string, limit int) ([]*port.Document, error) {
	query := `
		SELECT
			d.id, d.tenant_id, d.workspace_id, d.title, d.status,
			d.pdf_storage_path, d.signer_document_id, d.signer_provider,
			d.client_external_reference_id, d.created_at, d.updated_at
		FROM execution.documents d
		WHERE d.status = $1
		ORDER BY d.created_at ASC
		LIMIT $2
		FOR UPDATE SKIP LOCKED
	`

	rows, err := r.pool.Query(ctx, query, status, limit)
	if err != nil {
		return nil, fmt.Errorf("querying documents: %w", err)
	}
	defer rows.Close()

	var docs []*port.Document
	for rows.Next() {
		doc, err := r.scanDocument(rows)
		if err != nil {
			return nil, fmt.Errorf("scanning document: %w", err)
		}
		docs = append(docs, doc)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating rows: %w", err)
	}

	// Load recipients for each document
	for _, doc := range docs {
		recipients, err := r.findRecipientsByDocumentID(ctx, doc.ID)
		if err != nil {
			return nil, fmt.Errorf("loading recipients for doc %s: %w", doc.ID, err)
		}
		doc.Recipients = recipients
	}

	return docs, nil
}

// findRecipientsByDocumentID retrieves recipients for a document.
func (r *DocumentRepository) findRecipientsByDocumentID(ctx context.Context, docID uuid.UUID) ([]port.DocumentRecipient, error) {
	query := `
		SELECT
			id, document_id, template_version_role_id, email, name,
			signer_recipient_id, signing_url, status, signer_order,
			signed_at, created_at, updated_at
		FROM execution.document_recipients
		WHERE document_id = $1
		ORDER BY signer_order ASC
	`

	rows, err := r.pool.Query(ctx, query, docID)
	if err != nil {
		return nil, fmt.Errorf("querying recipients: %w", err)
	}
	defer rows.Close()

	var recipients []port.DocumentRecipient
	for rows.Next() {
		var rec port.DocumentRecipient
		var signerRecipientID, signingURL *string
		var signedAt *time.Time

		err := rows.Scan(
			&rec.ID, &rec.DocumentID, &rec.TemplateVersionRoleID, &rec.Email, &rec.Name,
			&signerRecipientID, &signingURL, &rec.Status, &rec.SignerOrder,
			&signedAt, &rec.CreatedAt, &rec.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning recipient: %w", err)
		}

		if signerRecipientID != nil {
			rec.SignerRecipientID = *signerRecipientID
		}
		if signingURL != nil {
			rec.SigningURL = *signingURL
		}
		if signedAt != nil {
			rec.SignedAt = signedAt
		}

		recipients = append(recipients, rec)
	}

	return recipients, rows.Err()
}

// scanDocument scans a document row into a Document struct.
func (r *DocumentRepository) scanDocument(rows pgx.Rows) (*port.Document, error) {
	var doc port.Document
	var title, pdfPath, signerDocID, signerProvider, clientExtRef *string

	err := rows.Scan(
		&doc.ID, &doc.TenantID, &doc.WorkspaceID, &title, &doc.Status,
		&pdfPath, &signerDocID, &signerProvider,
		&clientExtRef, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	doc.Title = title
	doc.PDFStoragePath = pdfPath
	doc.SignerDocumentID = signerDocID
	doc.SignerProvider = signerProvider
	doc.ClientExternalReferenceID = clientExtRef

	return &doc, nil
}

// UpdateDocumentStatus updates the document status and optional error message.
func (r *DocumentRepository) UpdateDocumentStatus(ctx context.Context, docID uuid.UUID, status string, errorMsg string) error {
	var query string
	var args []any

	if errorMsg != "" {
		query = `
			UPDATE execution.documents
			SET status = $1, error_message = $2, updated_at = NOW()
			WHERE id = $3
		`
		args = []any{status, errorMsg, docID}
	} else {
		query = `
			UPDATE execution.documents
			SET status = $1, updated_at = NOW()
			WHERE id = $2
		`
		args = []any{status, docID}
	}

	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("updating document status: %w", err)
	}

	return nil
}

// UpdateDocumentFromResult updates a document with operation result data.
func (r *DocumentRepository) UpdateDocumentFromResult(ctx context.Context, docID uuid.UUID, result *port.OperationResult) error {
	query := `
		UPDATE execution.documents
		SET status = $1, signer_document_id = $2, updated_at = NOW()
		WHERE id = $3
	`

	_, err := r.pool.Exec(ctx, query, result.NewStatus, result.SignerDocumentID, docID)
	if err != nil {
		return fmt.Errorf("updating document from result: %w", err)
	}

	return nil
}

// UpdateRecipientFromResult updates a recipient with operation result data.
func (r *DocumentRepository) UpdateRecipientFromResult(ctx context.Context, update port.RecipientUpdate) error {
	query := `
		UPDATE execution.document_recipients
		SET signer_recipient_id = $1, signing_url = $2, status = $3, updated_at = NOW()
		WHERE id = $4
	`

	_, err := r.pool.Exec(ctx, query,
		update.SignerRecipientID, update.SigningURL, update.NewStatus, update.RecipientID,
	)
	if err != nil {
		return fmt.Errorf("updating recipient from result: %w", err)
	}

	return nil
}
