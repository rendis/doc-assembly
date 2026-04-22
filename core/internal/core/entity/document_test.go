package entity

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestDocument_CleanSlateStatusHelpers(t *testing.T) {
	d := &Document{Status: DocumentStatusDraft}
	assert.NoError(t, d.MarkAsAwaitingInput())
	assert.Equal(t, DocumentStatusAwaitingInput, d.Status)

	assert.NoError(t, d.UpdateStatus(DocumentStatusPreparingSignature))
	assert.Equal(t, DocumentStatusPreparingSignature, d.Status)
	assert.Equal(t, DocumentStatusPreparingSignature, d.Status)

	assert.NoError(t, d.UpdateStatus(DocumentStatusReadyToSign))
	assert.True(t, d.IsPending())

	assert.NoError(t, d.UpdateStatus(DocumentStatusSigning))
	assert.True(t, d.IsInProgress())

	assert.NoError(t, d.MarkAsCompleted())
	assert.True(t, d.IsCompleted())
	assert.True(t, d.IsTerminal())
}

func TestDocument_CancellationAndInvalidation(t *testing.T) {
	d := &Document{Status: DocumentStatusReadyToSign}
	assert.NoError(t, d.MarkAsVoided())
	assert.Equal(t, DocumentStatusCancelled, d.Status)
	assert.True(t, d.IsTerminal())

	d = &Document{Status: DocumentStatusSigning}
	assert.NoError(t, d.MarkAsExpired())
	assert.Equal(t, DocumentStatusInvalidated, d.Status)
	assert.True(t, d.IsTerminal())
}

func TestDocument_ErrorAndRecovery(t *testing.T) {
	d := &Document{Status: DocumentStatusPreparingSignature}
	assert.NoError(t, d.MarkAsError())
	assert.Equal(t, DocumentStatusError, d.Status)
	assert.False(t, d.IsTerminal())

	assert.NoError(t, d.RecoverToAwaitingInput())
	assert.Equal(t, DocumentStatusAwaitingInput, d.Status)
}

func TestDocument_Expiration(t *testing.T) {
	past := time.Now().Add(-time.Hour)
	future := time.Now().Add(time.Hour)
	assert.True(t, (&Document{ExpiresAt: &past}).IsExpired())
	assert.False(t, (&Document{ExpiresAt: &future}).IsExpired())
	assert.False(t, (&Document{}).IsExpired())
}

func TestDocument_SetActiveAttempt(t *testing.T) {
	attemptID := "attempt-1"
	d := &Document{Status: DocumentStatusAwaitingInput, ActiveAttemptID: &attemptID}
	assert.Equal(t, "attempt-1", *d.ActiveAttemptID)
}
