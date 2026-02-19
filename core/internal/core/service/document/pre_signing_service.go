package document

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
	"github.com/rendis/doc-assembly/core/internal/core/port"
	documentuc "github.com/rendis/doc-assembly/core/internal/core/usecase/document"
)

// PreSigningService implements the pre-signing form use case.
type PreSigningService struct {
	accessTokenRepo   port.DocumentAccessTokenRepository
	fieldResponseRepo port.DocumentFieldResponseRepository
	documentRepo      port.DocumentRepository
	recipientRepo     port.DocumentRecipientRepository
	versionRepo       port.TemplateVersionRepository
	signerRoleRepo    port.TemplateVersionSignerRoleRepository
	pdfRenderer       port.PDFRenderer
	signingProvider   port.SigningProvider
	storageAdapter    port.StorageAdapter
	eventEmitter      *EventEmitter
}

// NewPreSigningService creates a new PreSigningService.
func NewPreSigningService(
	accessTokenRepo port.DocumentAccessTokenRepository,
	fieldResponseRepo port.DocumentFieldResponseRepository,
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	versionRepo port.TemplateVersionRepository,
	signerRoleRepo port.TemplateVersionSignerRoleRepository,
	pdfRenderer port.PDFRenderer,
	signingProvider port.SigningProvider,
	storageAdapter port.StorageAdapter,
	eventEmitter *EventEmitter,
) documentuc.PreSigningUseCase {
	return &PreSigningService{
		accessTokenRepo:   accessTokenRepo,
		fieldResponseRepo: fieldResponseRepo,
		documentRepo:      documentRepo,
		recipientRepo:     recipientRepo,
		versionRepo:       versionRepo,
		signerRoleRepo:    signerRoleRepo,
		pdfRenderer:       pdfRenderer,
		signingProvider:   signingProvider,
		storageAdapter:    storageAdapter,
		eventEmitter:      eventEmitter,
	}
}

// GetPreSigningForm validates the token and returns the form data.
func (s *PreSigningService) GetPreSigningForm(ctx context.Context, token string) (*documentuc.PreSigningFormDTO, error) {
	accessToken, err := s.validateToken(ctx, token)
	if err != nil {
		return nil, err
	}

	doc, err := s.documentRepo.FindByID(ctx, accessToken.DocumentID)
	if err != nil {
		return nil, fmt.Errorf("finding document: %w", err)
	}

	recipient, err := s.recipientRepo.FindByID(ctx, accessToken.RecipientID)
	if err != nil {
		return nil, fmt.Errorf("finding recipient: %w", err)
	}

	version, err := s.versionRepo.FindByID(ctx, doc.TemplateVersionID)
	if err != nil {
		return nil, fmt.Errorf("finding template version: %w", err)
	}

	portableDoc, err := parsePortableDocument(version.ContentStructure)
	if err != nil {
		return nil, fmt.Errorf("parsing document content: %w", err)
	}
	if portableDoc == nil {
		return nil, fmt.Errorf("document has no content")
	}

	// Resolve injectable values from document snapshot.
	content, err := s.resolveContent(portableDoc, doc)
	if err != nil {
		return nil, fmt.Errorf("resolving content: %w", err)
	}

	// Map DB role ID to portable doc role ID for field filtering.
	portableRoleID := s.findPortableRoleID(version, portableDoc, recipient.TemplateVersionRoleID)

	// Extract interactive fields for this recipient's role.
	fields := extractInteractiveFieldsForRole(portableDoc, portableRoleID)

	title := ""
	if doc.Title != nil {
		title = *doc.Title
	}

	return &documentuc.PreSigningFormDTO{
		DocumentTitle:  title,
		DocumentStatus: string(doc.Status),
		RecipientName:  recipient.Name,
		RecipientEmail: recipient.Email,
		RoleID:         recipient.TemplateVersionRoleID,
		Content:        content,
		Fields:         fields,
	}, nil
}

