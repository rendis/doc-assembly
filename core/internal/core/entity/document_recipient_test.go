package entity

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDocumentRecipient_MarkAsSent(t *testing.T) {
	tests := []struct {
		name    string
		status  RecipientStatus
		wantErr bool
	}{
		{"from PENDING succeeds", RecipientStatusPending, false},
		{"from SENT fails", RecipientStatusSent, true},
		{"from DELIVERED fails", RecipientStatusDelivered, true},
		{"from SIGNED fails", RecipientStatusSigned, true},
		{"from DECLINED fails", RecipientStatusDeclined, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DocumentRecipient{Status: tt.status}
			err := r.MarkAsSent()
			if tt.wantErr {
				assert.ErrorIs(t, err, ErrInvalidRecipientStatusTransition)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, RecipientStatusSent, r.Status)
			}
		})
	}
}

func TestDocumentRecipient_MarkAsDelivered(t *testing.T) {
	tests := []struct {
		name    string
		status  RecipientStatus
		wantErr bool
	}{
		{"from PENDING succeeds", RecipientStatusPending, false},
		{"from SENT succeeds", RecipientStatusSent, false},
		{"from DELIVERED fails", RecipientStatusDelivered, true},
		{"from SIGNED fails", RecipientStatusSigned, true},
		{"from DECLINED fails", RecipientStatusDeclined, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DocumentRecipient{Status: tt.status}
			err := r.MarkAsDelivered()
			if tt.wantErr {
				assert.ErrorIs(t, err, ErrInvalidRecipientStatusTransition)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, RecipientStatusDelivered, r.Status)
			}
		})
	}
}

func TestDocumentRecipient_MarkAsSigned(t *testing.T) {
	tests := []struct {
		name    string
		status  RecipientStatus
		wantErr bool
	}{
		{"from PENDING succeeds", RecipientStatusPending, false},
		{"from SENT succeeds", RecipientStatusSent, false},
		{"from DELIVERED succeeds", RecipientStatusDelivered, false},
		{"from SIGNED fails", RecipientStatusSigned, true},
		{"from DECLINED fails", RecipientStatusDeclined, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DocumentRecipient{Status: tt.status}
			err := r.MarkAsSigned()
			if tt.wantErr {
				assert.ErrorIs(t, err, ErrInvalidRecipientStatusTransition)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, RecipientStatusSigned, r.Status)
				assert.NotNil(t, r.SignedAt)
			}
		})
	}
}

func TestDocumentRecipient_MarkAsDeclined(t *testing.T) {
	tests := []struct {
		name    string
		status  RecipientStatus
		wantErr bool
	}{
		{"from PENDING succeeds", RecipientStatusPending, false},
		{"from SENT succeeds", RecipientStatusSent, false},
		{"from DELIVERED succeeds", RecipientStatusDelivered, false},
		{"from SIGNED fails", RecipientStatusSigned, true},
		{"from DECLINED fails", RecipientStatusDeclined, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := &DocumentRecipient{Status: tt.status}
			err := r.MarkAsDeclined()
			if tt.wantErr {
				assert.ErrorIs(t, err, ErrInvalidRecipientStatusTransition)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, RecipientStatusDeclined, r.Status)
			}
		})
	}
}

