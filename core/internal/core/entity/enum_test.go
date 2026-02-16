package entity

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDocumentStatus_CanTransitionTo(t *testing.T) {
	tests := []struct {
		name   string
		from   DocumentStatus
		to     DocumentStatus
		expect bool
	}{
		// From DRAFT
		{"DRAFT -> PENDING_PROVIDER", DocumentStatusDraft, DocumentStatusPendingProvider, true},
		{"DRAFT -> PENDING", DocumentStatusDraft, DocumentStatusPending, true},
		{"DRAFT -> ERROR", DocumentStatusDraft, DocumentStatusError, true},
		{"DRAFT -> COMPLETED", DocumentStatusDraft, DocumentStatusCompleted, false},
		{"DRAFT -> IN_PROGRESS", DocumentStatusDraft, DocumentStatusInProgress, false},

		// From PENDING_PROVIDER
		{"PENDING_PROVIDER -> PENDING", DocumentStatusPendingProvider, DocumentStatusPending, true},
		{"PENDING_PROVIDER -> ERROR", DocumentStatusPendingProvider, DocumentStatusError, true},
		{"PENDING_PROVIDER -> COMPLETED", DocumentStatusPendingProvider, DocumentStatusCompleted, false},

		// From PENDING
		{"PENDING -> IN_PROGRESS", DocumentStatusPending, DocumentStatusInProgress, true},
		{"PENDING -> COMPLETED", DocumentStatusPending, DocumentStatusCompleted, true},
		{"PENDING -> DECLINED", DocumentStatusPending, DocumentStatusDeclined, true},
		{"PENDING -> VOIDED", DocumentStatusPending, DocumentStatusVoided, true},
		{"PENDING -> EXPIRED", DocumentStatusPending, DocumentStatusExpired, true},
		{"PENDING -> ERROR", DocumentStatusPending, DocumentStatusError, true},
		{"PENDING -> DRAFT", DocumentStatusPending, DocumentStatusDraft, false},

		// From IN_PROGRESS
		{"IN_PROGRESS -> COMPLETED", DocumentStatusInProgress, DocumentStatusCompleted, true},
		{"IN_PROGRESS -> DECLINED", DocumentStatusInProgress, DocumentStatusDeclined, true},
		{"IN_PROGRESS -> VOIDED", DocumentStatusInProgress, DocumentStatusVoided, true},
		{"IN_PROGRESS -> EXPIRED", DocumentStatusInProgress, DocumentStatusExpired, true},
		{"IN_PROGRESS -> ERROR", DocumentStatusInProgress, DocumentStatusError, true},
		{"IN_PROGRESS -> DRAFT", DocumentStatusInProgress, DocumentStatusDraft, false},

		// From ERROR
		{"ERROR -> DRAFT", DocumentStatusError, DocumentStatusDraft, true},
		{"ERROR -> PENDING", DocumentStatusError, DocumentStatusPending, true},
		{"ERROR -> COMPLETED", DocumentStatusError, DocumentStatusCompleted, false},

		// Terminal states: no transitions
		{"COMPLETED -> any", DocumentStatusCompleted, DocumentStatusDraft, false},
		{"DECLINED -> any", DocumentStatusDeclined, DocumentStatusDraft, false},
		{"VOIDED -> any", DocumentStatusVoided, DocumentStatusDraft, false},
		{"EXPIRED -> any", DocumentStatusExpired, DocumentStatusDraft, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expect, tt.from.CanTransitionTo(tt.to))
		})
	}
}

func TestDocumentStatus_IsValid(t *testing.T) {
	validStatuses := []DocumentStatus{
		DocumentStatusDraft, DocumentStatusPendingProvider, DocumentStatusPending,
		DocumentStatusInProgress, DocumentStatusCompleted, DocumentStatusDeclined,
		DocumentStatusVoided, DocumentStatusExpired, DocumentStatusError,
	}

	for _, s := range validStatuses {
		t.Run(string(s)+" is valid", func(t *testing.T) {
			assert.True(t, s.IsValid())
		})
	}

	t.Run("INVALID is not valid", func(t *testing.T) {
		assert.False(t, DocumentStatus("INVALID").IsValid())
	})

	t.Run("empty string is not valid", func(t *testing.T) {
		assert.False(t, DocumentStatus("").IsValid())
	})
}

func TestDocumentStatus_IsTerminal(t *testing.T) {
	terminal := []DocumentStatus{
		DocumentStatusCompleted, DocumentStatusDeclined, DocumentStatusVoided, DocumentStatusExpired,
	}
	nonTerminal := []DocumentStatus{
		DocumentStatusDraft, DocumentStatusPendingProvider, DocumentStatusPending,
		DocumentStatusInProgress, DocumentStatusError,
	}

	for _, s := range terminal {
		t.Run(string(s)+" is terminal", func(t *testing.T) {
			assert.True(t, s.IsTerminal())
		})
	}
	for _, s := range nonTerminal {
		t.Run(string(s)+" is not terminal", func(t *testing.T) {
			assert.False(t, s.IsTerminal())
		})
	}
}

func TestRecipientStatus_IsValid(t *testing.T) {
	validStatuses := []RecipientStatus{
		RecipientStatusPending, RecipientStatusSent, RecipientStatusDelivered,
		RecipientStatusSigned, RecipientStatusDeclined,
		RecipientStatusWaiting, RecipientStatusRejected,
	}

	for _, s := range validStatuses {
		t.Run(string(s)+" is valid", func(t *testing.T) {
			assert.True(t, s.IsValid())
		})
	}

	t.Run("INVALID is not valid", func(t *testing.T) {
		assert.False(t, RecipientStatus("INVALID").IsValid())
	})
}

func TestRecipientStatus_Normalize(t *testing.T) {
	tests := []struct {
		name   string
		input  RecipientStatus
		expect RecipientStatus
	}{
		{"WAITING -> PENDING", RecipientStatusWaiting, RecipientStatusPending},
		{"REJECTED -> DECLINED", RecipientStatusRejected, RecipientStatusDeclined},
		{"PENDING unchanged", RecipientStatusPending, RecipientStatusPending},
		{"SIGNED unchanged", RecipientStatusSigned, RecipientStatusSigned},
		{"SENT unchanged", RecipientStatusSent, RecipientStatusSent},
		{"DELIVERED unchanged", RecipientStatusDelivered, RecipientStatusDelivered},
		{"DECLINED unchanged", RecipientStatusDeclined, RecipientStatusDeclined},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expect, tt.input.Normalize())
		})
	}
}