// SubmitPreSigningForm validates responses, saves them, renders PDF, and sends to signing provider.
func (s *PreSigningService) SubmitPreSigningForm(
	ctx context.Context,
	token string,
	responses []documentuc.FieldResponseInput,
) (string, error) {
	accessToken, err := s.validateToken(ctx, token)
	if err != nil {
		return "", err
	}

	doc, recipient, version, portableDoc, err := s.loadSubmissionContext(ctx, accessToken)
	if err != nil {
		return "", err
	}

	// Map DB role to portable doc role for field extraction.
	portableRoleID := s.findPortableRoleID(version, portableDoc, recipient.TemplateVersionRoleID)
	fieldDefs := extractInteractiveFieldsForRole(portableDoc, portableRoleID)

	// Validate responses against field definitions.
	if err := s.validateResponses(responses, fieldDefs); err != nil {
		return "", err
	}

	// Save responses.
	if err := s.saveFieldResponses(ctx, doc.ID, recipient.ID, responses, fieldDefs); err != nil {
		return "", fmt.Errorf("saving field responses: %w", err)
	}

	// Mark token as used.
	if err := s.accessTokenRepo.MarkAsUsed(ctx, accessToken.ID); err != nil {
		return "", fmt.Errorf("marking token as used: %w", err)
	}

	// Render PDF with field responses and upload to signing provider.
	signingURL, err := s.renderAndSendToProvider(ctx, doc, version, portableDoc, buildFieldResponseMap(responses))
	if err != nil {
		return "", err
	}

	slog.InfoContext(ctx, "pre-signing form submitted, document sent for signing",
		slog.String("document_id", doc.ID),
		slog.String("recipient_id", recipient.ID),
	)

	return signingURL, nil
}

// loadSubmissionContext loads the document, recipient, version, and portable doc for a form submission.
func (s *PreSigningService) loadSubmissionContext(
	ctx context.Context,
	accessToken *entity.DocumentAccessToken,
) (*entity.Document, *entity.DocumentRecipient, *entity.TemplateVersion, *portabledoc.Document, error) {
	doc, err := s.documentRepo.FindByID(ctx, accessToken.DocumentID)
	if err != nil {
		return nil, nil, nil, nil, fmt.Errorf("finding document: %w", err)
	}
	if !doc.IsAwaitingInput() {
		return nil, nil, nil, nil, fmt.Errorf("document is not awaiting input")
	}

	recipient, err := s.recipientRepo.FindByID(ctx, accessToken.RecipientID)
	if err != nil {
		return nil, nil, nil, nil, fmt.Errorf("finding recipient: %w", err)
	}

	version, err := s.versionRepo.FindByID(ctx, doc.TemplateVersionID)
	if err != nil {
		return nil, nil, nil, nil, fmt.Errorf("finding template version: %w", err)
	}

	portableDoc, err := parsePortableDocument(version.ContentStructure)
	if err != nil {
		return nil, nil, nil, nil, fmt.Errorf("parsing document content: %w", err)
	}
	if portableDoc == nil {
		return nil, nil, nil, nil, fmt.Errorf("document has no content")
	}

	return doc, recipient, version, portableDoc, nil
}

// RegenerateToken creates a new access token for a document in AWAITING_INPUT status.
func (s *PreSigningService) RegenerateToken(ctx context.Context, documentID string) (*entity.DocumentAccessToken, error) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("finding document: %w", err)
	}
	if !doc.IsAwaitingInput() {
		return nil, fmt.Errorf("document is not in AWAITING_INPUT status")
	}

	// Invalidate existing tokens.
	if err := s.accessTokenRepo.InvalidateByDocumentID(ctx, documentID); err != nil {
		return nil, fmt.Errorf("invalidating existing tokens: %w", err)
	}

	// Resolve the recipient who should receive the new token.
	recipientID, err := s.resolveSignerRecipientID(ctx, doc)
	if err != nil {
		return nil, err
	}

	// Generate new token.
	tokenStr, err := generateAccessToken()
	if err != nil {
		return nil, fmt.Errorf("generating access token: %w", err)
	}

	ttlDays := s.resolvePreSigningTTL(doc.TemplateVersionID)

	accessToken := &entity.DocumentAccessToken{
		DocumentID:  documentID,
		RecipientID: recipientID,
		Token:       tokenStr,
		ExpiresAt:   time.Now().UTC().Add(time.Duration(ttlDays) * 24 * time.Hour),
		CreatedAt:   time.Now().UTC(),
	}

	if err := s.accessTokenRepo.Create(ctx, accessToken); err != nil {
		return nil, fmt.Errorf("creating access token: %w", err)
	}

	slog.InfoContext(ctx, "access token regenerated",
		slog.String("document_id", documentID),
		slog.String("recipient_id", recipientID),
		slog.Int("ttl_days", ttlDays),
	)

	return accessToken, nil
}

