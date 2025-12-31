package usecase

import (
	"context"
	"encoding/json"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// CreateDocumentCommand represents the command to create and send a document for signing.
type CreateDocumentCommand struct {
	WorkspaceID               string
	TemplateVersionID         string
	Title                     string
	ClientExternalReferenceID *string
	InjectedValues            map[string]any
	Recipients                []DocumentRecipientCommand
}

// DocumentRecipientCommand represents a recipient to be added to a document.
type DocumentRecipientCommand struct {
	RoleID string
	Name   string
	Email  string
}

// UpdateDocumentStatusCommand represents the command to update document status from webhook.
type UpdateDocumentStatusCommand struct {
	ProviderDocumentID  string
	ProviderRecipientID string
	DocumentStatus      *entity.DocumentStatus
	RecipientStatus     *entity.RecipientStatus
}

// DocumentUseCase defines the input port for document operations.
type DocumentUseCase interface {
	// CreateAndSendDocument creates a document, generates the PDF, and sends it for signing.
	CreateAndSendDocument(ctx context.Context, cmd CreateDocumentCommand) (*entity.DocumentWithRecipients, error)

	// GetDocument retrieves a document by ID.
	GetDocument(ctx context.Context, id string) (*entity.Document, error)

	// GetDocumentWithRecipients retrieves a document with all its recipients.
	GetDocumentWithRecipients(ctx context.Context, id string) (*entity.DocumentWithRecipients, error)

	// ListDocuments lists documents in a workspace with optional filters.
	ListDocuments(ctx context.Context, workspaceID string, filters port.DocumentFilters) ([]*entity.DocumentListItem, error)

	// GetSigningURL retrieves the signing URL for a specific recipient.
	GetSigningURL(ctx context.Context, documentID, recipientID string) (string, error)

	// RefreshDocumentStatus polls the signing provider for the latest status.
	RefreshDocumentStatus(ctx context.Context, documentID string) (*entity.DocumentWithRecipients, error)

	// CancelDocument cancels/voids a document that is pending signatures.
	CancelDocument(ctx context.Context, documentID string) error

	// HandleWebhookEvent processes an incoming webhook event from the signing provider.
	HandleWebhookEvent(ctx context.Context, event *port.WebhookEvent) error

	// ProcessPendingDocuments polls the signing provider for documents that need status updates.
	// This is used as a fallback/reconciliation mechanism alongside webhooks.
	ProcessPendingDocuments(ctx context.Context, limit int) error

	// GetDocumentsByExternalRef finds documents by the client's external reference ID.
	GetDocumentsByExternalRef(ctx context.Context, workspaceID, externalRef string) ([]*entity.Document, error)

	// GetDocumentRecipients retrieves all recipients for a document with their role information.
	GetDocumentRecipients(ctx context.Context, documentID string) ([]*entity.DocumentRecipientWithRole, error)

	// GetDocumentStatistics returns document statistics for a workspace.
	GetDocumentStatistics(ctx context.Context, workspaceID string) (*DocumentStatistics, error)
}

// DocumentStatistics contains aggregate statistics about documents in a workspace.
type DocumentStatistics struct {
	Total      int                     `json:"total"`
	ByStatus   map[string]int          `json:"byStatus"`
	Pending    int                     `json:"pending"`
	InProgress int                     `json:"inProgress"`
	Completed  int                     `json:"completed"`
	Declined   int                     `json:"declined"`
}

// RenderDocumentRequest contains the data needed to render a document PDF.
type RenderDocumentRequest struct {
	TemplateVersionID string
	InjectedValues    map[string]any
	SignerRoleValues  map[string]port.SignerRoleValue
}

// RenderDocumentResult contains the result of rendering a document PDF.
type RenderDocumentResult struct {
	PDF      []byte
	Filename string
}

// DocumentCreationResult contains the result of creating a document.
type DocumentCreationResult struct {
	Document   *entity.Document
	Recipients []*entity.DocumentRecipient
	PDF        []byte
}

// WebhookEventData represents parsed webhook event data.
type WebhookEventData struct {
	EventType           string          `json:"eventType"`
	ProviderDocumentID  string          `json:"providerDocumentId"`
	ProviderRecipientID string          `json:"providerRecipientId,omitempty"`
	DocumentStatus      *string         `json:"documentStatus,omitempty"`
	RecipientStatus     *string         `json:"recipientStatus,omitempty"`
	Timestamp           string          `json:"timestamp"`
	RawPayload          json.RawMessage `json:"rawPayload,omitempty"`
}
