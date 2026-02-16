package document

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	documentuc "github.com/doc-assembly/doc-engine/internal/core/usecase/document"
)

// NewDocumentService creates a new document service.
func NewDocumentService(
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	versionRepo port.TemplateVersionRepository,
	signerRoleRepo port.TemplateVersionSignerRoleRepository,
	pdfRenderer port.PDFRenderer,
	signingProvider port.SigningProvider,
	storageAdapter port.StorageAdapter,
	eventEmitter *EventEmitter,
	notificationSvc *NotificationService,
	expirationDays int,
) documentuc.DocumentUseCase {
	return &DocumentService{
		documentRepo:    documentRepo,
		recipientRepo:   recipientRepo,
		versionRepo:     versionRepo,
		signerRoleRepo:  signerRoleRepo,
		pdfRenderer:     pdfRenderer,
		signingProvider: signingProvider,
		storageAdapter:  storageAdapter,
		eventEmitter:    eventEmitter,
		notificationSvc: notificationSvc,
		expirationDays:  expirationDays,
	}
}

// DocumentService implements document business logic.
type DocumentService struct {
	documentRepo    port.DocumentRepository
	recipientRepo   port.DocumentRecipientRepository
	versionRepo     port.TemplateVersionRepository
	signerRoleRepo  port.TemplateVersionSignerRoleRepository
	pdfRenderer     port.PDFRenderer
	signingProvider port.SigningProvider
	storageAdapter  port.StorageAdapter
	eventEmitter    *EventEmitter
	notificationSvc *NotificationService
	expirationDays  int
}

// CreateAndSendDocument creates a document, generates the PDF, and sends it for signing.
func (s *DocumentService) CreateAndSendDocument(ctx context.Context, cmd documentuc.CreateDocumentCommand) (*entity.DocumentWithRecipients, error) {
	if err := s.validateOperationType(ctx, cmd); err != nil {
		return nil, err
	}

	version, roleMap, err := s.validateTemplateAndRoles(ctx, cmd)
	if err != nil {
		return nil, err
	}

	document, err := s.createDocument(ctx, cmd)
	if err != nil {
		return nil, err
	}

	recipients, err := s.createRecipients(ctx, document.ID, cmd.Recipients)
	if err != nil {
		return nil, err
	}

	pdfData, err := s.renderPDF(ctx, version, cmd)
	if err != nil {
		return nil, err
	}

	err = s.sendToSigningProvider(ctx, document, recipients, roleMap, cmd, pdfData)
	if err != nil {
		return nil, err
	}

	slog.InfoContext(ctx, "document created and sent for signing",
		slog.String("document_id", document.ID),
		slog.String("provider_document_id", *document.SignerDocumentID),
		slog.String("provider", *document.SignerProvider),
		slog.Int("recipient_count", len(recipients)),
	)

	s.eventEmitter.EmitDocumentEvent(ctx, document.ID, entity.EventDocumentCreated, entity.ActorUser, "", "", string(entity.DocumentStatusDraft), nil)
	s.eventEmitter.EmitDocumentEvent(ctx, document.ID, entity.EventDocumentSent, entity.ActorSystem, "", string(entity.DocumentStatusDraft), string(entity.DocumentStatusPending), nil)

	return &entity.DocumentWithRecipients{
		Document:   *document,
		Recipients: recipients,
	}, nil
}

// validateTemplateAndRoles validates the template version and returns the role map.
func (s *DocumentService) validateTemplateAndRoles(ctx context.Context, cmd documentuc.CreateDocumentCommand) (*entity.TemplateVersion, map[string]*entity.TemplateVersionSignerRole, error) {
	version, err := s.versionRepo.FindByID(ctx, cmd.TemplateVersionID)
	if err != nil {
		return nil, nil, fmt.Errorf("finding template version: %w", err)
	}

	if !version.IsPublished() {
		return nil, nil, fmt.Errorf("template version is not published")
	}

	signerRoles, err := s.signerRoleRepo.FindByVersionID(ctx, cmd.TemplateVersionID)
	if err != nil {
		return nil, nil, fmt.Errorf("finding signer roles: %w", err)
	}

	if len(cmd.Recipients) != len(signerRoles) {
		return nil, nil, fmt.Errorf("recipient count (%d) does not match signer role count (%d)", len(cmd.Recipients), len(signerRoles))
	}

	roleMap := make(map[string]*entity.TemplateVersionSignerRole)
	for _, role := range signerRoles {
		roleMap[role.ID] = role
	}

	for _, r := range cmd.Recipients {
		if _, ok := roleMap[r.RoleID]; !ok {
			return nil, nil, fmt.Errorf("invalid role ID: %s", r.RoleID)
		}
	}

	return version, roleMap, nil
}