// resolveSignerRecipientID finds the real signer recipient for a document.
func (s *PreSigningService) resolveSignerRecipientID(ctx context.Context, doc *entity.Document) (string, error) {
	recipients, err := s.recipientRepo.FindByDocumentID(ctx, doc.ID)
	if err != nil {
		return "", fmt.Errorf("finding recipients: %w", err)
	}
	if len(recipients) == 0 {
		return "", fmt.Errorf("no recipients found for document")
	}

	version, err := s.versionRepo.FindByID(ctx, doc.TemplateVersionID)
	if err != nil {
		return "", fmt.Errorf("finding template version: %w", err)
	}

	signerRoles, err := s.signerRoleRepo.FindByVersionID(ctx, doc.TemplateVersionID)
	if err != nil {
		return "", fmt.Errorf("finding signer roles: %w", err)
	}

	roleMap := make(map[string]*entity.TemplateVersionSignerRole, len(signerRoles))
	for _, role := range signerRoles {
		roleMap[role.ID] = role
	}

	recipientID := findRealSignerRecipientID(version, recipients, roleMap)
	if recipientID == "" {
		recipientID = recipients[0].ID
	}

	return recipientID, nil
}

// resolvePreSigningTTL returns the pre-signing TTL from the workflow config, or the default.
func (s *PreSigningService) resolvePreSigningTTL(templateVersionID string) int {
	version, err := s.versionRepo.FindByID(context.Background(), templateVersionID)
	if err != nil || version.ContentStructure == nil {
		return portabledoc.DefaultPreSigningTTLDays
	}

	pDoc, err := parsePortableDocument(version.ContentStructure)
	if err != nil || pDoc == nil || pDoc.SigningWorkflow == nil || pDoc.SigningWorkflow.PreSigningTTLDays <= 0 {
		return portabledoc.DefaultPreSigningTTLDays
	}

	return pDoc.SigningWorkflow.PreSigningTTLDays
}

// validateToken checks that a token exists, is not expired, and is not used.
func (s *PreSigningService) validateToken(ctx context.Context, token string) (*entity.DocumentAccessToken, error) {
	if token == "" {
		return nil, entity.ErrMissingToken
	}

	accessToken, err := s.accessTokenRepo.FindByToken(ctx, token)
	if err != nil {
		return nil, entity.ErrInvalidToken
	}

	if accessToken.UsedAt != nil {
		return nil, fmt.Errorf("access token has already been used")
	}

	if time.Now().UTC().After(accessToken.ExpiresAt) {
		return nil, entity.ErrTokenExpired
	}

	return accessToken, nil
}

// resolveContent serializes the portable doc content with injected values applied.
// Returns the full portable doc content as JSON.
func (s *PreSigningService) resolveContent(portableDoc *portabledoc.Document, doc *entity.Document) (json.RawMessage, error) {
	// Return the raw content as-is. The frontend will render it with injectable
	// values from the document snapshot. For now we return the ProseMirror content.
	if portableDoc.Content == nil {
		return nil, fmt.Errorf("document has no ProseMirror content")
	}

	return json.Marshal(portableDoc.Content)
}

// findPortableRoleID maps a DB signer role ID to the portable doc role ID.
func (s *PreSigningService) findPortableRoleID(
	version *entity.TemplateVersion,
	portableDoc *portabledoc.Document,
	dbRoleID string,
) string {
	// Load the signer roles for the version to get anchor strings.
	signerRoles, err := s.signerRoleRepo.FindByVersionID(context.Background(), version.ID)
	if err != nil {
		return ""
	}

	// Find the anchor string for this DB role ID.
	var anchor string
	for _, role := range signerRoles {
		if role.ID == dbRoleID {
			anchor = role.AnchorString
			break
		}
	}
	if anchor == "" {
		return ""
	}

	// Find the portable doc role ID that maps to this anchor.
	for _, sr := range portableDoc.SignerRoles {
		if portabledoc.GenerateAnchorString(sr.Label) == anchor {
			return sr.ID
		}
	}

	return ""
}

// extractInteractiveFieldsForRole extracts interactive fields for a specific role.
func extractInteractiveFieldsForRole(doc *portabledoc.Document, roleID string) []documentuc.InteractiveFieldDTO {
	fields := make([]documentuc.InteractiveFieldDTO, 0, 8)

	for _, node := range doc.CollectNodesOfType(portabledoc.NodeTypeInteractiveField) {
		attrs, err := portabledoc.ParseInteractiveFieldAttrs(node.Attrs)
		if err != nil {
			continue
		}

		// Filter by role if a roleID is specified.
		if roleID != "" && attrs.RoleID != roleID {
			continue
		}

		fields = append(fields, documentuc.InteractiveFieldDTO{
			ID:          attrs.ID,
			FieldType:   attrs.FieldType,
			Label:       attrs.Label,
			Required:    attrs.Required,
			Options:     attrs.Options,
			Placeholder: attrs.Placeholder,
			MaxLength:   attrs.MaxLength,
		})
	}

	return fields
}

