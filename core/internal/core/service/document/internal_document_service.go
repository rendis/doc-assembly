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
}

// NewInternalDocumentService creates a new InternalDocumentService.
func NewInternalDocumentService(
	generator *DocumentGenerator,
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	pdfRenderer port.PDFRenderer,
	signingProvider port.SigningProvider,
) document_uc.InternalDocumentUseCase {
	return &InternalDocumentService{
		generator:       generator,
		documentRepo:    documentRepo,
		recipientRepo:   recipientRepo,
		pdfRenderer:     pdfRenderer,
		signingProvider: signingProvider,
	}
}

// CreateDocument implements usecase.InternalDocumentUseCase.
// It creates a document using the extension system, renders the PDF,
// and uploads directly to the signing provider returning signing URLs.
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
	title := result.Document.ID
	if result.Document.Title != nil {
		title = *result.Document.Title
	}

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

	// Map portable doc role IDs to DB role IDs for signature fields
	signatureFields := s.mapSignatureFields(result, renderResult.SignatureFields)

	return &port.UploadDocumentRequest{
		PDF:             renderResult.PDF,
		Title:           title,
		Recipients:      recipients,
		SignatureFields: signatureFields,
	}
}

// mapSignatureFields converts SignatureFields from portable doc role IDs to DB role IDs.
func (s *InternalDocumentService) mapSignatureFields(
	result *DocumentGenerationResult,
	fields []port.SignatureField,
) []port.SignatureFieldPosition {
	// Build map: anchor string -> DB role ID
	anchorToDBRoleID := make(map[string]string, len(result.Version.SignerRoles))
	for _, role := range result.Version.SignerRoles {
		anchorToDBRoleID[role.AnchorString] = role.ID
	}

	// Build map: portable doc role ID -> anchor string
	portableIDToAnchor := make(map[string]string, len(result.PortableDoc.SignerRoles))
	for _, role := range result.PortableDoc.SignerRoles {
		anchor := portable_doc.GenerateAnchorString(role.Label)
		portableIDToAnchor[role.ID] = anchor
	}

	// Convert fields
	positions := make([]port.SignatureFieldPosition, 0, len(fields))
	for _, f := range fields {
		anchor := portableIDToAnchor[f.RoleID]
		dbRoleID := anchorToDBRoleID[anchor]
		if dbRoleID == "" {
			continue
		}

		posX, posY := convertFieldToProviderPosition(f)

		positions = append(positions, port.SignatureFieldPosition{
			RoleID:    dbRoleID,
			Page:      f.Page,
			PositionX: posX,
			PositionY: posY,
			Width:     f.Width,
			Height:    f.Height,
		})
	}

	return positions
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
	signerRoleValues := s.buildSignerRoleValues(
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

// buildSignerRoleValues builds the signer role values map from recipients.
// Maps recipient data to portable doc role IDs (not DB role IDs) for PDF rendering.
func (s *InternalDocumentService) buildSignerRoleValues(
	recipients []*entity.DocumentRecipient,
	dbSignerRoles []*entity.TemplateVersionSignerRole,
	portableDocRoles []portable_doc.SignerRole,
) map[string]port.SignerRoleValue {
	// Create map: DB role ID -> anchor string
	dbRoleToAnchor := make(map[string]string, len(dbSignerRoles))
	for _, role := range dbSignerRoles {
		dbRoleToAnchor[role.ID] = role.AnchorString
	}

	// Create map: anchor string -> portable doc role ID
	anchorToPortableID := make(map[string]string, len(portableDocRoles))
	for _, role := range portableDocRoles {
		anchor := portable_doc.GenerateAnchorString(role.Label)
		anchorToPortableID[anchor] = role.ID
	}

	// Build values using portable doc role IDs as keys
	values := make(map[string]port.SignerRoleValue, len(recipients))
	for _, r := range recipients {
		anchor := dbRoleToAnchor[r.TemplateVersionRoleID]
		portableDocRoleID := anchorToPortableID[anchor]
		if portableDocRoleID != "" {
			values[portableDocRoleID] = port.SignerRoleValue{
				Name:  r.Name,
				Email: r.Email,
			}
		}
	}
	return values
}
