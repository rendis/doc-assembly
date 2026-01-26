package operation

import (
	"context"
	"fmt"

	"github.com/doc-assembly/signing-worker/internal/port"
)

const (
	// StatusPendingProvider is the status for documents waiting to be uploaded.
	StatusPendingProvider = "PENDING_PROVIDER"
	// StatusPending is the status for documents uploaded to the provider.
	StatusPending = "PENDING"
	// StatusError is the status for documents with errors.
	StatusError = "ERROR"
	// RecipientStatusSent is the status for recipients after notification sent.
	RecipientStatusSent = "SENT"
)

// UploadStrategy handles uploading documents to the signing provider.
type UploadStrategy struct{}

// OperationType returns the status this strategy handles.
func (s *UploadStrategy) OperationType() string {
	return StatusPendingProvider
}

// Execute uploads the document to the signing provider.
func (s *UploadStrategy) Execute(
	ctx context.Context,
	doc *port.Document,
	provider port.SigningProvider,
	storage port.StorageAdapter,
) (*port.OperationResult, error) {
	// Validate document has PDF path
	if doc.PDFStoragePath == nil || *doc.PDFStoragePath == "" {
		return &port.OperationResult{
			NewStatus:    StatusError,
			ErrorMessage: "document has no PDF storage path",
		}, fmt.Errorf("document %s has no PDF storage path", doc.ID)
	}

	// Download PDF from storage
	pdfData, err := storage.Download(ctx, *doc.PDFStoragePath)
	if err != nil {
		return &port.OperationResult{
			NewStatus:    StatusError,
			ErrorMessage: fmt.Sprintf("failed to download PDF: %v", err),
		}, fmt.Errorf("downloading PDF: %w", err)
	}

	// Build upload request
	uploadReq := s.buildUploadRequest(doc, pdfData)

	// Upload to signing provider
	result, err := provider.UploadDocument(ctx, uploadReq)
	if err != nil {
		return &port.OperationResult{
			NewStatus:    StatusError,
			ErrorMessage: fmt.Sprintf("failed to upload to provider: %v", err),
		}, fmt.Errorf("uploading to provider: %w", err)
	}

	// Build operation result
	return s.buildOperationResult(doc, result), nil
}

// buildUploadRequest creates an upload request from the document.
func (s *UploadStrategy) buildUploadRequest(doc *port.Document, pdfData []byte) *port.UploadRequest {
	title := fmt.Sprintf("Document %s", doc.ID.String()[:8])
	if doc.Title != nil && *doc.Title != "" {
		title = *doc.Title
	}

	externalRef := doc.ID.String()
	if doc.ClientExternalReferenceID != nil && *doc.ClientExternalReferenceID != "" {
		externalRef = *doc.ClientExternalReferenceID
	}

	recipients := make([]port.SigningRecipient, 0, len(doc.Recipients))
	for _, r := range doc.Recipients {
		recipients = append(recipients, port.SigningRecipient{
			Email:       r.Email,
			Name:        r.Name,
			RoleID:      r.TemplateVersionRoleID,
			SignerOrder: r.SignerOrder,
		})
	}

	return &port.UploadRequest{
		PDF:         pdfData,
		Title:       title,
		ExternalRef: externalRef,
		Recipients:  recipients,
	}
}

// buildOperationResult creates an operation result from the upload result.
func (s *UploadStrategy) buildOperationResult(doc *port.Document, result *port.UploadResult) *port.OperationResult {
	recipientUpdates := make([]port.RecipientUpdate, 0, len(result.Recipients))

	// Create a map of role ID to recipient for faster lookup
	recipientByRole := make(map[string]*port.DocumentRecipient, len(doc.Recipients))
	for i := range doc.Recipients {
		recipientByRole[doc.Recipients[i].TemplateVersionRoleID] = &doc.Recipients[i]
	}

	for _, pr := range result.Recipients {
		recipient, ok := recipientByRole[pr.RoleID]
		if !ok {
			continue
		}

		recipientUpdates = append(recipientUpdates, port.RecipientUpdate{
			RecipientID:       recipient.ID,
			SignerRecipientID: pr.ProviderRecipientID,
			SigningURL:        pr.SigningURL,
			NewStatus:         RecipientStatusSent,
		})
	}

	return &port.OperationResult{
		NewStatus:        StatusPending,
		SignerDocumentID: result.ProviderDocumentID,
		RecipientUpdates: recipientUpdates,
	}
}
