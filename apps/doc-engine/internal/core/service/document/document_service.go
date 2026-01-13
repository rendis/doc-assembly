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
	// Validate template version exists and is published
	version, err := s.versionRepo.FindByID(ctx, cmd.TemplateVersionID)
	if err != nil {
		return nil, fmt.Errorf("finding template version: %w", err)
	}

	if !version.IsPublished() {
		return nil, fmt.Errorf("template version is not published")
	}

	// Get signer roles for the version
	signerRoles, err := s.signerRoleRepo.FindByVersionID(ctx, cmd.TemplateVersionID)
	if err != nil {
		return nil, fmt.Errorf("finding signer roles: %w", err)
	}

	// Validate recipients match roles
	if len(cmd.Recipients) != len(signerRoles) {
		return nil, fmt.Errorf("recipient count (%d) does not match signer role count (%d)", len(cmd.Recipients), len(signerRoles))
	}

	// Create role map for validation
	roleMap := make(map[string]*entity.TemplateVersionSignerRole)
	for _, role := range signerRoles {
		roleMap[role.ID] = role
	}

	// Validate all recipients have valid roles
	for _, r := range cmd.Recipients {
		if _, ok := roleMap[r.RoleID]; !ok {
			return nil, fmt.Errorf("invalid role ID: %s", r.RoleID)
		}
	}

	// Create document entity
	document := entity.NewDocument(cmd.WorkspaceID, cmd.TemplateVersionID)
	document.ID = uuid.NewString()
	document.SetTitle(cmd.Title)

	if cmd.ClientExternalReferenceID != nil {
		document.SetExternalReference(*cmd.ClientExternalReferenceID)
	}

	// Store injected values snapshot
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

	// Save document
	docID, err := s.documentRepo.Create(ctx, document)
	if err != nil {
		return nil, fmt.Errorf("creating document: %w", err)
	}
	document.ID = docID

	// Create recipients
	recipients := make([]*entity.DocumentRecipient, len(cmd.Recipients))
	for i, r := range cmd.Recipients {
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

	// Build signer role values for PDF rendering
	signerRoleValues := make(map[string]port.SignerRoleValue)
	for _, r := range cmd.Recipients {
		signerRoleValues[r.RoleID] = port.SignerRoleValue{
			Name:  r.Name,
			Email: r.Email,
		}
	}

	// Render PDF
	renderReq := &port.RenderPreviewRequest{
		Injectables:      cmd.InjectedValues,
		SignerRoleValues: signerRoleValues,
	}

	// Parse document content
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

	// Upload to signing provider
	signingRecipients := make([]port.SigningRecipient, len(cmd.Recipients))
	for i, r := range cmd.Recipients {
		role := roleMap[r.RoleID]
		signingRecipients[i] = port.SigningRecipient{
			Email:       r.Email,
			Name:        r.Name,
			RoleID:      r.RoleID,
			SignerOrder: role.SignerOrder,
		}
	}

	uploadReq := &port.UploadDocumentRequest{
		PDF:         renderResult.PDF,
		Title:       cmd.Title,
		Recipients:  signingRecipients,
		ExternalRef: docID,
	}

	if cmd.ClientExternalReferenceID != nil {
		uploadReq.ExternalRef = *cmd.ClientExternalReferenceID
	}

	uploadResult, err := s.signingProvider.UploadDocument(ctx, uploadReq)
	if err != nil {
		// Mark document as error
		_ = document.MarkAsError()
		_ = s.documentRepo.Update(ctx, document)
		return nil, fmt.Errorf("uploading to signing provider: %w", err)
	}

	// Update document with provider info
	document.SetSignerInfo(uploadResult.ProviderName, uploadResult.ProviderDocumentID)
	if err := document.MarkAsPending(); err != nil {
		return nil, fmt.Errorf("marking document as pending: %w", err)
	}

	if err := s.documentRepo.Update(ctx, document); err != nil {
		return nil, fmt.Errorf("updating document: %w", err)
	}

	// Update recipients with provider IDs
	for _, providerRecipient := range uploadResult.Recipients {
		for _, recipient := range recipients {
			if recipient.TemplateVersionRoleID == providerRecipient.RoleID {
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

	slog.InfoContext(ctx, "document created and sent for signing",
		slog.String("document_id", document.ID),
		slog.String("provider_document_id", uploadResult.ProviderDocumentID),
		slog.String("provider", uploadResult.ProviderName),
		slog.Int("recipient_count", len(recipients)),
	)

	return &entity.DocumentWithRecipients{
		Document:   *document,
		Recipients: recipients,
	}, nil
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
		// Document is in a terminal state, no need to refresh
		return s.documentRepo.FindByIDWithRecipients(ctx, documentID)
	}

	statusResult, err := s.signingProvider.GetDocumentStatus(ctx, *doc.SignerDocumentID)
	if err != nil {
		return nil, fmt.Errorf("getting document status: %w", err)
	}

	// Update document status
	if err := doc.UpdateStatus(statusResult.Status); err != nil {
		slog.WarnContext(ctx, "failed to update document status", slog.String("error", err.Error()))
	}

	if statusResult.CompletedPDFURL != nil {
		doc.SetCompletedPDFURL(*statusResult.CompletedPDFURL)
	}

	if err := s.documentRepo.Update(ctx, doc); err != nil {
		return nil, fmt.Errorf("updating document: %w", err)
	}

	// Update recipient statuses
	recipients, err := s.recipientRepo.FindByDocumentID(ctx, documentID)
	if err != nil {
		return nil, fmt.Errorf("finding recipients: %w", err)
	}

	for _, recipientStatus := range statusResult.Recipients {
		for _, recipient := range recipients {
			if recipient.SignerRecipientID != nil && *recipient.SignerRecipientID == recipientStatus.ProviderRecipientID {
				if err := recipient.UpdateStatus(recipientStatus.Status); err != nil {
					slog.WarnContext(ctx, "failed to update recipient status", slog.String("error", err.Error()))
				}
				if recipientStatus.SignedAt != nil {
					recipient.SignedAt = recipientStatus.SignedAt
				}
				if err := s.recipientRepo.Update(ctx, recipient); err != nil {
					slog.WarnContext(ctx, "failed to update recipient", slog.String("error", err.Error()))
				}
				break
			}
		}
	}

	return s.documentRepo.FindByIDWithRecipients(ctx, documentID)
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

	slog.InfoContext(ctx, "document cancelled",
		slog.String("document_id", documentID),
	)

	return nil
}

// HandleWebhookEvent processes an incoming webhook event from the signing provider.
func (s *DocumentService) HandleWebhookEvent(ctx context.Context, event *port.WebhookEvent) error {
	// Find document by provider document ID
	doc, err := s.documentRepo.FindBySignerDocumentID(ctx, event.ProviderDocumentID)
	if err != nil {
		return fmt.Errorf("finding document by provider ID: %w", err)
	}

	slog.InfoContext(ctx, "processing webhook event",
		slog.String("event_type", event.EventType),
		slog.String("document_id", doc.ID),
		slog.String("provider_document_id", event.ProviderDocumentID),
	)

	// Update document status if provided
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

	// Update recipient status if this is a recipient-specific event
	if event.ProviderRecipientID != "" && event.RecipientStatus != nil {
		recipient, err := s.recipientRepo.FindBySignerRecipientID(ctx, event.ProviderRecipientID)
		if err != nil {
			slog.WarnContext(ctx, "recipient not found for webhook event",
				slog.String("provider_recipient_id", event.ProviderRecipientID),
			)
		} else {
			if err := recipient.UpdateStatus(*event.RecipientStatus); err != nil {
				slog.WarnContext(ctx, "failed to update recipient status from webhook",
					slog.String("error", err.Error()),
				)
			}
			if err := s.recipientRepo.Update(ctx, recipient); err != nil {
				slog.WarnContext(ctx, "failed to update recipient", slog.String("error", err.Error()))
			}
		}

		// Check if we need to update document status based on recipients
		if *event.RecipientStatus == entity.RecipientStatusSigned {
			allSigned, err := s.recipientRepo.AllSigned(ctx, doc.ID)
			if err == nil && allSigned {
				if err := doc.MarkAsCompleted(); err == nil {
					_ = s.documentRepo.Update(ctx, doc)
				}
			}
		} else if *event.RecipientStatus == entity.RecipientStatusDeclined {
			if err := doc.MarkAsDeclined(); err == nil {
				_ = s.documentRepo.Update(ctx, doc)
			}
		}
	}

	return nil
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
