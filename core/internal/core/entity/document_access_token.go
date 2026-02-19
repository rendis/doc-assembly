package entity

import "time"

// DocumentAccessToken represents a time-limited access token for pre-signing form access.
type DocumentAccessToken struct {
	ID          string     `json:"id"`
	DocumentID  string     `json:"documentId"`
	RecipientID string     `json:"recipientId"`
	Token       string     `json:"token"`
	ExpiresAt   time.Time  `json:"expiresAt"`
	UsedAt      *time.Time `json:"usedAt,omitempty"`
	CreatedAt   time.Time  `json:"createdAt"`
}