// validateResponses validates all field responses against field definitions.
func (s *PreSigningService) validateResponses(
	responses []documentuc.FieldResponseInput,
	fieldDefs []documentuc.InteractiveFieldDTO,
) error {
	// Build a map of field definitions by ID.
	defByID := make(map[string]documentuc.InteractiveFieldDTO, len(fieldDefs))
	for _, def := range fieldDefs {
		defByID[def.ID] = def
	}

	// Build a set of submitted field IDs.
	submittedIDs := make(map[string]bool, len(responses))
	for _, resp := range responses {
		submittedIDs[resp.FieldID] = true
	}

	// Check that all required fields are submitted.
	for _, def := range fieldDefs {
		if def.Required && !submittedIDs[def.ID] {
			return fmt.Errorf("required field %q (%s) is missing", def.Label, def.ID)
		}
	}

	// Validate each response.
	for _, resp := range responses {
		def, ok := defByID[resp.FieldID]
		if !ok {
			return fmt.Errorf("unknown field ID: %s", resp.FieldID)
		}

		if err := validateSingleResponse(resp, def); err != nil {
			return fmt.Errorf("field %q (%s): %w", def.Label, def.ID, err)
		}
	}

	return nil
}

// validateSingleResponse validates a single field response against its definition.
func validateSingleResponse(resp documentuc.FieldResponseInput, def documentuc.InteractiveFieldDTO) error {
	switch def.FieldType {
	case portabledoc.InteractiveFieldTypeCheckbox, portabledoc.InteractiveFieldTypeRadio:
		return validateSelectionResponse(resp.Response, def)
	case portabledoc.InteractiveFieldTypeText:
		return validateTextResponse(resp.Response, def)
	default:
		return fmt.Errorf("unsupported field type: %s", def.FieldType)
	}
}

// selectionResponse is the expected JSON structure for checkbox/radio responses.
type selectionResponse struct {
	SelectedOptionIDs []string `json:"selectedOptionIds"`
}

// textResponse is the expected JSON structure for text responses.
type textResponse struct {
	Text string `json:"text"`
}

// validateSelectionResponse validates a checkbox or radio response.
func validateSelectionResponse(responseJSON json.RawMessage, def documentuc.InteractiveFieldDTO) error {
	var resp selectionResponse
	if err := json.Unmarshal(responseJSON, &resp); err != nil {
		return fmt.Errorf("invalid response format: expected {\"selectedOptionIds\":[...]}")
	}

	if def.FieldType == portabledoc.InteractiveFieldTypeRadio && len(resp.SelectedOptionIDs) > 1 {
		return fmt.Errorf("radio field must have at most one selected option")
	}

	// Build valid option IDs set.
	validIDs := make(map[string]bool, len(def.Options))
	for _, opt := range def.Options {
		validIDs[opt.ID] = true
	}

	for _, id := range resp.SelectedOptionIDs {
		if !validIDs[id] {
			return fmt.Errorf("invalid option ID: %s", id)
		}
	}

	return nil
}

// validateTextResponse validates a text response.
func validateTextResponse(responseJSON json.RawMessage, def documentuc.InteractiveFieldDTO) error {
	var resp textResponse
	if err := json.Unmarshal(responseJSON, &resp); err != nil {
		return fmt.Errorf("invalid response format: expected {\"text\":\"...\"}")
	}

	if def.MaxLength > 0 && len(resp.Text) > def.MaxLength {
		return fmt.Errorf("text exceeds maximum length of %d characters", def.MaxLength)
	}

	return nil
}

// saveFieldResponses persists the field responses.
func (s *PreSigningService) saveFieldResponses(
	ctx context.Context,
	documentID, recipientID string,
	responses []documentuc.FieldResponseInput,
	fieldDefs []documentuc.InteractiveFieldDTO,
) error {
	// Build field type lookup.
	typeByID := make(map[string]string, len(fieldDefs))
	for _, def := range fieldDefs {
		typeByID[def.ID] = def.FieldType
	}

	for _, resp := range responses {
		fieldResponse := &entity.DocumentFieldResponse{
			ID:          uuid.NewString(),
			DocumentID:  documentID,
			RecipientID: recipientID,
			FieldID:     resp.FieldID,
			FieldType:   typeByID[resp.FieldID],
			Response:    resp.Response,
			CreatedAt:   time.Now().UTC(),
		}

		if err := s.fieldResponseRepo.Create(ctx, fieldResponse); err != nil {
			return fmt.Errorf("creating field response for field %s: %w", resp.FieldID, err)
		}
	}

	return nil
}

