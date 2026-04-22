package entity

import "time"

// SigningAttemptRecipient snapshots one logical signer inside one provider attempt.
type SigningAttemptRecipient struct {
	ID                    string          `json:"id"`
	AttemptID             string          `json:"attemptId"`
	DocumentRecipientID   *string         `json:"documentRecipientId,omitempty"`
	TemplateVersionRoleID string          `json:"templateVersionRoleId"`
	SignerOrder           int             `json:"signerOrder"`
	Email                 string          `json:"email"`
	Name                  string          `json:"name"`
	ProviderRecipientID   *string         `json:"providerRecipientId,omitempty"`
	ProviderSigningToken  *string         `json:"providerSigningToken,omitempty"`
	SigningURL            *string         `json:"signingUrl,omitempty"`
	Status                RecipientStatus `json:"status"`
	SignedAt              *time.Time      `json:"signedAt,omitempty"`
	CreatedAt             time.Time       `json:"createdAt"`
	UpdatedAt             *time.Time      `json:"updatedAt,omitempty"`
}
