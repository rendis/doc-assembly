package entity

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDocumentStatus_CleanSlateTransitions(t *testing.T) {
	tests := []struct {
		name string
		from DocumentStatus
		to   DocumentStatus
		ok   bool
	}{
		{"draft to awaiting input", DocumentStatusDraft, DocumentStatusAwaitingInput, true},
		{"awaiting input to preparing", DocumentStatusAwaitingInput, DocumentStatusPreparingSignature, true},
		{"preparing to ready", DocumentStatusPreparingSignature, DocumentStatusReadyToSign, true},
		{"ready to signing", DocumentStatusReadyToSign, DocumentStatusSigning, true},
		{"signing to completed", DocumentStatusSigning, DocumentStatusCompleted, true},
		{"signing to declined", DocumentStatusSigning, DocumentStatusDeclined, true},
		{"preparing to error", DocumentStatusPreparingSignature, DocumentStatusError, true},
		{"completed immutable", DocumentStatusCompleted, DocumentStatusPreparingSignature, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) { assert.Equal(t, tt.ok, tt.from.CanTransitionTo(tt.to)) })
	}
}

func TestDocumentStatus_IsValid(t *testing.T) {
	validStatuses := []DocumentStatus{
		DocumentStatusDraft, DocumentStatusAwaitingInput, DocumentStatusPreparingSignature,
		DocumentStatusReadyToSign, DocumentStatusSigning, DocumentStatusCompleted,
		DocumentStatusDeclined, DocumentStatusCancelled, DocumentStatusInvalidated, DocumentStatusError,
	}
	for _, s := range validStatuses {
		t.Run(string(s)+" is valid", func(t *testing.T) { assert.True(t, s.IsValid()) })
	}
	assert.False(t, DocumentStatus("PENDING_PROVIDER").IsValid())
	assert.False(t, DocumentStatus("").IsValid())
}

func TestDocumentStatus_IsTerminal(t *testing.T) {
	terminal := []DocumentStatus{DocumentStatusCompleted, DocumentStatusDeclined, DocumentStatusCancelled, DocumentStatusInvalidated}
	nonTerminal := []DocumentStatus{DocumentStatusDraft, DocumentStatusAwaitingInput, DocumentStatusPreparingSignature, DocumentStatusReadyToSign, DocumentStatusSigning, DocumentStatusError}
	for _, s := range terminal {
		t.Run(string(s)+" is terminal", func(t *testing.T) { assert.True(t, s.IsTerminal()) })
	}
	for _, s := range nonTerminal {
		t.Run(string(s)+" is not terminal", func(t *testing.T) { assert.False(t, s.IsTerminal()) })
	}
}

func TestRecipientStatus_IsValid(t *testing.T) {
	validStatuses := []RecipientStatus{RecipientStatusPending, RecipientStatusSent, RecipientStatusDelivered, RecipientStatusSigned, RecipientStatusDeclined, RecipientStatusWaiting, RecipientStatusRejected}
	for _, s := range validStatuses {
		t.Run(string(s)+" is valid", func(t *testing.T) { assert.True(t, s.IsValid()) })
	}
	assert.False(t, RecipientStatus("INVALID").IsValid())
}

func TestRecipientStatus_Normalize(t *testing.T) {
	tests := []struct{ input, expect RecipientStatus }{{RecipientStatusWaiting, RecipientStatusPending}, {RecipientStatusRejected, RecipientStatusDeclined}, {RecipientStatusSigned, RecipientStatusSigned}}
	for _, tt := range tests {
		assert.Equal(t, tt.expect, tt.input.Normalize())
	}
}