// validateOperationType validates the operation type and related document for RENEW/AMEND.
func (s *DocumentService) validateOperationType(ctx context.Context, cmd documentuc.CreateDocumentCommand) error {
	opType := cmd.OperationType
	if opType == "" {
		opType = entity.OperationCreate
	}

	if !opType.IsValid() {
		return entity.ErrInvalidOperationType
	}

	if opType == entity.OperationCreate {
		return nil
	}

	if opType != entity.OperationRenew && opType != entity.OperationAmend {
		return nil
	}

	if cmd.RelatedDocumentID == nil {
		return entity.ErrRelatedDocumentRequired
	}

	relatedDoc, err := s.documentRepo.FindByID(ctx, *cmd.RelatedDocumentID)
	if err != nil {
		return fmt.Errorf("finding related document: %w", err)
	}

	if relatedDoc.WorkspaceID != cmd.WorkspaceID {
		return entity.ErrRelatedDocumentSameWorkspace
	}

	switch opType {
	case entity.OperationRenew:
		if !relatedDoc.IsCompleted() {
			return entity.ErrDocumentNotCompleted
		}
	case entity.OperationAmend:
		if !relatedDoc.IsTerminal() {
			return entity.ErrDocumentNotTerminal
		}
	}

	return nil
}

// createDocument creates and persists the document entity.
func (s *DocumentService) createDocument(ctx context.Context, cmd documentuc.CreateDocumentCommand) (*entity.Document, error) {
	document := entity.NewDocument(cmd.WorkspaceID, cmd.TemplateVersionID)
	document.ID = uuid.NewString()
	document.SetTitle(cmd.Title)

	if cmd.OperationType != "" && cmd.OperationType != entity.OperationCreate {
		document.SetOperationType(cmd.OperationType)
	}

	if cmd.RelatedDocumentID != nil {
		document.SetRelatedDocumentID(*cmd.RelatedDocumentID)
	}

	if cmd.ClientExternalReferenceID != nil {
		document.SetExternalReference(*cmd.ClientExternalReferenceID)
	}

	if cmd.InjectedValues != nil {
		valuesJSON, err := json.Marshal(cmd.InjectedValues)
		if err != nil {
			return nil, fmt.Errorf("marshaling injected values: %w", err)
		}
		document.SetInjectedValues(valuesJSON)
	}

	if err := document.Validate(); err != nil {
		return nil, fmt.Errorf("validating document: %w", err)
	}

	docID, err := s.documentRepo.Create(ctx, document)
	if err != nil {
		return nil, fmt.Errorf("creating document: %w", err)
	}
	document.ID = docID

	return document, nil
}

// createRecipients creates and persists the document recipients.
func (s *DocumentService) createRecipients(ctx context.Context, docID string, cmdRecipients []documentuc.DocumentRecipientCommand) ([]*entity.DocumentRecipient, error) {
	recipients := make([]*entity.DocumentRecipient, len(cmdRecipients))

	for i, r := range cmdRecipients {
		recipient := entity.NewDocumentRecipient(docID, r.RoleID, r.Name, r.Email)
		recipient.ID = uuid.NewString()

		if err := recipient.Validate(); err != nil {
			return nil, fmt.Errorf("validating recipient: %w", err)
		}

		recipients[i] = recipient
	}

	if err := s.recipientRepo.CreateBatch(ctx, recipients); err != nil {
		return nil, fmt.Errorf("creating recipients: %w", err)
	}

	return recipients, nil
}

// renderPDF generates the PDF for the document.
func (s *DocumentService) renderPDF(ctx context.Context, version *entity.TemplateVersion, cmd documentuc.CreateDocumentCommand) ([]byte, error) {
	signerRoleValues := make(map[string]port.SignerRoleValue)
	for _, r := range cmd.Recipients {
		signerRoleValues[r.RoleID] = port.SignerRoleValue{
			Name:  r.Name,
			Email: r.Email,
		}
	}

	renderReq := &port.RenderPreviewRequest{
		Injectables:      cmd.InjectedValues,
		SignerRoleValues: signerRoleValues,
	}

	if version.ContentStructure != nil {
		doc, err := parsePortableDocument(version.ContentStructure)
		if err != nil {
			return nil, fmt.Errorf("parsing document content: %w", err)
		}
		renderReq.Document = doc
	}

	renderResult, err := s.pdfRenderer.RenderPreview(ctx, renderReq)
	if err != nil {
		return nil, fmt.Errorf("rendering PDF: %w", err)
	}

	return renderResult.PDF, nil
}

