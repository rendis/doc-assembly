package document

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	portable_doc "github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
	"github.com/rendis/doc-assembly/core/internal/core/port"
	document_uc "github.com/rendis/doc-assembly/core/internal/core/usecase/document"
)

// InternalDocumentService implements usecase.InternalDocumentUseCase.
// It uses DocumentGenerator for the core document generation logic
// and handles PDF rendering with direct upload to the signing provider.
type InternalDocumentService struct {
	generator       *DocumentGenerator
	documentRepo    port.DocumentRepository
	recipientRepo   port.DocumentRecipientRepository
	pdfRenderer     port.PDFRenderer
	signingProvider port.SigningProvider
	accessTokenRepo port.DocumentAccessTokenRepository
}

// NewInternalDocumentService creates a new InternalDocumentService.
func NewInternalDocumentService(
	generator *DocumentGenerator,
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	pdfRenderer port.PDFRenderer,
	signingProvider port.SigningProvider,
	accessTokenRepo port.DocumentAccessTokenRepository,
) document_uc.InternalDocumentUseCase {
	return &InternalDocumentService{
		generator:       generator,
		documentRepo:    documentRepo,
		recipientRepo:   recipientRepo,
		pdfRenderer:     pdfRenderer,
		signingProvider: signingProvider,
		accessTokenRepo: accessTokenRepo,
	}
}

// CreateDocument implements usecase.InternalDocumentUseCase.
// It creates a document using the extension system, renders the PDF,
// and uploads directly to the signing provider returning signing URLs.
// If the template has interactive fields and exactly one unsigned signer,
// the document enters AWAITING_INPUT status instead.
func (s *InternalDocumentService) CreateDocument(
	ctx context.Context,
	cmd document_uc.InternalCreateCommand,
) (*entity.DocumentWithRecipients, error) {
	slog.InfoContext(ctx, "creating document via internal API", "externalID", cmd.ExternalID, "templateID", cmd.TemplateID)

	result, err := s.generator.GenerateDocument(ctx, s.buildMapperContext(cmd))
	if err != nil {
		slog.ErrorContext(ctx, "document generation failed", "error", err)
		return nil, err
	}

	if len(result.Recipients) == 0 {
		return s.buildResponse(result), nil
	}

	// Check if document should enter the pre-signing (AWAITING_INPUT) flow.
	if s.shouldAwaitInput(result) {
		if err := s.transitionToAwaitingInput(ctx, result); err != nil {
			return nil, err
		}
		return s.buildResponse(result), nil
	}

	if err := s.renderAndUploadToProvider(ctx, result); err != nil {
		return nil, err
	}

	slog.InfoContext(ctx, "document uploaded to signing provider",
		"documentID", result.Document.ID,
		"provider", s.signingProvider.ProviderName(),
		"signerDocID", *result.Document.SignerDocumentID)

	return s.buildResponse(result), nil
}

// buildMapperContext creates a MapperContext from the command.
func (s *InternalDocumentService) buildMapperContext(cmd document_uc.InternalCreateCommand) *port.MapperContext {
	return &port.MapperContext{
		ExternalID:      cmd.ExternalID,
		TemplateID:      cmd.TemplateID,
		TransactionalID: cmd.TransactionalID,
		Operation:       entity.OperationCreate,
		Headers:         cmd.Headers,
		RawBody:         cmd.RawBody,
	}
}

// buildResponse creates the response from the generation result.
func (s *InternalDocumentService) buildResponse(result *DocumentGenerationResult) *entity.DocumentWithRecipients {
	return &entity.DocumentWithRecipients{
		Document:   *result.Document,
		Recipients: result.Recipients,
	}
}

// renderAndUploadToProvider renders the PDF and uploads directly to the signing provider.
func (s *InternalDocumentService) renderAndUploadToProvider(
	ctx context.Context,
	result *DocumentGenerationResult,
) error {
	renderResult, err := s.renderPDF(ctx, result)
	if err != nil {
		slog.ErrorContext(ctx, "PDF rendering failed", "error", err, "documentID", result.Document.ID)
		return err
	}

	if err := s.uploadToSigningProvider(ctx, result, renderResult); err != nil {
		slog.ErrorContext(ctx, "signing provider upload failed", "error", err, "documentID", result.Document.ID)
		return err
	}

	return nil
}

