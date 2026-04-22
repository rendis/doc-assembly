package entity

import (
	"encoding/json"
	"time"
)

// SigningAttemptEvent records attempt-local state transitions, worker events, and webhooks.
type SigningAttemptEvent struct {
	ID                 string                `json:"id"`
	AttemptID          string                `json:"attemptId"`
	DocumentID         string                `json:"documentId"`
	EventType          string                `json:"eventType"`
	OldStatus          *SigningAttemptStatus `json:"oldStatus,omitempty"`
	NewStatus          *SigningAttemptStatus `json:"newStatus,omitempty"`
	ProviderName       *string               `json:"providerName,omitempty"`
	ProviderDocumentID *string               `json:"providerDocumentId,omitempty"`
	CorrelationKey     *string               `json:"correlationKey,omitempty"`
	RiverJobID         *int64                `json:"riverJobId,omitempty"`
	ErrorClass         *ProviderErrorClass   `json:"errorClass,omitempty"`
	Metadata           json.RawMessage       `json:"metadata,omitempty"`
	RawPayload         json.RawMessage       `json:"rawPayload,omitempty"`
	CreatedAt          time.Time             `json:"createdAt"`
}
