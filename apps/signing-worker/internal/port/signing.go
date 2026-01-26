package port

import "context"

// SigningProvider defines the interface for external document signing services.
type SigningProvider interface {
	// Name returns the provider name (e.g., "documenso").
	Name() string

	// UploadDocument uploads a PDF document to the signing provider.
	UploadDocument(ctx context.Context, req *UploadRequest) (*UploadResult, error)

	// CancelDocument cancels a document that is pending signatures.
	CancelDocument(ctx context.Context, signerDocID string) error

	// ResendNotification resends notification to a specific recipient.
	ResendNotification(ctx context.Context, signerDocID string, recipientID string) error
}

// UploadRequest contains the data needed to upload a document for signing.
type UploadRequest struct {
	PDF             []byte
	Title           string
	ExternalRef     string
	Recipients      []SigningRecipient
	SignatureFields []SignatureFieldPosition
}

// SigningRecipient represents a person who needs to sign the document.
type SigningRecipient struct {
	Email       string
	Name        string
	RoleID      string
	SignerOrder int
}

// SignatureFieldPosition contains the position and size of a signature field.
type SignatureFieldPosition struct {
	RoleID    string
	Page      int
	PositionX float64
	PositionY float64
	Width     float64
	Height    float64
}

// UploadResult contains the result of uploading a document.
type UploadResult struct {
	ProviderDocumentID string
	ProviderName       string
	Recipients         []RecipientResult
}

// RecipientResult contains the provider's response for a single recipient.
type RecipientResult struct {
	RoleID              string
	ProviderRecipientID string
	SigningURL          string
}