// sendToSigningProvider uploads the document to the signing provider and updates statuses.
func (s *DocumentService) sendToSigningProvider(
	ctx context.Context,
	document *entity.Document,
	recipients []*entity.DocumentRecipient,
	roleMap map[string]*entity.TemplateVersionSignerRole,
	cmd documentuc.CreateDocumentCommand,
	pdfData []byte,
) error {
	signingRecipients := s.buildSigningRecipients(cmd.Recipients, roleMap)

	signatureFields := s.buildSignatureFieldPositions(cmd.Recipients)

	uploadReq := &port.UploadDocumentRequest{
		PDF:             pdfData,
		Title:           cmd.Title,
		Recipients:      signingRecipients,
		ExternalRef:     document.ID,
		SignatureFields: signatureFields,
	}

	if cmd.ClientExternalReferenceID != nil {
		uploadReq.ExternalRef = *cmd.ClientExternalReferenceID
	}

	uploadResult, err := s.signingProvider.UploadDocument(ctx, uploadReq)
	if err != nil {
		_ = document.MarkAsError()
		_ = s.documentRepo.Update(ctx, document)
		return fmt.Errorf("uploading to signing provider: %w", err)
	}

	document.SetSignerInfo(uploadResult.ProviderName, uploadResult.ProviderDocumentID)
	if err := document.MarkAsPending(); err != nil {
		return fmt.Errorf("marking document as pending: %w", err)
	}

	if s.expirationDays > 0 {
		document.SetExpiresAt(time.Now().UTC().AddDate(0, 0, s.expirationDays))
	}

	if err := s.documentRepo.Update(ctx, document); err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	s.updateRecipientsWithProviderIDs(ctx, recipients, uploadResult.Recipients)

	return nil
}

// buildSignatureFieldPositions generates default signature field positions for recipients.
// Documenso uses percentage-based coordinates (0-100 for both axes).
// Each recipient gets a signature field on page 1, stacked vertically.
func (s *DocumentService) buildSignatureFieldPositions(recipients []documentuc.DocumentRecipientCommand) []port.SignatureFieldPosition {
	fields := make([]port.SignatureFieldPosition, 0, len(recipients))
	for i, r := range recipients {
		fields = append(fields, port.SignatureFieldPosition{
			RoleID:    r.RoleID,
			Page:      1,
			PositionX: 10,
			PositionY: float64(70 + i*12),
			Width:     30,
			Height:    5,
		})
	}
	return fields
}

// buildSigningRecipients converts recipient inputs to signing provider format.
func (s *DocumentService) buildSigningRecipients(cmdRecipients []documentuc.DocumentRecipientCommand, roleMap map[string]*entity.TemplateVersionSignerRole) []port.SigningRecipient {
	signingRecipients := make([]port.SigningRecipient, len(cmdRecipients))

	for i, r := range cmdRecipients {
		role := roleMap[r.RoleID]
		signingRecipients[i] = port.SigningRecipient{
			Email:       r.Email,
			Name:        r.Name,
			RoleID:      r.RoleID,
			SignerOrder: role.SignerOrder,
		}
	}

	return signingRecipients
}

// updateRecipientsWithProviderIDs updates recipients with their provider-assigned IDs.
func (s *DocumentService) updateRecipientsWithProviderIDs(ctx context.Context, recipients []*entity.DocumentRecipient, providerRecipients []port.RecipientResult) {
	for _, providerRecipient := range providerRecipients {
		for _, recipient := range recipients {
			if recipient.TemplateVersionRoleID != providerRecipient.RoleID {
				continue
			}

			recipient.SetSignerRecipientID(providerRecipient.ProviderRecipientID)
			if err := recipient.MarkAsSent(); err != nil {
				slog.WarnContext(ctx, "failed to mark recipient as sent", slog.String("error", err.Error()))
			}
			if err := s.recipientRepo.Update(ctx, recipient); err != nil {
				slog.WarnContext(ctx, "failed to update recipient", slog.String("error", err.Error()))
			}
			break
		}
	}
}

// GetDocument retrieves a document by ID.
func (s *DocumentService) GetDocument(ctx context.Context, id string) (*entity.Document, error) {
	return s.documentRepo.FindByID(ctx, id)
}

// GetDocumentWithRecipients retrieves a document with all its recipients.
func (s *DocumentService) GetDocumentWithRecipients(ctx context.Context, id string) (*entity.DocumentWithRecipients, error) {
	return s.documentRepo.FindByIDWithRecipients(ctx, id)
}

// ListDocuments lists documents in a workspace with optional filters.
func (s *DocumentService) ListDocuments(ctx context.Context, workspaceID string, filters port.DocumentFilters) ([]*entity.DocumentListItem, error) {
	return s.documentRepo.FindByWorkspace(ctx, workspaceID, filters)
}

