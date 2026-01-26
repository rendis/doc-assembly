package port

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Document represents a document to be processed by the worker.
type Document struct {
	ID                        uuid.UUID
	TenantID                  uuid.UUID
	WorkspaceID               uuid.UUID
	TemplateVersionID         uuid.UUID
	Title                     *string
	ClientExternalReferenceID *string
	SignerDocumentID          *string
	SignerProvider            *string
	Status                    string
	PDFStoragePath            *string
	Recipients                []DocumentRecipient
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
}

// DocumentRecipient represents a document recipient.
type DocumentRecipient struct {
	ID                    uuid.UUID
	DocumentID            uuid.UUID
	TemplateVersionRoleID string
	SignerRecipientID     string
	Name                  string
	Email                 string
	SignerOrder           int
	SigningURL            string
	Status                string
	SignedAt              *time.Time
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

// OperationStrategy defines the contract for each type of operation.
type OperationStrategy interface {
	// OperationType returns the status that this strategy handles.
	OperationType() string

	// Execute executes the operation with the provider.
	Execute(ctx context.Context, doc *Document, provider SigningProvider, storage StorageAdapter) (*OperationResult, error)
}

// OperationResult contains the result of an operation execution.
type OperationResult struct {
	NewStatus        string
	SignerDocumentID string
	RecipientUpdates []RecipientUpdate
	ErrorMessage     string
}

// RecipientUpdate contains updates to apply to a recipient.
type RecipientUpdate struct {
	RecipientID       uuid.UUID
	SignerRecipientID string
	SigningURL        string
	NewStatus         string
}