// buildFieldResponseMap converts responses to the map format expected by the renderer.
func buildFieldResponseMap(responses []documentuc.FieldResponseInput) map[string]json.RawMessage {
	m := make(map[string]json.RawMessage, len(responses))
	for _, resp := range responses {
		m[resp.FieldID] = resp.Response
	}
	return m
}

// renderAndSendToProvider renders the PDF with field responses and sends to the signing provider.
// Returns the signing URL for the recipient.
func (s *PreSigningService) renderAndSendToProvider(
	ctx context.Context,
	doc *entity.Document,
	version *entity.TemplateVersion,
	portableDoc *portabledoc.Document,
	fieldResponses map[string]json.RawMessage,
) (string, error) {
	// Load recipients and signer roles.
	recipients, err := s.recipientRepo.FindByDocumentID(ctx, doc.ID)
	if err != nil {
		return "", fmt.Errorf("loading recipients: %w", err)
	}

	signerRoles, err := s.signerRoleRepo.FindByVersionID(ctx, doc.TemplateVersionID)
	if err != nil {
		return "", fmt.Errorf("loading signer roles: %w", err)
	}

	// Build signer role values for rendering (map portable doc role IDs -> name/email).
	signerRoleValues := s.buildSignerRoleValues(recipients, signerRoles, portableDoc.SignerRoles)

	// Build injected values from document snapshot.
	var injectables map[string]any
	if doc.InjectedValuesSnapshot != nil {
		_ = json.Unmarshal(doc.InjectedValuesSnapshot, &injectables)
	}

	renderResult, err := s.pdfRenderer.RenderPreview(ctx, &port.RenderPreviewRequest{
		Document:         portableDoc,
		Injectables:      injectables,
		SignerRoleValues: signerRoleValues,
		FieldResponses:   fieldResponses,
	})
	if err != nil {
		return "", fmt.Errorf("rendering PDF: %w", err)
	}

	// Store rendered PDF and transition to PENDING_PROVIDER.
	storagePath := fmt.Sprintf("documents/%s/%s/pre-signed.pdf", doc.WorkspaceID, doc.ID)
	if err := s.storageAdapter.Upload(ctx, storagePath, renderResult.PDF, "application/pdf"); err != nil {
		return "", fmt.Errorf("storing PDF: %w", err)
	}
	doc.SetPDFPath(storagePath)

	if err := doc.MarkAsPendingProvider(); err != nil {
		return "", fmt.Errorf("marking document as pending provider: %w", err)
	}
	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return "", fmt.Errorf("updating document status: %w", err)
	}

	// Upload to signing provider.
	signingURL, err := s.uploadToProvider(ctx, doc, recipients, signerRoles, portableDoc, renderResult)
	if err != nil {
		return "", err
	}

	return signingURL, nil
}

// uploadToProvider uploads the rendered PDF to the signing provider and finalizes the document.
func (s *PreSigningService) uploadToProvider(
	ctx context.Context,
	doc *entity.Document,
	recipients []*entity.DocumentRecipient,
	signerRoles []*entity.TemplateVersionSignerRole,
	portableDoc *portabledoc.Document,
	renderResult *port.RenderPreviewResult,
) (string, error) {
	title := doc.ID
	if doc.Title != nil {
		title = *doc.Title
	}

	uploadResult, err := s.signingProvider.UploadDocument(ctx, &port.UploadDocumentRequest{
		PDF:             renderResult.PDF,
		Title:           title,
		Recipients:      buildSigningRecipients(recipients),
		ExternalRef:     doc.ID,
		SignatureFields: s.mapSignatureFields(renderResult.SignatureFields, signerRoles, portableDoc),
	})
	if err != nil {
		_ = doc.MarkAsError()
		_ = s.documentRepo.Update(ctx, doc)
		return "", fmt.Errorf("uploading to signing provider: %w", err)
	}

	// Update document with provider info and mark as PENDING.
	doc.SetSignerInfo(uploadResult.ProviderName, uploadResult.ProviderDocumentID)
	if err := doc.MarkAsPending(); err != nil {
		return "", fmt.Errorf("marking document as pending: %w", err)
	}
	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return "", fmt.Errorf("updating document: %w", err)
	}

	// Update recipients with provider IDs and signing URLs.
	s.updateRecipientsFromResult(ctx, recipients, uploadResult.Recipients)

	// Emit events.
	s.eventEmitter.EmitDocumentEvent(ctx, doc.ID, entity.EventDocumentSent, entity.ActorSystem, "",
		string(entity.DocumentStatusAwaitingInput), string(entity.DocumentStatusPending), nil)

	return s.findRecipientSigningURL(recipients), nil
}