// GetSigningURL retrieves the signing URL for a specific recipient.
func (s *DocumentService) GetSigningURL(ctx context.Context, documentID, recipientID string) (string, error) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		return "", fmt.Errorf("finding document: %w", err)
	}

	if !doc.HasSignerInfo() {
		return "", fmt.Errorf("document has not been sent to signing provider")
	}

	recipient, err := s.recipientRepo.FindByID(ctx, recipientID)
	if err != nil {
		return "", fmt.Errorf("finding recipient: %w", err)
	}

	if recipient.DocumentID != documentID {
		return "", fmt.Errorf("recipient does not belong to this document")
	}

	if !recipient.HasSignerInfo() {
		return "", fmt.Errorf("recipient has not been registered with signing provider")
	}

	result, err := s.signingProvider.GetSigningURL(ctx, &port.GetSigningURLRequest{
		ProviderDocumentID:  *doc.SignerDocumentID,
		ProviderRecipientID: *recipient.SignerRecipientID,
	})
	if err != nil {
		return "", fmt.Errorf("getting signing URL: %w", err)
	}

	return result.SigningURL, nil
}

// RefreshDocumentStatus polls the signing provider for the latest status.
func (s *DocumentService) RefreshDocumentStatus(ctx context.Context, documentID string) (*entity.DocumentWithRecipients, error) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("finding document: %w", err)
	}

	if !doc.HasSignerInfo() {
		return nil, fmt.Errorf("document has not been sent to signing provider")
	}

	if doc.IsTerminal() {
		return s.documentRepo.FindByIDWithRecipients(ctx, documentID)
	}

	oldStatus := string(doc.Status)

	statusResult, err := s.signingProvider.GetDocumentStatus(ctx, *doc.SignerDocumentID)
	if err != nil {
		return nil, fmt.Errorf("getting document status: %w", err)
	}

	if err := s.updateDocumentFromStatus(ctx, doc, statusResult); err != nil {
		return nil, err
	}

	if err := s.updateRecipientsFromStatus(ctx, documentID, statusResult.Recipients); err != nil {
		return nil, err
	}

	s.eventEmitter.EmitDocumentEvent(ctx, documentID, entity.EventStatusRefreshed, entity.ActorSystem, "", oldStatus, string(doc.Status), nil)

	return s.documentRepo.FindByIDWithRecipients(ctx, documentID)
}

// updateDocumentFromStatus updates the document with status from the signing provider.
func (s *DocumentService) updateDocumentFromStatus(ctx context.Context, doc *entity.Document, statusResult *port.DocumentStatusResult) error {
	if err := doc.UpdateStatus(statusResult.Status); err != nil {
		slog.WarnContext(ctx, "failed to update document status", slog.String("error", err.Error()))
	}

	if statusResult.CompletedPDFURL != nil {
		doc.SetCompletedPDFURL(*statusResult.CompletedPDFURL)
	}

	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	if doc.IsCompleted() {
		s.downloadAndStorePDF(ctx, doc)
	}

	return nil
}

// updateRecipientsFromStatus updates recipients with their statuses from the signing provider.
func (s *DocumentService) updateRecipientsFromStatus(ctx context.Context, documentID string, recipientStatuses []port.RecipientStatusResult) error {
	recipients, err := s.recipientRepo.FindByDocumentID(ctx, documentID)
	if err != nil {
		return fmt.Errorf("finding recipients: %w", err)
	}

	for _, recipientStatus := range recipientStatuses {
		s.updateSingleRecipientFromStatus(ctx, recipients, recipientStatus)
	}

	return nil
}

// updateSingleRecipientFromStatus updates a single recipient's status.
func (s *DocumentService) updateSingleRecipientFromStatus(ctx context.Context, recipients []*entity.DocumentRecipient, status port.RecipientStatusResult) {
	for _, recipient := range recipients {
		if recipient.SignerRecipientID == nil || *recipient.SignerRecipientID != status.ProviderRecipientID {
			continue
		}

		if err := recipient.UpdateStatus(status.Status); err != nil {
			slog.WarnContext(ctx, "failed to update recipient status", slog.String("error", err.Error()))
		}
		if status.SignedAt != nil {
			recipient.SignedAt = status.SignedAt
		}
		if err := s.recipientRepo.Update(ctx, recipient); err != nil {
			slog.WarnContext(ctx, "failed to update recipient", slog.String("error", err.Error()))
		}
		break
	}
}