// uploadToSigningProvider uploads the PDF directly to the signing provider and updates document/recipients.
func (s *InternalDocumentService) uploadToSigningProvider(
	ctx context.Context,
	result *DocumentGenerationResult,
	renderResult *port.RenderPreviewResult,
) error {
	// Build upload request
	uploadReq := s.buildUploadRequest(result, renderResult)

	// Upload to signing provider
	uploadResult, err := s.signingProvider.UploadDocument(ctx, uploadReq)
	if err != nil {
		_ = result.Document.MarkAsError()
		_ = s.documentRepo.Update(ctx, result.Document)
		return fmt.Errorf("uploading to signing provider: %w", err)
	}

	// Update document with provider info
	result.Document.SetSignerInfo(uploadResult.ProviderName, uploadResult.ProviderDocumentID)
	if err := result.Document.MarkAsPending(); err != nil {
		return fmt.Errorf("marking document as pending: %w", err)
	}
	if err := s.documentRepo.Update(ctx, result.Document); err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	// Update recipients with signing URLs
	if err := s.updateRecipientsWithSigningURLs(ctx, result.Recipients, uploadResult.Recipients); err != nil {
		return fmt.Errorf("updating recipients: %w", err)
	}

	slog.InfoContext(ctx, "document uploaded to signing provider",
		"documentID", result.Document.ID,
		"providerDocID", uploadResult.ProviderDocumentID,
		"recipientCount", len(uploadResult.Recipients),
	)

	return nil
}

// buildUploadRequest constructs the signing provider upload request.
func (s *InternalDocumentService) buildUploadRequest(
	result *DocumentGenerationResult,
	renderResult *port.RenderPreviewResult,
) *port.UploadDocumentRequest {
	title := documentTitle(result.Document)

	// Build recipients for signing provider
	recipients := make([]port.SigningRecipient, len(result.Recipients))
	for i, r := range result.Recipients {
		recipients[i] = port.SigningRecipient{
			Email:       r.Email,
			Name:        r.Name,
			RoleID:      r.TemplateVersionRoleID,
			SignerOrder: i + 1,
		}
	}

	var portableRoles []portable_doc.SignerRole
	if result.PortableDoc != nil {
		portableRoles = result.PortableDoc.SignerRoles
	}
	signatureFields := mapSignatureFieldPositions(renderResult.SignatureFields, result.Version.SignerRoles, portableRoles)

	return &port.UploadDocumentRequest{
		PDF:             renderResult.PDF,
		Title:           title,
		Recipients:      recipients,
		SignatureFields: signatureFields,
	}
}

// updateRecipientsWithSigningURLs updates recipients with provider IDs and signing URLs.
func (s *InternalDocumentService) updateRecipientsWithSigningURLs(
	ctx context.Context,
	recipients []*entity.DocumentRecipient,
	providerResults []port.RecipientResult,
) error {
	// Build map: role ID -> provider result
	resultByRoleID := make(map[string]port.RecipientResult, len(providerResults))
	for _, r := range providerResults {
		resultByRoleID[r.RoleID] = r
	}

	// Update each recipient
	for _, recipient := range recipients {
		providerResult, ok := resultByRoleID[recipient.TemplateVersionRoleID]
		if !ok {
			continue
		}

		recipient.SetSignerRecipientID(providerResult.ProviderRecipientID)
		recipient.SetSigningURL(providerResult.SigningURL)

		if err := s.recipientRepo.Update(ctx, recipient); err != nil {
			return fmt.Errorf("updating recipient %s: %w", recipient.ID, err)
		}
	}

	return nil
}

// renderPDF generates the PDF for the document using the portable document and resolved values.
func (s *InternalDocumentService) renderPDF(
	ctx context.Context,
	result *DocumentGenerationResult,
) (*port.RenderPreviewResult, error) {
	signerRoleValues := buildSignerRoleValues(
		result.Recipients,
		result.Version.SignerRoles,
		result.PortableDoc.SignerRoles,
	)

	renderReq := &port.RenderPreviewRequest{
		Document:         result.PortableDoc,
		Injectables:      result.ResolvedValues,
		SignerRoleValues: signerRoleValues,
	}

	renderResult, err := s.pdfRenderer.RenderPreview(ctx, renderReq)
	if err != nil {
		return nil, fmt.Errorf("rendering PDF: %w", err)
	}

	slog.DebugContext(ctx, "PDF rendered",
		"pageCount", renderResult.PageCount,
		"size", len(renderResult.PDF),
		"signatureFields", len(renderResult.SignatureFields),
	)

	return renderResult, nil
}

// shouldAwaitInput checks whether the document should enter the AWAITING_INPUT flow.
func (s *InternalDocumentService) shouldAwaitInput(result *DocumentGenerationResult) bool {
	if result.PortableDoc == nil {
		return false
	}

	if !result.PortableDoc.HasNodeOfType(portable_doc.NodeTypeInteractiveField) {
		return false
	}

	return countUnsignedSigners(result.PortableDoc) == 1
}

// transitionToAwaitingInput marks the document as AWAITING_INPUT.
// Tokens are now generated on-demand via the email-verification flow (DocumentAccessService).
func (s *InternalDocumentService) transitionToAwaitingInput(
	ctx context.Context,
	result *DocumentGenerationResult,
) error {
	doc := result.Document

	if err := doc.MarkAsAwaitingInput(); err != nil {
		return fmt.Errorf("marking document as awaiting input: %w", err)
	}

	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return fmt.Errorf("updating document to awaiting input: %w", err)
	}

	slog.InfoContext(ctx, "document awaiting interactive field input",
		slog.String("document_id", doc.ID),
	)

	return nil
}
