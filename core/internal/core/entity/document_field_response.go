package entity

import (
	"encoding/json"
	"time"
)

// DocumentFieldResponse represents a recipient's response to an interactive field.
type DocumentFieldResponse struct {
	ID          string          `json:"id"`
	DocumentID  string          `json:"documentId"`
	RecipientID string          `json:"recipientId"`
	FieldID     string          `json:"fieldId"` // matches InteractiveFieldAttrs.ID
	FieldType   string          `json:"fieldType"`
	Response    json.RawMessage `json:"response"` // {"selectedOptionIds":["id1"]} or {"text":"value"}
	CreatedAt   time.Time       `json:"createdAt"`
}
