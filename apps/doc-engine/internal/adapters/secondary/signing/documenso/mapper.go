package documenso

import (
	"strings"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// DocumensoEnvelopeStatus represents the status values from Documenso API.
type DocumensoEnvelopeStatus string

const (
	EnvelopeStatusCreated   DocumensoEnvelopeStatus = "CREATED"
	EnvelopeStatusSent      DocumensoEnvelopeStatus = "SENT"
	EnvelopeStatusOpened    DocumensoEnvelopeStatus = "OPENED"
	EnvelopeStatusSigned    DocumensoEnvelopeStatus = "SIGNED"
	EnvelopeStatusCompleted DocumensoEnvelopeStatus = "COMPLETED"
	EnvelopeStatusRejected  DocumensoEnvelopeStatus = "REJECTED"
	EnvelopeStatusCancelled DocumensoEnvelopeStatus = "CANCELLED"
)

// DocumensoRecipientStatus represents the recipient status values from Documenso API.
type DocumensoRecipientStatus string

const (
	RecipientStatusPending   DocumensoRecipientStatus = "PENDING"
	RecipientStatusSent      DocumensoRecipientStatus = "SENT"
	RecipientStatusOpened    DocumensoRecipientStatus = "OPENED"
	RecipientStatusSigned    DocumensoRecipientStatus = "SIGNED"
	RecipientStatusCompleted DocumensoRecipientStatus = "COMPLETED"
	RecipientStatusRejected  DocumensoRecipientStatus = "REJECTED"
)

// MapEnvelopeStatus maps Documenso envelope status to internal DocumentStatus.
func MapEnvelopeStatus(status string) entity.DocumentStatus {
	switch DocumensoEnvelopeStatus(strings.ToUpper(status)) {
	case EnvelopeStatusCreated:
		return entity.DocumentStatusDraft
	case EnvelopeStatusSent:
		return entity.DocumentStatusPending
	case EnvelopeStatusOpened:
		return entity.DocumentStatusInProgress
	case EnvelopeStatusSigned:
		// SIGNED at envelope level means all signers completed
		return entity.DocumentStatusCompleted
	case EnvelopeStatusCompleted:
		return entity.DocumentStatusCompleted
	case EnvelopeStatusRejected:
		return entity.DocumentStatusDeclined
	case EnvelopeStatusCancelled:
		return entity.DocumentStatusVoided
	default:
		// Unknown status, treat as error
		return entity.DocumentStatusError
	}
}

// MapRecipientStatus maps Documenso recipient status to internal RecipientStatus.
func MapRecipientStatus(status string) entity.RecipientStatus {
	switch DocumensoRecipientStatus(strings.ToUpper(status)) {
	case RecipientStatusPending:
		return entity.RecipientStatusPending
	case RecipientStatusSent:
		return entity.RecipientStatusSent
	case RecipientStatusOpened:
		return entity.RecipientStatusDelivered
	case RecipientStatusSigned, RecipientStatusCompleted:
		return entity.RecipientStatusSigned
	case RecipientStatusRejected:
		return entity.RecipientStatusDeclined
	default:
		// Unknown status, default to pending
		return entity.RecipientStatusPending
	}
}

// MapWebhookEventType maps Documenso webhook event types to document/recipient status.
type WebhookEventMapping struct {
	DocumentStatus  *entity.DocumentStatus
	RecipientStatus *entity.RecipientStatus
}

// MapWebhookEvent maps a Documenso webhook event type to status updates.
func MapWebhookEvent(eventType string) WebhookEventMapping {
	mapping := WebhookEventMapping{}

	switch strings.ToLower(eventType) {
	case "document.created":
		status := entity.DocumentStatusDraft
		mapping.DocumentStatus = &status

	case "document.sent":
		docStatus := entity.DocumentStatusPending
		recipientStatus := entity.RecipientStatusSent
		mapping.DocumentStatus = &docStatus
		mapping.RecipientStatus = &recipientStatus

	case "document.opened":
		docStatus := entity.DocumentStatusInProgress
		recipientStatus := entity.RecipientStatusDelivered
		mapping.DocumentStatus = &docStatus
		mapping.RecipientStatus = &recipientStatus

	case "document.signed":
		// Individual signer signed - recipient status changes, document may or may not be complete
		recipientStatus := entity.RecipientStatusSigned
		mapping.RecipientStatus = &recipientStatus
		// Document status depends on whether all signers completed
		// This will be determined by the service layer

	case "document.completed":
		docStatus := entity.DocumentStatusCompleted
		mapping.DocumentStatus = &docStatus

	case "document.rejected":
		docStatus := entity.DocumentStatusDeclined
		recipientStatus := entity.RecipientStatusDeclined
		mapping.DocumentStatus = &docStatus
		mapping.RecipientStatus = &recipientStatus

	case "document.cancelled":
		docStatus := entity.DocumentStatusVoided
		mapping.DocumentStatus = &docStatus
	}

	return mapping
}

// InternalToDocumensoStatus maps internal DocumentStatus to Documenso envelope status.
// This is used when querying or filtering by status.
func InternalToDocumensoStatus(status entity.DocumentStatus) DocumensoEnvelopeStatus {
	switch status {
	case entity.DocumentStatusDraft:
		return EnvelopeStatusCreated
	case entity.DocumentStatusPending:
		return EnvelopeStatusSent
	case entity.DocumentStatusInProgress:
		return EnvelopeStatusOpened
	case entity.DocumentStatusCompleted:
		return EnvelopeStatusCompleted
	case entity.DocumentStatusDeclined:
		return EnvelopeStatusRejected
	case entity.DocumentStatusVoided:
		return EnvelopeStatusCancelled
	default:
		return ""
	}
}
