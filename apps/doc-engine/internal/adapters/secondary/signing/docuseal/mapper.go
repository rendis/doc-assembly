package docuseal

import (
	"strings"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// DocuSealSubmitterStatus represents the status values from DocuSeal API.
type DocuSealSubmitterStatus string

const (
	SubmitterStatusPending   DocuSealSubmitterStatus = "pending"
	SubmitterStatusAwaiting  DocuSealSubmitterStatus = "awaiting"
	SubmitterStatusSent      DocuSealSubmitterStatus = "sent"
	SubmitterStatusOpened    DocuSealSubmitterStatus = "opened"
	SubmitterStatusCompleted DocuSealSubmitterStatus = "completed"
	SubmitterStatusDeclined  DocuSealSubmitterStatus = "declined"
)

// MapSubmitterStatus maps DocuSeal submitter status to internal RecipientStatus.
func MapSubmitterStatus(status string) entity.RecipientStatus {
	switch DocuSealSubmitterStatus(strings.ToLower(status)) {
	case SubmitterStatusPending, SubmitterStatusAwaiting:
		return entity.RecipientStatusPending
	case SubmitterStatusSent:
		return entity.RecipientStatusSent
	case SubmitterStatusOpened:
		return entity.RecipientStatusDelivered
	case SubmitterStatusCompleted:
		return entity.RecipientStatusSigned
	case SubmitterStatusDeclined:
		return entity.RecipientStatusDeclined
	default:
		return entity.RecipientStatusPending
	}
}

// MapSubmissionStatus derives document status from submitter states.
func MapSubmissionStatus(submitters []submitterResponse) entity.DocumentStatus {
	if len(submitters) == 0 {
		return entity.DocumentStatusPending
	}

	allCompleted := true
	anyDeclined := false
	anyOpened := false

	for _, s := range submitters {
		status := strings.ToLower(s.Status)
		switch status {
		case "declined":
			anyDeclined = true
		case "opened":
			anyOpened = true
			allCompleted = false
		case "completed":
			// ok - completed
		default:
			allCompleted = false
		}
	}

	if anyDeclined {
		return entity.DocumentStatusDeclined
	}
	if allCompleted {
		return entity.DocumentStatusCompleted
	}
	if anyOpened {
		return entity.DocumentStatusInProgress
	}
	return entity.DocumentStatusPending
}

// WebhookEventMapping maps webhook events to status updates.
type WebhookEventMapping struct {
	DocumentStatus  *entity.DocumentStatus
	RecipientStatus *entity.RecipientStatus
}

// MapWebhookEvent maps a DocuSeal webhook event type to status updates.
func MapWebhookEvent(eventType string) WebhookEventMapping {
	mapping := WebhookEventMapping{}

	switch strings.ToLower(eventType) {
	case "submission.created":
		status := entity.DocumentStatusPending
		mapping.DocumentStatus = &status

	case "form.started", "form.viewed":
		docStatus := entity.DocumentStatusInProgress
		recipientStatus := entity.RecipientStatusDelivered
		mapping.DocumentStatus = &docStatus
		mapping.RecipientStatus = &recipientStatus

	case "form.completed":
		recipientStatus := entity.RecipientStatusSigned
		mapping.RecipientStatus = &recipientStatus

	case "submission.completed":
		docStatus := entity.DocumentStatusCompleted
		mapping.DocumentStatus = &docStatus

	case "form.declined":
		docStatus := entity.DocumentStatusDeclined
		recipientStatus := entity.RecipientStatusDeclined
		mapping.DocumentStatus = &docStatus
		mapping.RecipientStatus = &recipientStatus

	case "submission.archived":
		docStatus := entity.DocumentStatusVoided
		mapping.DocumentStatus = &docStatus
	}

	return mapping
}