func TestDocumentRecipient_UpdateStatus(t *testing.T) {
	t.Run("sets valid status", func(t *testing.T) {
		r := &DocumentRecipient{Status: RecipientStatusPending}
		err := r.UpdateStatus(RecipientStatusSent)
		assert.NoError(t, err)
		assert.Equal(t, RecipientStatusSent, r.Status)
	})

	t.Run("rejects invalid status", func(t *testing.T) {
		r := &DocumentRecipient{Status: RecipientStatusPending}
		err := r.UpdateStatus(RecipientStatus("INVALID"))
		assert.ErrorIs(t, err, ErrInvalidRecipientStatus)
	})

	t.Run("tracks SignedAt for SIGNED status", func(t *testing.T) {
		r := &DocumentRecipient{Status: RecipientStatusPending}
		err := r.UpdateStatus(RecipientStatusSigned)
		assert.NoError(t, err)
		assert.Equal(t, RecipientStatusSigned, r.Status)
		assert.NotNil(t, r.SignedAt)
	})

	t.Run("does not overwrite existing SignedAt", func(t *testing.T) {
		r := &DocumentRecipient{Status: RecipientStatusPending}
		// First sign
		err := r.UpdateStatus(RecipientStatusSigned)
		assert.NoError(t, err)
		firstSignedAt := *r.SignedAt

		// Update again (e.g., re-processing webhook)
		err = r.UpdateStatus(RecipientStatusSigned)
		assert.NoError(t, err)
		assert.Equal(t, firstSignedAt, *r.SignedAt)
	})
}

func TestDocumentRecipient_Validate(t *testing.T) {
	tests := []struct {
		name    string
		r       DocumentRecipient
		wantErr error
	}{
		{
			name: "valid recipient",
			r: DocumentRecipient{
				DocumentID:            "doc-1",
				TemplateVersionRoleID: "role-1",
				Name:                  "John Doe",
				Email:                 "john@example.com",
				Status:                RecipientStatusPending,
			},
			wantErr: nil,
		},
		{
			name: "missing document ID",
			r: DocumentRecipient{
				TemplateVersionRoleID: "role-1",
				Name:                  "John Doe",
				Email:                 "john@example.com",
				Status:                RecipientStatusPending,
			},
			wantErr: ErrRequiredField,
		},
		{
			name: "missing role ID",
			r: DocumentRecipient{
				DocumentID: "doc-1",
				Name:       "John Doe",
				Email:      "john@example.com",
				Status:     RecipientStatusPending,
			},
			wantErr: ErrRequiredField,
		},
		{
			name: "missing name",
			r: DocumentRecipient{
				DocumentID:            "doc-1",
				TemplateVersionRoleID: "role-1",
				Email:                 "john@example.com",
				Status:                RecipientStatusPending,
			},
			wantErr: ErrRequiredField,
		},
		{
			name: "name too long",
			r: DocumentRecipient{
				DocumentID:            "doc-1",
				TemplateVersionRoleID: "role-1",
				Name:                  strings.Repeat("a", 256),
				Email:                 "john@example.com",
				Status:                RecipientStatusPending,
			},
			wantErr: ErrFieldTooLong,
		},
		{
			name: "missing email",
			r: DocumentRecipient{
				DocumentID:            "doc-1",
				TemplateVersionRoleID: "role-1",
				Name:                  "John Doe",
				Status:                RecipientStatusPending,
			},
			wantErr: ErrRequiredField,
		},
		{
			name: "email too long",
			r: DocumentRecipient{
				DocumentID:            "doc-1",
				TemplateVersionRoleID: "role-1",
				Name:                  "John Doe",
				Email:                 strings.Repeat("a", 256),
				Status:                RecipientStatusPending,
			},
			wantErr: ErrFieldTooLong,
		},
		{
			name: "invalid status",
			r: DocumentRecipient{
				DocumentID:            "doc-1",
				TemplateVersionRoleID: "role-1",
				Name:                  "John Doe",
				Email:                 "john@example.com",
				Status:                RecipientStatus("INVALID"),
			},
			wantErr: ErrInvalidRecipientStatus,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.r.Validate()
			if tt.wantErr != nil {
				assert.ErrorIs(t, err, tt.wantErr)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNewDocumentRecipient(t *testing.T) {
	r := NewDocumentRecipient("doc-1", "role-1", "John Doe", "john@example.com")
	assert.Equal(t, "doc-1", r.DocumentID)
	assert.Equal(t, "role-1", r.TemplateVersionRoleID)
	assert.Equal(t, "John Doe", r.Name)
	assert.Equal(t, "john@example.com", r.Email)
	assert.Equal(t, RecipientStatusPending, r.Status)
	assert.False(t, r.CreatedAt.IsZero())
}
