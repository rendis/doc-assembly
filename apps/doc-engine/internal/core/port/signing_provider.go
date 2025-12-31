package port

import (
	"context"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// SigningProvider defines the interface for external document signing services.
// Implementations handle the specifics of each provider (Documenso, DocuSign, PandaDoc, etc.)
// while exposing a unified interface to the application.
type SigningProvider interface {
	// UploadDocument uploads a PDF document to the signing provider and creates
	// a signing envelope/request. Returns the provider's document ID and recipient IDs.
	UploadDocument(ctx context.Context, req *UploadDocumentRequest) (*UploadDocumentResult, error)

	// GetSigningURL returns the URL where a specific recipient can sign the document.
	GetSigningURL(ctx context.Context, req *GetSigningURLRequest) (*GetSigningURLResult, error)

	// GetDocumentStatus retrieves the current status of a document from the provider.
	GetDocumentStatus(ctx context.Context, providerDocumentID string) (*DocumentStatusResult, error)

	// CancelDocument cancels/voids a document that is pending signatures.
	CancelDocument(ctx context.Context, providerDocumentID string) error

	// ProviderName returns the name of this signing provider (e.g., "documenso", "docusign").
	ProviderName() string
}

// UploadDocumentRequest contains the data needed to upload a document for signing.
type UploadDocumentRequest struct {
	// PDF is the raw PDF bytes of the document to be signed.
	PDF []byte

	// Title is the display name for the document in the signing provider.
	Title string

	// Recipients is the list of people who need to sign the document.
	Recipients []SigningRecipient

	// ExternalRef is an optional external reference ID (e.g., CRM ID) for tracking.
	ExternalRef string

	// WebhookURL is the URL where the provider should send status updates.
	// Leave empty to use the default configured webhook URL.
	WebhookURL string

	// Metadata contains optional key-value pairs to attach to the document.
	Metadata map[string]string
}

// SigningRecipient represents a person who needs to sign the document.
type SigningRecipient struct {
	// Email is the recipient's email address.
	Email string

	// Name is the recipient's display name.
	Name string

	// RoleID is the internal role ID (template_version_role_id) for this recipient.
	RoleID string

	// SignerOrder determines the signing sequence (1-based). Lower numbers sign first.
	SignerOrder int
}

// UploadDocumentResult contains the result of uploading a document.
type UploadDocumentResult struct {
	// ProviderDocumentID is the unique ID assigned by the signing provider.
	ProviderDocumentID string

	// ProviderName is the name of the signing provider (e.g., "documenso").
	ProviderName string

	// Recipients contains the provider-assigned IDs for each recipient.
	Recipients []RecipientResult

	// Status is the initial status of the document.
	Status entity.DocumentStatus
}

// RecipientResult contains the provider's response for a single recipient.
type RecipientResult struct {
	// RoleID is the internal role ID that was provided in the request.
	RoleID string

	// ProviderRecipientID is the unique ID assigned by the signing provider.
	ProviderRecipientID string

	// Status is the initial status of this recipient.
	Status entity.RecipientStatus
}

// GetSigningURLRequest contains the data needed to get a signing URL.
type GetSigningURLRequest struct {
	// ProviderDocumentID is the document ID from the signing provider.
	ProviderDocumentID string

	// ProviderRecipientID is the recipient ID from the signing provider.
	ProviderRecipientID string
}

// GetSigningURLResult contains the signing URL for a recipient.
type GetSigningURLResult struct {
	// SigningURL is the URL where the recipient can sign.
	SigningURL string

	// ExpiresAt is when the signing URL expires (optional, provider-dependent).
	ExpiresAt *time.Time
}

// DocumentStatusResult contains the current status of a document.
type DocumentStatusResult struct {
	// Status is the overall document status.
	Status entity.DocumentStatus

	// Recipients contains the current status of each recipient.
	Recipients []RecipientStatusResult

	// CompletedPDFURL is the URL to download the signed document (available when completed).
	CompletedPDFURL *string

	// ProviderStatus is the raw status string from the provider (for debugging).
	ProviderStatus string
}

// RecipientStatusResult contains the current status of a recipient.
type RecipientStatusResult struct {
	// ProviderRecipientID is the recipient ID from the signing provider.
	ProviderRecipientID string

	// Status is the current recipient status.
	Status entity.RecipientStatus

	// SignedAt is when the recipient signed (nil if not yet signed).
	SignedAt *time.Time

	// ProviderStatus is the raw status string from the provider (for debugging).
	ProviderStatus string
}

// WebhookEvent represents an incoming webhook event from a signing provider.
type WebhookEvent struct {
	// EventType is the type of event (e.g., "document.signed", "document.completed").
	EventType string

	// ProviderDocumentID is the document ID from the provider.
	ProviderDocumentID string

	// ProviderRecipientID is the recipient ID (if the event is recipient-specific).
	ProviderRecipientID string

	// DocumentStatus is the new document status (if applicable).
	DocumentStatus *entity.DocumentStatus

	// RecipientStatus is the new recipient status (if applicable).
	RecipientStatus *entity.RecipientStatus

	// Timestamp is when the event occurred.
	Timestamp time.Time

	// RawPayload is the original webhook payload for debugging.
	RawPayload []byte
}

// WebhookHandler defines the interface for processing webhook events.
type WebhookHandler interface {
	// ParseWebhook parses and validates an incoming webhook request.
	// Returns the parsed event or an error if the signature is invalid.
	ParseWebhook(ctx context.Context, body []byte, signature string) (*WebhookEvent, error)
}
