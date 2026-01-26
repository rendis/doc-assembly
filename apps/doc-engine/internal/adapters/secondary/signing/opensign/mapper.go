package opensign

import (
	"strings"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// OpenSignStatus represents the status values from OpenSign API.
type OpenSignStatus string

const (
	StatusDraft      OpenSignStatus = "draft"
	StatusPending    OpenSignStatus = "pending"
	StatusInProgress OpenSignStatus = "in-progress"
	StatusCompleted  OpenSignStatus = "completed"
	StatusDeclined   OpenSignStatus = "declined"
	StatusRevoked    OpenSignStatus = "revoked"
	StatusExpired    OpenSignStatus = "expired"
)

// MapDocumentStatus maps OpenSign document status to internal DocumentStatus.
func MapDocumentStatus(status string) entity.DocumentStatus {
	switch OpenSignStatus(strings.ToLower(status)) {
	case StatusDraft:
		return entity.DocumentStatusDraft
	case StatusPending:
		return entity.DocumentStatusPending
	case StatusInProgress:
		return entity.DocumentStatusInProgress
	case StatusCompleted:
		return entity.DocumentStatusCompleted
	case StatusDeclined:
		return entity.DocumentStatusDeclined
	case StatusRevoked:
		return entity.DocumentStatusVoided
	case StatusExpired:
		return entity.DocumentStatusExpired
	default:
		return entity.DocumentStatusPending
	}
}

// MapRecipientStatus derives recipient status from audit trail and document status.
func MapRecipientStatus(audit *AuditEntry, docStatus string) entity.RecipientStatus {
	if audit == nil {
		return entity.RecipientStatusPending
	}

	// If signed timestamp exists, recipient has signed
	if audit.Signed != "" {
		return entity.RecipientStatusSigned
	}

	// If viewed timestamp exists, recipient has opened the document
	if audit.Viewed != "" {
		return entity.RecipientStatusDelivered
	}

	// Check document-level status for declined
	if strings.ToLower(docStatus) == string(StatusDeclined) {
		return entity.RecipientStatusDeclined
	}

	return entity.RecipientStatusSent
}

// WebhookEventMapping maps webhook events to status updates.
type WebhookEventMapping struct {
	DocumentStatus  *entity.DocumentStatus
	RecipientStatus *entity.RecipientStatus
}

// MapWebhookEvent maps an OpenSign webhook event type to status updates.
func MapWebhookEvent(eventType string) WebhookEventMapping {
	mapping := WebhookEventMapping{}

	switch strings.ToLower(eventType) {
	case "document.created":
		status := entity.DocumentStatusPending
		mapping.DocumentStatus = &status

	case "document.viewed", "document.opened":
		docStatus := entity.DocumentStatusInProgress
		recipientStatus := entity.RecipientStatusDelivered
		mapping.DocumentStatus = &docStatus
		mapping.RecipientStatus = &recipientStatus

	case "document.signed", "signer.signed":
		recipientStatus := entity.RecipientStatusSigned
		mapping.RecipientStatus = &recipientStatus

	case "document.completed":
		docStatus := entity.DocumentStatusCompleted
		mapping.DocumentStatus = &docStatus

	case "document.declined", "signer.declined":
		docStatus := entity.DocumentStatusDeclined
		recipientStatus := entity.RecipientStatusDeclined
		mapping.DocumentStatus = &docStatus
		mapping.RecipientStatus = &recipientStatus

	case "document.revoked", "document.voided":
		docStatus := entity.DocumentStatusVoided
		mapping.DocumentStatus = &docStatus

	case "document.expired":
		docStatus := entity.DocumentStatusExpired
		mapping.DocumentStatus = &docStatus
	}

	return mapping
}
