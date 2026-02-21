package document

import "context"

// DocumentAccessUseCase defines the input port for public document access operations.
// These operations power the email-verification gate for public signing.
type DocumentAccessUseCase interface {
	// GetPublicDocumentInfo returns minimal public info about a document (title, status).
	GetPublicDocumentInfo(ctx context.Context, documentID string) (*PublicDocumentInfoResponse, error)

	// RequestAccess validates email against document recipients and sends an access link.
	// Always returns nil to prevent email enumeration.
	RequestAccess(ctx context.Context, documentID, email string) error
}

// PublicDocumentInfoResponse contains minimal info exposed on the public access page.
type PublicDocumentInfoResponse struct {
	DocumentID    string `json:"documentId"`
	DocumentTitle string `json:"documentTitle"`
	Status        string `json:"status"` // "active", "completed", "expired"
}
