package document

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// InternalCreateCommand contains the data for creating a document via internal API.
type InternalCreateCommand struct {
	ExternalID      string            // From header X-External-ID
	TemplateID      string            // From header X-Template-ID
	TransactionalID string            // From header X-Transactional-ID
	Headers         map[string]string // All HTTP headers
	RawBody         []byte            // Unparsed body (passed to Mapper)
}

// InternalDocumentUseCase defines the input port for internal document operations.
// These operations are used for service-to-service communication.
type InternalDocumentUseCase interface {
	// CreateDocument creates a document using the extension system (Mapper, Init, Injectors).
	// Returns the created document with recipients.
	CreateDocument(ctx context.Context, cmd InternalCreateCommand) (*entity.DocumentWithRecipients, error)

	// Future operations:
	// RenewDocument(ctx context.Context, cmd InternalRenewCommand) (*entity.DocumentWithRecipients, error)
	// AmendDocument(ctx context.Context, cmd InternalAmendCommand) (*entity.DocumentWithRecipients, error)
	// CancelDocument(ctx context.Context, cmd InternalCancelCommand) error
	// PreviewDocument(ctx context.Context, cmd InternalPreviewCommand) ([]byte, error)
}