// CancelDocument cancels/voids a document that is pending signatures.
func (s *DocumentService) CancelDocument(ctx context.Context, documentID string) error {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		return fmt.Errorf("finding document: %w", err)
	}

	oldStatus := string(doc.Status)

	if doc.IsTerminal() {
		return fmt.Errorf("cannot cancel document in terminal state: %s", doc.Status)
	}

	if doc.HasSignerInfo() {
		if err := s.signingProvider.CancelDocument(ctx, *doc.SignerDocumentID); err != nil {
			return fmt.Errorf("canceling document with provider: %w", err)
		}
	}

	if err := doc.MarkAsVoided(); err != nil {
		return fmt.Errorf("marking document as voided: %w", err)
	}

	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	s.eventEmitter.EmitDocumentEvent(ctx, documentID, entity.EventDocumentCancelled, entity.ActorUser, "", oldStatus, string(entity.DocumentStatusVoided), nil)

	slog.InfoContext(ctx, "document cancelled", slog.String("document_id", documentID))

	return nil
}

// HandleWebhookEvent processes an incoming webhook event from the signing provider.
func (s *DocumentService) HandleWebhookEvent(ctx context.Context, event *port.WebhookEvent) error {
	doc, err := s.documentRepo.FindBySignerDocumentID(ctx, event.ProviderDocumentID)
	if err != nil {
		// Fallback: if externalId was set to our document UUID, try direct lookup
		doc, err = s.documentRepo.FindByID(ctx, event.ProviderDocumentID)
		if err != nil {
			return fmt.Errorf("finding document by provider ID: %w", err)
		}
	}

	slog.InfoContext(ctx, "processing webhook event",
		slog.String("event_type", event.EventType),
		slog.String("document_id", doc.ID),
		slog.String("provider_document_id", event.ProviderDocumentID),
	)

	s.eventEmitter.EmitDocumentEvent(ctx, doc.ID, entity.EventWebhookReceived, entity.ActorWebhook, "", "", "", json.RawMessage(event.RawPayload))

	oldStatus := string(doc.Status)

	if err := s.processDocumentStatusFromWebhook(ctx, doc, event); err != nil {
		return err
	}

	if event.DocumentStatus != nil && string(*event.DocumentStatus) != oldStatus {
		s.eventEmitter.EmitDocumentEvent(ctx, doc.ID, eventTypeFromDocumentStatus(*event.DocumentStatus), entity.ActorWebhook, "", oldStatus, string(*event.DocumentStatus), nil)
	}

	if event.ProviderRecipientID != "" && event.RecipientStatus != nil {
		s.processRecipientStatusFromWebhook(ctx, doc, event)
	}

	return nil
}

// processDocumentStatusFromWebhook updates document status from webhook event.
func (s *DocumentService) processDocumentStatusFromWebhook(ctx context.Context, doc *entity.Document, event *port.WebhookEvent) error {
	if event.DocumentStatus != nil {
		if err := doc.UpdateStatus(*event.DocumentStatus); err != nil {
			slog.WarnContext(ctx, "failed to update document status from webhook",
				slog.String("error", err.Error()),
				slog.String("current_status", doc.Status.String()),
				slog.String("new_status", event.DocumentStatus.String()),
			)
		}
	}

	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	if doc.IsCompleted() {
		s.downloadAndStorePDF(ctx, doc)
	}

	return nil
}

// processRecipientStatusFromWebhook processes recipient-specific webhook events.
func (s *DocumentService) processRecipientStatusFromWebhook(ctx context.Context, doc *entity.Document, event *port.WebhookEvent) {
	recipient, err := s.recipientRepo.FindBySignerRecipientID(ctx, event.ProviderRecipientID)
	if err != nil {
		slog.WarnContext(ctx, "recipient not found for webhook event",
			slog.String("provider_recipient_id", event.ProviderRecipientID),
		)
		return
	}

	if err := recipient.UpdateStatus(*event.RecipientStatus); err != nil {
		slog.WarnContext(ctx, "failed to update recipient status from webhook", slog.String("error", err.Error()))
	}
	if err := s.recipientRepo.Update(ctx, recipient); err != nil {
		slog.WarnContext(ctx, "failed to update recipient", slog.String("error", err.Error()))
	}

	s.updateDocumentStatusFromRecipient(ctx, doc, *event.RecipientStatus)
}

// updateDocumentStatusFromRecipient updates document status based on recipient status changes.
func (s *DocumentService) updateDocumentStatusFromRecipient(ctx context.Context, doc *entity.Document, recipientStatus entity.RecipientStatus) {
	switch recipientStatus {
	case entity.RecipientStatusSigned:
		allSigned, err := s.recipientRepo.AllSigned(ctx, doc.ID)
		if err != nil || !allSigned {
			return
		}
		if err := doc.MarkAsCompleted(); err == nil {
			_ = s.documentRepo.Update(ctx, doc)
			s.downloadAndStorePDF(ctx, doc)
		}

	case entity.RecipientStatusDeclined:
		if err := doc.MarkAsDeclined(); err == nil {
			_ = s.documentRepo.Update(ctx, doc)
		}
	}
}

