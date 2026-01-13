package document

import (
	"context"
	"log/slog"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	documentuc "github.com/doc-assembly/doc-engine/internal/core/usecase/document"
)

// InternalDocumentService implements usecase.InternalDocumentUseCase.
// It uses DocumentGenerator for the core document generation logic
// and adds operation-specific handling.
type InternalDocumentService struct {
	generator *DocumentGenerator
	logger    *slog.Logger
}

// NewInternalDocumentService creates a new InternalDocumentService.
func NewInternalDocumentService(
	generator *DocumentGenerator,
	logger *slog.Logger,
) documentuc.InternalDocumentUseCase {
	if logger == nil {
		logger = slog.Default()
	}
	return &InternalDocumentService{
		generator: generator,
		logger:    logger,
	}
}

// CreateDocument implements usecase.InternalDocumentUseCase.
// It creates a document using the extension system (Mapper, Init, Injectors).
func (s *InternalDocumentService) CreateDocument(
	ctx context.Context,
	cmd documentuc.InternalCreateCommand,
) (*entity.DocumentWithRecipients, error) {
	s.logger.Info("creating document via internal API",
		"externalID", cmd.ExternalID,
		"templateID", cmd.TemplateID,
		"transactionalID", cmd.TransactionalID,
	)

	// Build MapperContext (common input for GenerateDocument)
	mapCtx := &port.MapperContext{
		ExternalID:      cmd.ExternalID,
		TemplateID:      cmd.TemplateID,
		TransactionalID: cmd.TransactionalID,
		Operation:       entity.OperationCreate,
		Headers:         cmd.Headers,
		RawBody:         cmd.RawBody,
	}

	// Call the centralized document generation method
	result, err := s.generator.GenerateDocument(ctx, mapCtx)
	if err != nil {
		s.logger.Error("document generation failed",
			"error", err,
			"externalID", cmd.ExternalID,
			"templateID", cmd.TemplateID,
		)
		return nil, err
	}

	// CREATE operation has no additional logic after generation
	// Future: RENEW/AMEND would add RelatedDocumentID here

	s.logger.Info("document created successfully",
		"documentID", result.Document.ID,
		"recipientCount", len(result.Recipients),
	)

	return &entity.DocumentWithRecipients{
		Document:   *result.Document,
		Recipients: result.Recipients,
	}, nil
}