// buildSignerRoleValues maps recipient data to portable doc role IDs for PDF rendering.
func (s *PreSigningService) buildSignerRoleValues(
	recipients []*entity.DocumentRecipient,
	dbSignerRoles []*entity.TemplateVersionSignerRole,
	portableDocRoles []portabledoc.SignerRole,
) map[string]port.SignerRoleValue {
	// DB role ID -> anchor string.
	dbRoleToAnchor := make(map[string]string, len(dbSignerRoles))
	for _, role := range dbSignerRoles {
		dbRoleToAnchor[role.ID] = role.AnchorString
	}

	// Anchor string -> portable doc role ID.
	anchorToPortableID := make(map[string]string, len(portableDocRoles))
	for _, role := range portableDocRoles {
		anchor := portabledoc.GenerateAnchorString(role.Label)
		anchorToPortableID[anchor] = role.ID
	}

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

// mapSignatureFields converts render result signature fields to provider positions.
func (s *PreSigningService) mapSignatureFields(
	fields []port.SignatureField,
	dbSignerRoles []*entity.TemplateVersionSignerRole,
	portableDoc *portabledoc.Document,
) []port.SignatureFieldPosition {
	if len(fields) == 0 {
		return nil
	}

	// anchor string -> DB role ID
	anchorToDBRoleID := make(map[string]string, len(dbSignerRoles))
	for _, role := range dbSignerRoles {
		if role.AnchorString != "" {
			anchorToDBRoleID[role.AnchorString] = role.ID
		}
	}

	// portable doc role ID -> anchor string
	portableIDToAnchor := make(map[string]string, len(portableDoc.SignerRoles))
	for _, role := range portableDoc.SignerRoles {
		anchor := portabledoc.GenerateAnchorString(role.Label)
		portableIDToAnchor[role.ID] = anchor
	}

	positions := make([]port.SignatureFieldPosition, 0, len(fields))
	for _, f := range fields {
		// The field's RoleID is a portable doc role ID. Map it to a DB role ID.
		anchor := portableIDToAnchor[f.RoleID]
		if anchor == "" {
			// Try AnchorString directly.
			anchor = f.AnchorString
		}

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

// updateRecipientsFromResult updates recipients with provider IDs and signing URLs.
func (s *PreSigningService) updateRecipientsFromResult(
	ctx context.Context,
	recipients []*entity.DocumentRecipient,
	results []port.RecipientResult,
) {
	byRoleID := make(map[string]port.RecipientResult, len(results))
	for _, r := range results {
		byRoleID[r.RoleID] = r
	}

	for _, recipient := range recipients {
		pr, ok := byRoleID[recipient.TemplateVersionRoleID]
		if !ok {
			continue
		}

		recipient.SetSignerRecipientID(pr.ProviderRecipientID)
		recipient.SetSigningURL(pr.SigningURL)

		if err := recipient.MarkAsSent(); err != nil {
			slog.WarnContext(ctx, "failed to mark recipient as sent",
				slog.String("recipient_id", recipient.ID),
				slog.String("error", err.Error()),
			)
		}

		if err := s.recipientRepo.Update(ctx, recipient); err != nil {
			slog.WarnContext(ctx, "failed to update recipient",
				slog.String("recipient_id", recipient.ID),
				slog.String("error", err.Error()),
			)
		}
	}
}

// findRecipientSigningURL finds the first available signing URL from the recipients.
func (s *PreSigningService) findRecipientSigningURL(recipients []*entity.DocumentRecipient) string {
	for _, r := range recipients {
		if r.SigningURL != nil && *r.SigningURL != "" {
			return *r.SigningURL
		}
	}
	return ""
}

// Verify PreSigningService implements PreSigningUseCase.
var _ documentuc.PreSigningUseCase = (*PreSigningService)(nil)
