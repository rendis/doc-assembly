package documenso

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

func TestMapEnvelopeStatus(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		expect entity.DocumentStatus
	}{
		{"CREATED -> DRAFT", "CREATED", entity.DocumentStatusDraft},
		{"PENDING -> PENDING", "PENDING", entity.DocumentStatusPending},
		{"SENT -> PENDING", "SENT", entity.DocumentStatusPending},
		{"OPENED -> IN_PROGRESS", "OPENED", entity.DocumentStatusInProgress},
		{"SIGNED -> COMPLETED", "SIGNED", entity.DocumentStatusCompleted},
		{"COMPLETED -> COMPLETED", "COMPLETED", entity.DocumentStatusCompleted},
		{"REJECTED -> DECLINED", "REJECTED", entity.DocumentStatusDeclined},
		{"CANCELLED -> VOIDED", "CANCELLED", entity.DocumentStatusVoided},
		{"unknown -> ERROR", "UNKNOWN_STATUS", entity.DocumentStatusError},
		{"empty -> ERROR", "", entity.DocumentStatusError},
		{"lowercase created -> DRAFT", "created", entity.DocumentStatusDraft},
		{"mixed case Sent -> PENDING", "Sent", entity.DocumentStatusPending},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expect, MapEnvelopeStatus(tt.input))
		})
	}
}

func TestMapRecipientStatus(t *testing.T) {
	tests := []struct {
		name   string
		input  string
		expect entity.RecipientStatus
	}{
		{"PENDING -> PENDING", "PENDING", entity.RecipientStatusPending},
		{"SENT -> SENT", "SENT", entity.RecipientStatusSent},
		{"OPENED -> DELIVERED", "OPENED", entity.RecipientStatusDelivered},
		{"SIGNED -> SIGNED", "SIGNED", entity.RecipientStatusSigned},
		{"COMPLETED -> SIGNED", "COMPLETED", entity.RecipientStatusSigned},
		{"REJECTED -> DECLINED", "REJECTED", entity.RecipientStatusDeclined},
		{"unknown -> PENDING", "UNKNOWN", entity.RecipientStatusPending},
		{"empty -> PENDING", "", entity.RecipientStatusPending},
		{"lowercase sent -> SENT", "sent", entity.RecipientStatusSent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expect, MapRecipientStatus(tt.input))
		})
	}
}

func TestMapWebhookEvent(t *testing.T) {
	tests := []struct {
		name            string
		eventType       string
		wantDocStatus   *entity.DocumentStatus
		wantRecipStatus *entity.RecipientStatus
	}{
		{
			name:          "document.created",
			eventType:     "document.created",
			wantDocStatus: docStatusPtr(entity.DocumentStatusDraft),
		},
		{
			name:            "document.sent",
			eventType:       "document.sent",
			wantDocStatus:   docStatusPtr(entity.DocumentStatusPending),
			wantRecipStatus: recipStatusPtr(entity.RecipientStatusSent),
		},
		{
			name:            "document.opened",
			eventType:       "document.opened",
			wantDocStatus:   docStatusPtr(entity.DocumentStatusInProgress),
			wantRecipStatus: recipStatusPtr(entity.RecipientStatusDelivered),
		},
		{
			name:            "document.signed",
			eventType:       "document.signed",
			wantDocStatus:   nil, // determined by service layer
			wantRecipStatus: recipStatusPtr(entity.RecipientStatusSigned),
		},
		{
			name:          "document.completed",
			eventType:     "document.completed",
			wantDocStatus: docStatusPtr(entity.DocumentStatusCompleted),
		},
		{
			name:            "document.rejected",
			eventType:       "document.rejected",
			wantDocStatus:   docStatusPtr(entity.DocumentStatusDeclined),
			wantRecipStatus: recipStatusPtr(entity.RecipientStatusDeclined),
		},
		{
			name:          "document.cancelled",
			eventType:     "document.cancelled",
			wantDocStatus: docStatusPtr(entity.DocumentStatusVoided),
		},
		{
			name:          "DOCUMENT_CREATED (underscore format)",
			eventType:     "DOCUMENT_CREATED",
			wantDocStatus: docStatusPtr(entity.DocumentStatusDraft),
		},
		{
			name:            "DOCUMENT_SENT (underscore format)",
			eventType:       "DOCUMENT_SENT",
			wantDocStatus:   docStatusPtr(entity.DocumentStatusPending),
			wantRecipStatus: recipStatusPtr(entity.RecipientStatusSent),
		},
		{
			name:            "DOCUMENT_OPENED (underscore format)",
			eventType:       "DOCUMENT_OPENED",
			wantDocStatus:   docStatusPtr(entity.DocumentStatusInProgress),
			wantRecipStatus: recipStatusPtr(entity.RecipientStatusDelivered),
		},
		{
			name:            "DOCUMENT_SIGNED (underscore format)",
			eventType:       "DOCUMENT_SIGNED",
			wantDocStatus:   nil,
			wantRecipStatus: recipStatusPtr(entity.RecipientStatusSigned),
		},
		{
			name:          "DOCUMENT_COMPLETED (underscore format)",
			eventType:     "DOCUMENT_COMPLETED",
			wantDocStatus: docStatusPtr(entity.DocumentStatusCompleted),
		},
		{
			name:      "unknown event returns empty mapping",
			eventType: "unknown.event",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mapping := MapWebhookEvent(tt.eventType)

			if tt.wantDocStatus != nil {
				assert.NotNil(t, mapping.DocumentStatus)
				assert.Equal(t, *tt.wantDocStatus, *mapping.DocumentStatus)
			} else {
				assert.Nil(t, mapping.DocumentStatus)
			}

			if tt.wantRecipStatus != nil {
				assert.NotNil(t, mapping.RecipientStatus)
				assert.Equal(t, *tt.wantRecipStatus, *mapping.RecipientStatus)
			} else {
				assert.Nil(t, mapping.RecipientStatus)
			}
		})
	}
}

func TestInternalToDocumensoStatus(t *testing.T) {
	tests := []struct {
		name   string
		input  entity.DocumentStatus
		expect DocumensoEnvelopeStatus
	}{
		{"DRAFT -> CREATED", entity.DocumentStatusDraft, EnvelopeStatusCreated},
		{"PENDING -> SENT", entity.DocumentStatusPending, EnvelopeStatusSent},
		{"IN_PROGRESS -> OPENED", entity.DocumentStatusInProgress, EnvelopeStatusOpened},
		{"COMPLETED -> COMPLETED", entity.DocumentStatusCompleted, EnvelopeStatusCompleted},
		{"DECLINED -> REJECTED", entity.DocumentStatusDeclined, EnvelopeStatusRejected},
		{"VOIDED -> CANCELLED", entity.DocumentStatusVoided, EnvelopeStatusCancelled},
		{"ERROR -> empty", entity.DocumentStatusError, DocumensoEnvelopeStatus("")},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expect, InternalToDocumensoStatus(tt.input))
		})
	}
}

func docStatusPtr(s entity.DocumentStatus) *entity.DocumentStatus {
	return &s
}

func recipStatusPtr(s entity.RecipientStatus) *entity.RecipientStatus {
	return &s
}
