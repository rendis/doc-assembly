package document

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	portable_doc "github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	document_uc "github.com/doc-assembly/doc-engine/internal/core/usecase/document"
)

// InternalDocumentService implements usecase.InternalDocumentUseCase.
// It uses DocumentGenerator for the core document generation logic
// and handles PDF rendering and signing provider upload.
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
// and sends it to the signing provider.
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

	if err := s.renderAndSendForSigning(ctx, result); err != nil {
		return nil, err
	}

	slog.InfoContext(ctx, "document sent for signing",
		"documentID", result.Document.ID, "provider", *result.Document.SignerProvider)

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

// renderAndSendForSigning renders the PDF and sends it to the signing provider.
func (s *InternalDocumentService) renderAndSendForSigning(
	ctx context.Context,
	result *DocumentGenerationResult,
) error {
	renderResult, err := s.renderPDF(ctx, result)
	if err != nil {
		slog.ErrorContext(ctx, "PDF rendering failed", "error", err, "documentID", result.Document.ID)
		return err
	}

	if err := s.sendToSigningProvider(ctx, result, renderResult); err != nil {
		slog.ErrorContext(ctx, "signing provider upload failed", "error", err, "documentID", result.Document.ID)
		return err
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

// sendToSigningProvider uploads the document to the signing provider and updates statuses.
func (s *InternalDocumentService) sendToSigningProvider(
	ctx context.Context,
	result *DocumentGenerationResult,
	renderResult *port.RenderPreviewResult,
) error {
	signingRecipients := s.buildSigningRecipients(result.Recipients, result.Version.SignerRoles)
	signatureFields := s.buildSignatureFieldPositions(renderResult.SignatureFields, result.Recipients, result.Version.SignerRoles)

	s.logSignatureFieldDebug(ctx, renderResult.SignatureFields, signatureFields, result.Version.SignerRoles)

	uploadReq := &port.UploadDocumentRequest{
		PDF:             renderResult.PDF,
		Title:           s.buildDocumentTitle(result),
		Recipients:      signingRecipients,
		ExternalRef:     result.Document.ID,
		SignatureFields: signatureFields,
	}

	if result.Document.ClientExternalReferenceID != nil {
		uploadReq.ExternalRef = *result.Document.ClientExternalReferenceID
	}

	uploadResult, err := s.signingProvider.UploadDocument(ctx, uploadReq)
	if err != nil {
		_ = result.Document.MarkAsError()
		_ = s.documentRepo.Update(ctx, result.Document)
		return fmt.Errorf("uploading to signing provider: %w", err)
	}

	result.Document.SetSignerInfo(uploadResult.ProviderName, uploadResult.ProviderDocumentID)
	if err := result.Document.MarkAsPending(); err != nil {
		return fmt.Errorf("marking document as pending: %w", err)
	}

	if err := s.documentRepo.Update(ctx, result.Document); err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	s.updateRecipientsWithProviderIDs(ctx, result.Recipients, uploadResult.Recipients)

	return nil
}

// buildSignatureFieldPositions converts render signature fields to signing provider format.
// Maps portable doc role IDs to DB role IDs for the signing provider.
func (s *InternalDocumentService) buildSignatureFieldPositions(
	signatureFields []port.SignatureField,
	recipients []*entity.DocumentRecipient,
	dbSignerRoles []*entity.TemplateVersionSignerRole,
) []port.SignatureFieldPosition {
	if len(signatureFields) == 0 {
		return nil
	}

	anchorToDBRoleID := s.buildAnchorToRoleMap(dbSignerRoles)
	recipientRoleSet := s.buildRecipientRoleSet(recipients)

	positions := make([]port.SignatureFieldPosition, 0, len(signatureFields))
	for _, sf := range signatureFields {
		dbRoleID, ok := anchorToDBRoleID[sf.AnchorString]
		if !ok || !recipientRoleSet[dbRoleID] {
			continue
		}

		positions = append(positions, port.SignatureFieldPosition{
			RoleID:    dbRoleID,
			Page:      sf.Page,
			PositionX: sf.PositionX,
			PositionY: sf.PositionY,
			Width:     sf.Width,
			Height:    sf.Height,
		})
	}
	return positions
}

// buildAnchorToRoleMap creates anchor string -> DB role ID mapping.
func (s *InternalDocumentService) buildAnchorToRoleMap(
	dbSignerRoles []*entity.TemplateVersionSignerRole,
) map[string]string {
	m := make(map[string]string, len(dbSignerRoles))
	for _, role := range dbSignerRoles {
		m[role.AnchorString] = role.ID
	}
	return m
}

// buildRecipientRoleSet creates a set of role IDs that have recipients.
func (s *InternalDocumentService) buildRecipientRoleSet(
	recipients []*entity.DocumentRecipient,
) map[string]bool {
	set := make(map[string]bool, len(recipients))
	for _, r := range recipients {
		set[r.TemplateVersionRoleID] = true
	}
	return set
}

// buildSigningRecipients converts recipients to signing provider format.
func (s *InternalDocumentService) buildSigningRecipients(
	recipients []*entity.DocumentRecipient,
	signerRoles []*entity.TemplateVersionSignerRole,
) []port.SigningRecipient {
	roleMap := make(map[string]*entity.TemplateVersionSignerRole, len(signerRoles))
	for _, role := range signerRoles {
		roleMap[role.ID] = role
	}

	signingRecipients := make([]port.SigningRecipient, 0, len(recipients))
	for _, r := range recipients {
		role, ok := roleMap[r.TemplateVersionRoleID]
		if !ok {
			continue
		}

		signingRecipients = append(signingRecipients, port.SigningRecipient{
			Email:       r.Email,
			Name:        r.Name,
			RoleID:      r.TemplateVersionRoleID,
			SignerOrder: role.SignerOrder,
		})
	}

	return signingRecipients
}

// buildDocumentTitle creates a title for the document.
func (s *InternalDocumentService) buildDocumentTitle(result *DocumentGenerationResult) string {
	if result.Document.Title != nil && *result.Document.Title != "" {
		return *result.Document.Title
	}
	return fmt.Sprintf("Document %s", result.Document.ID[:8])
}

// updateRecipientsWithProviderIDs updates recipients with their provider-assigned IDs and signing URLs.
func (s *InternalDocumentService) updateRecipientsWithProviderIDs(
	ctx context.Context,
	recipients []*entity.DocumentRecipient,
	providerRecipients []port.RecipientResult,
) {
	// Build map for O(n) lookup instead of O(n²) nested loops
	recipientByRoleID := make(map[string]*entity.DocumentRecipient, len(recipients))
	for _, r := range recipients {
		recipientByRoleID[r.TemplateVersionRoleID] = r
	}

	for _, pr := range providerRecipients {
		recipient, ok := recipientByRoleID[pr.RoleID]
		if !ok {
			continue
		}
		s.updateRecipientFromProvider(ctx, recipient, pr)
	}
}

// updateRecipientFromProvider applies provider data to a single recipient.
func (s *InternalDocumentService) updateRecipientFromProvider(
	ctx context.Context,
	recipient *entity.DocumentRecipient,
	pr port.RecipientResult,
) {
	recipient.SetSignerRecipientID(pr.ProviderRecipientID)
	if pr.SigningURL != "" {
		recipient.SetSigningURL(pr.SigningURL)
	}

	if err := recipient.MarkAsSent(); err != nil {
		slog.WarnContext(ctx, "failed to mark recipient as sent", "error", err, "recipientID", recipient.ID)
	}
	if err := s.recipientRepo.Update(ctx, recipient); err != nil {
		slog.WarnContext(ctx, "failed to update recipient", "error", err, "recipientID", recipient.ID)
	}
}

// logSignatureFieldDebug logs summary of signature field mapping for troubleshooting.
func (s *InternalDocumentService) logSignatureFieldDebug(
	ctx context.Context,
	renderFields []port.SignatureField,
	mappedFields []port.SignatureFieldPosition,
	dbSignerRoles []*entity.TemplateVersionSignerRole,
) {
	slog.DebugContext(ctx, "signature field mapping",
		"renderCount", len(renderFields),
		"mappedCount", len(mappedFields),
		"rolesCount", len(dbSignerRoles),
	)
}
