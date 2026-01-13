package document

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

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
) documentuc.DocumentUseCase {
	return &DocumentService{
		documentRepo:    documentRepo,
		recipientRepo:   recipientRepo,
		versionRepo:     versionRepo,
		signerRoleRepo:  signerRoleRepo,
		pdfRenderer:     pdfRenderer,
		signingProvider: signingProvider,
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
}

// CreateAndSendDocument creates a document, generates the PDF, and sends it for signing.
func (s *DocumentService) CreateAndSendDocument(ctx context.Context, cmd documentuc.CreateDocumentCommand) (*entity.DocumentWithRecipients, error) {
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

// createDocument creates and persists the document entity.
func (s *DocumentService) createDocument(ctx context.Context, cmd documentuc.CreateDocumentCommand) (*entity.Document, error) {
	document := entity.NewDocument(cmd.WorkspaceID, cmd.TemplateVersionID)
	document.ID = uuid.NewString()
	document.SetTitle(cmd.Title)

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

	uploadReq := &port.UploadDocumentRequest{
		PDF:         pdfData,
		Title:       cmd.Title,
		Recipients:  signingRecipients,
		ExternalRef: document.ID,
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

	if err := s.documentRepo.Update(ctx, document); err != nil {
		return fmt.Errorf("updating document: %w", err)
	}

	s.updateRecipientsWithProviderIDs(ctx, recipients, uploadResult.Recipients)

	return nil
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

	slog.InfoContext(ctx, "document cancelled", slog.String("document_id", documentID))

	return nil
}

// HandleWebhookEvent processes an incoming webhook event from the signing provider.
func (s *DocumentService) HandleWebhookEvent(ctx context.Context, event *port.WebhookEvent) error {
	doc, err := s.documentRepo.FindBySignerDocumentID(ctx, event.ProviderDocumentID)
	if err != nil {
		return fmt.Errorf("finding document by provider ID: %w", err)
	}

	slog.InfoContext(ctx, "processing webhook event",
		slog.String("event_type", event.EventType),
		slog.String("document_id", doc.ID),
		slog.String("provider_document_id", event.ProviderDocumentID),
	)

	if err := s.processDocumentStatusFromWebhook(ctx, doc, event); err != nil {
		return err
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

// parsePortableDocument is a helper to parse document content.
func parsePortableDocument(content json.RawMessage) (*portabledoc.Document, error) {
	return portabledoc.Parse(content)
}

// Verify DocumentService implements DocumentUseCase
var _ documentuc.DocumentUseCase = (*DocumentService)(nil)