// ProcessPendingDocuments polls the signing provider for documents that need status updates.
func (s *DocumentService) ProcessPendingDocuments(ctx context.Context, limit int) error {
	docs, err := s.documentRepo.FindPendingForPolling(ctx, limit)
	if err != nil {
		return fmt.Errorf("finding pending documents: %w", err)
	}

	for _, doc := range docs {
		if _, err := s.RefreshDocumentStatus(ctx, doc.ID); err != nil {
			slog.WarnContext(ctx, "failed to refresh document status",
				slog.String("document_id", doc.ID),
				slog.String("error", err.Error()),
			)
		}
	}

	return nil
}

// GetDocumentsByExternalRef finds documents by the client's external reference ID.
func (s *DocumentService) GetDocumentsByExternalRef(ctx context.Context, workspaceID, externalRef string) ([]*entity.Document, error) {
	return s.documentRepo.FindByClientExternalRef(ctx, workspaceID, externalRef)
}

// GetDocumentRecipients retrieves all recipients for a document with their role information.
func (s *DocumentService) GetDocumentRecipients(ctx context.Context, documentID string) ([]*entity.DocumentRecipientWithRole, error) {
	return s.recipientRepo.FindByDocumentIDWithRoles(ctx, documentID)
}

// GetDocumentStatistics returns document statistics for a workspace.
func (s *DocumentService) GetDocumentStatistics(ctx context.Context, workspaceID string) (*documentuc.DocumentStatistics, error) {
	total, err := s.documentRepo.CountByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("counting documents: %w", err)
	}

	pending, err := s.documentRepo.CountByStatus(ctx, workspaceID, entity.DocumentStatusPending)
	if err != nil {
		return nil, fmt.Errorf("counting pending documents: %w", err)
	}

	inProgress, err := s.documentRepo.CountByStatus(ctx, workspaceID, entity.DocumentStatusInProgress)
	if err != nil {
		return nil, fmt.Errorf("counting in-progress documents: %w", err)
	}

	completed, err := s.documentRepo.CountByStatus(ctx, workspaceID, entity.DocumentStatusCompleted)
	if err != nil {
		return nil, fmt.Errorf("counting completed documents: %w", err)
	}

	declined, err := s.documentRepo.CountByStatus(ctx, workspaceID, entity.DocumentStatusDeclined)
	if err != nil {
		return nil, fmt.Errorf("counting declined documents: %w", err)
	}

	return &documentuc.DocumentStatistics{
		Total:      total,
		Pending:    pending,
		InProgress: inProgress,
		Completed:  completed,
		Declined:   declined,
		ByStatus: map[string]int{
			entity.DocumentStatusPending.String():    pending,
			entity.DocumentStatusInProgress.String(): inProgress,
			entity.DocumentStatusCompleted.String():  completed,
			entity.DocumentStatusDeclined.String():   declined,
		},
	}, nil
}

// downloadAndStorePDF downloads the signed PDF from the provider and stores it locally.
func (s *DocumentService) downloadAndStorePDF(ctx context.Context, doc *entity.Document) {
	if !doc.HasSignerInfo() {
		return
	}
	if doc.PDFStoragePath != nil {
		return
	}

	pdfData, err := s.signingProvider.DownloadSignedPDF(ctx, *doc.SignerDocumentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to download signed PDF",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		return
	}

	storageKey := fmt.Sprintf("documents/%s/%s/signed.pdf", doc.WorkspaceID, doc.ID)

	if err := s.storageAdapter.Upload(ctx, storageKey, pdfData, "application/pdf"); err != nil {
		slog.WarnContext(ctx, "failed to store signed PDF",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		return
	}

	doc.SetPDFPath(storageKey)
	if err := s.documentRepo.Update(ctx, doc); err != nil {
		slog.WarnContext(ctx, "failed to update document PDF path",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
	}

	slog.InfoContext(ctx, "signed PDF stored",
		slog.String("document_id", doc.ID),
		slog.String("storage_key", storageKey),
	)
}

// GetDocumentPDF returns the signed PDF for a completed document.
func (s *DocumentService) GetDocumentPDF(ctx context.Context, documentID string) ([]byte, string, error) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		return nil, "", fmt.Errorf("finding document: %w", err)
	}

	if doc.PDFStoragePath == nil {
		return nil, "", fmt.Errorf("signed PDF not available for this document")
	}

	data, err := s.storageAdapter.Download(ctx, *doc.PDFStoragePath)
	if err != nil {
		return nil, "", fmt.Errorf("downloading PDF from storage: %w", err)
	}

	filename := fmt.Sprintf("document-%s-signed.pdf", doc.ID)
	if doc.Title != nil {
		filename = fmt.Sprintf("%s-signed.pdf", *doc.Title)
	}

	return data, filename, nil
}

// ExpireDocuments finds and expires documents that have passed their expiration time.
func (s *DocumentService) ExpireDocuments(ctx context.Context, limit int) error {
	docs, err := s.documentRepo.FindExpired(ctx, limit)
	if err != nil {
		return fmt.Errorf("finding expired documents: %w", err)
	}

	for _, doc := range docs {
		s.expireSingleDocument(ctx, doc)
	}

	if len(docs) > 0 {
		slog.InfoContext(ctx, "expired documents processed", slog.Int("count", len(docs)))
	}

	return nil
}

// expireSingleDocument expires a single document and cancels it with the provider.
func (s *DocumentService) expireSingleDocument(ctx context.Context, doc *entity.Document) {
	oldStatus := string(doc.Status)

	if doc.HasSignerInfo() {
		if err := s.signingProvider.CancelDocument(ctx, *doc.SignerDocumentID); err != nil {
			slog.WarnContext(ctx, "failed to cancel expired document with provider",
				slog.String("document_id", doc.ID),
				slog.String("error", err.Error()),
			)
		}
	}

	if err := doc.MarkAsExpired(); err != nil {
		slog.WarnContext(ctx, "failed to mark document as expired",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		return
	}

	if err := s.documentRepo.Update(ctx, doc); err != nil {
		slog.WarnContext(ctx, "failed to update expired document",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		return
	}

	s.eventEmitter.EmitDocumentEvent(ctx, doc.ID, entity.EventDocumentExpired, entity.ActorSystem, "", oldStatus, string(entity.DocumentStatusExpired), nil)

	slog.InfoContext(ctx, "document expired",
		slog.String("document_id", doc.ID),
		slog.String("previous_status", oldStatus),
	)
}

// RetryErrorDocuments finds ERROR documents eligible for retry and attempts recovery.
func (s *DocumentService) RetryErrorDocuments(ctx context.Context, maxRetries, limit int) error {
	docs, err := s.documentRepo.FindErrorsForRetry(ctx, maxRetries, limit)
	if err != nil {
		return fmt.Errorf("finding error documents for retry: %w", err)
	}

	for _, doc := range docs {
		s.retrySingleDocument(ctx, doc, maxRetries)
	}

	if len(docs) > 0 {
		slog.InfoContext(ctx, "retried error documents", slog.Int("count", len(docs)))
	}

	return nil
}

// retrySingleDocument attempts to recover a single error document.
func (s *DocumentService) retrySingleDocument(ctx context.Context, doc *entity.Document, maxRetries int) {
	if !doc.ScheduleRetry(maxRetries) {
		slog.WarnContext(ctx, "document exceeded max retries",
			slog.String("document_id", doc.ID),
			slog.Int("retry_count", doc.RetryCount),
		)
		return
	}

	if doc.HasSignerInfo() {
		s.retryWithStatusPoll(ctx, doc)
	} else {
		s.retryWithResend(ctx, doc)
	}
}

// retryWithStatusPoll polls the signing provider for a document that already has a signer ID.
func (s *DocumentService) retryWithStatusPoll(ctx context.Context, doc *entity.Document) {
	statusResult, err := s.signingProvider.GetDocumentStatus(ctx, *doc.SignerDocumentID)
	if err != nil {
		slog.WarnContext(ctx, "retry status poll failed",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		if updateErr := s.documentRepo.Update(ctx, doc); updateErr != nil {
			slog.WarnContext(ctx, "failed to update document after retry", slog.String("error", updateErr.Error()))
		}
		return
	}

	if err := s.updateDocumentFromStatus(ctx, doc, statusResult); err != nil {
		slog.WarnContext(ctx, "failed to update document from status poll",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		return
	}

	if !doc.IsTerminal() {
		doc.ResetRetry()
	}
	if err := s.documentRepo.Update(ctx, doc); err != nil {
		slog.WarnContext(ctx, "failed to update document after retry recovery",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
	}
}

// retryWithResend re-renders the PDF and re-uploads to the signing provider.
func (s *DocumentService) retryWithResend(ctx context.Context, doc *entity.Document) {
	version, recipients, roleMap, err := s.loadRetryContext(ctx, doc)
	if err != nil {
		slog.WarnContext(ctx, "retry: failed to load context",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		_ = s.documentRepo.Update(ctx, doc)
		return
	}

	cmd := s.buildRetryCommand(doc, recipients)

	pdfData, err := s.renderPDF(ctx, version, cmd)
	if err != nil {
		slog.WarnContext(ctx, "retry: failed to render PDF",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		_ = s.documentRepo.Update(ctx, doc)
		return
	}

	if err := s.sendToSigningProvider(ctx, doc, recipients, roleMap, cmd, pdfData); err != nil {
		slog.WarnContext(ctx, "retry: failed to send to signing provider",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
		return
	}

	doc.ResetRetry()
	if err := s.documentRepo.Update(ctx, doc); err != nil {
		slog.WarnContext(ctx, "retry: failed to update document after resend",
			slog.String("document_id", doc.ID),
			slog.String("error", err.Error()),
		)
	}

	slog.InfoContext(ctx, "document re-sent successfully after retry",
		slog.String("document_id", doc.ID),
		slog.Int("retry_count", doc.RetryCount),
	)
}

// loadRetryContext loads all dependencies needed for a document retry.
func (s *DocumentService) loadRetryContext(ctx context.Context, doc *entity.Document) (*entity.TemplateVersion, []*entity.DocumentRecipient, map[string]*entity.TemplateVersionSignerRole, error) {
	version, err := s.versionRepo.FindByID(ctx, doc.TemplateVersionID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("finding template version: %w", err)
	}

	recipients, err := s.recipientRepo.FindByDocumentID(ctx, doc.ID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("finding recipients: %w", err)
	}

	signerRoles, err := s.signerRoleRepo.FindByVersionID(ctx, doc.TemplateVersionID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("finding signer roles: %w", err)
	}

	roleMap := make(map[string]*entity.TemplateVersionSignerRole, len(signerRoles))
	for _, role := range signerRoles {
		roleMap[role.ID] = role
	}

	return version, recipients, roleMap, nil
}

// buildRetryCommand reconstructs a CreateDocumentCommand from an existing document and recipients.
func (s *DocumentService) buildRetryCommand(doc *entity.Document, recipients []*entity.DocumentRecipient) documentuc.CreateDocumentCommand {
	var injectedValues map[string]any
	if doc.InjectedValuesSnapshot != nil {
		_ = json.Unmarshal(doc.InjectedValuesSnapshot, &injectedValues)
	}

	cmdRecipients := make([]documentuc.DocumentRecipientCommand, len(recipients))
	for i, r := range recipients {
		cmdRecipients[i] = documentuc.DocumentRecipientCommand{
			RoleID: r.TemplateVersionRoleID,
			Name:   r.Name,
			Email:  r.Email,
		}
	}

	title := ""
	if doc.Title != nil {
		title = *doc.Title
	}

	return documentuc.CreateDocumentCommand{
		WorkspaceID:               doc.WorkspaceID,
		TemplateVersionID:         doc.TemplateVersionID,
		Title:                     title,
		InjectedValues:            injectedValues,
		Recipients:                cmdRecipients,
		ClientExternalReferenceID: doc.ClientExternalReferenceID,
	}
}

// CreateDocumentsBatch creates multiple documents in a single batch.
func (s *DocumentService) CreateDocumentsBatch(ctx context.Context, cmds []documentuc.CreateDocumentCommand) ([]documentuc.BatchDocumentResult, error) {
	results := make([]documentuc.BatchDocumentResult, len(cmds))

	for i, cmd := range cmds {
		doc, err := s.CreateAndSendDocument(ctx, cmd)
		results[i] = documentuc.BatchDocumentResult{
			Index:    i,
			Document: doc,
			Error:    err,
		}
	}

	return results, nil
}

// eventTypeFromDocumentStatus maps a document status to the corresponding event type.
func eventTypeFromDocumentStatus(status entity.DocumentStatus) string {
	switch status {
	case entity.DocumentStatusCompleted:
		return entity.EventDocumentCompleted
	case entity.DocumentStatusVoided:
		return entity.EventDocumentCancelled
	case entity.DocumentStatusExpired:
		return entity.EventDocumentExpired
	case entity.DocumentStatusError:
		return entity.EventDocumentError
	default:
		return entity.EventStatusRefreshed
	}
}

// SendReminder sends reminder notifications to pending recipients of a document.
func (s *DocumentService) SendReminder(ctx context.Context, documentID string) error {
	return s.notificationSvc.SendReminder(ctx, documentID)
}

// parsePortableDocument is a helper to parse document content.
func parsePortableDocument(content json.RawMessage) (*portabledoc.Document, error) {
	return portabledoc.Parse(content)
}

// Verify DocumentService implements DocumentUseCase
var _ documentuc.DocumentUseCase = (*DocumentService)(nil)
