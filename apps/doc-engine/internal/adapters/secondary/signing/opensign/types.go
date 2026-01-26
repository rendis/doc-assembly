package opensign

import "time"

// CreateDocumentRequest represents the request body for creating a document in OpenSign.
type CreateDocumentRequest struct {
	File               string   `json:"file"`                           // Base64 encoded PDF
	Title              string   `json:"title"`                          // Document title
	Note               string   `json:"note,omitempty"`                 // Optional note
	Description        string   `json:"description,omitempty"`          // Optional description
	TimeToCompleteDays int      `json:"timeToCompleteDays,omitempty"`   // Days to complete (expiry)
	Signers            []Signer `json:"signers"`                        // List of signers
	FolderID           string   `json:"folderId,omitempty"`             // Optional folder ID
	SendEmail          bool     `json:"send_email"`                     // Send email notifications
	EmailSubject       string   `json:"email_subject,omitempty"`        // Custom email subject
	EmailBody          string   `json:"email_body,omitempty"`           // Custom email body
	SendInOrder        bool     `json:"sendInOrder"`                    // Sequential signing
	EnableOTP          bool     `json:"enableOTP"`                      // OTP verification
	EnableTour         bool     `json:"enableTour"`                     // Guided tour
	RedirectURL        string   `json:"redirect_url,omitempty"`         // Post-signing redirect
	SenderName         string   `json:"sender_name,omitempty"`          // Sender display name
	SenderEmail        string   `json:"sender_email,omitempty"`         // Reply-to email
	AllowModifications bool     `json:"allow_modifications"`            // Allow signer modifications
	AutoReminder       bool     `json:"auto_reminder"`                  // Auto reminders
	RemindOnceInEvery  int      `json:"remind_once_in_every,omitempty"` // Reminder interval days
}

// Signer represents a person who needs to sign the document.
type Signer struct {
	Role    string   `json:"role"`            // Role identifier
	Email   string   `json:"email"`           // Signer email
	Name    string   `json:"name,omitempty"`  // Signer name
	Phone   string   `json:"phone,omitempty"` // Signer phone
	Widgets []Widget `json:"widgets"`         // Signature fields
}

// Widget represents a signature or stamp field position on the document.
type Widget struct {
	Type string  `json:"type"` // "signature" or "stamp"
	Page int     `json:"page"` // Page number (1-indexed)
	X    float64 `json:"x"`    // X coordinate
	Y    float64 `json:"y"`    // Y coordinate
	W    float64 `json:"w"`    // Width
	H    float64 `json:"h"`    // Height
}

// CreateDocumentResponse represents the response from creating a document.
type CreateDocumentResponse struct {
	ObjectID string    `json:"objectId"`              // Document ID
	SignURLs []SignURL `json:"signurl"`               // Signing URLs for each signer
	Message  string    `json:"message"`               // Success message
	Error    string    `json:"error,omitempty"`       // Error message if failed
	URL      string    `json:"url,omitempty"`         // Single URL for self-sign
	DocID    string    `json:"document_id,omitempty"` // Alternative document ID field
}

// SignURL contains the signing URL for a specific signer.
type SignURL struct {
	Email string `json:"email"` // Signer email
	URL   string `json:"url"`   // Signing URL
}

// GetDocumentResponse represents the response from getting document details.
type GetDocumentResponse struct {
	Status             string       `json:"status"`               // Document status
	ObjectID           string       `json:"objectId"`             // Document ID
	File               string       `json:"file"`                 // File URL
	Certificate        string       `json:"certificate"`          // Certificate URL
	Title              string       `json:"title"`                // Document title
	Note               string       `json:"note"`                 // Note
	Folder             *Folder      `json:"folder,omitempty"`     // Folder info
	Owner              string       `json:"owner"`                // Owner name
	Signers            []SignerInfo `json:"signers"`              // Signers with status
	SendInOrder        bool         `json:"sendInOrder"`          // Sequential signing
	CreatedAt          string       `json:"createdAt"`            // Creation timestamp
	UpdatedAt          string       `json:"updatedAt"`            // Update timestamp
	EnableTour         bool         `json:"enableTour"`           // Tour enabled
	RedirectURL        string       `json:"redirect_url"`         // Redirect URL
	AllowModifications bool         `json:"allow_modifications"`  // Modifications allowed
	AuditTrail         []AuditEntry `json:"audit_trail"`          // Audit trail
	TemplateID         string       `json:"template_id"`          // Template ID if from template
	AutoReminder       bool         `json:"auto_reminder"`        // Auto reminder enabled
	RemindOnceInEvery  int          `json:"remind_once_in_every"` // Reminder interval
	Error              string       `json:"error,omitempty"`      // Error message
}

// Folder represents folder information.
type Folder struct {
	ObjectID string `json:"objectId"` // Folder ID
	Name     string `json:"name"`     // Folder name
}

// SignerInfo represents signer information from document details.
type SignerInfo struct {
	Role    string       `json:"role"`    // Signer role
	Name    string       `json:"name"`    // Signer name
	Email   string       `json:"email"`   // Signer email
	Phone   string       `json:"phone"`   // Signer phone
	Widgets []WidgetInfo `json:"widgets"` // Widgets
}

// WidgetInfo represents widget information from document details.
type WidgetInfo struct {
	Type    string                 `json:"type"`    // Widget type
	Page    int                    `json:"page"`    // Page number
	X       float64                `json:"x"`       // X coordinate
	Y       float64                `json:"y"`       // Y coordinate
	W       float64                `json:"w"`       // Width
	H       float64                `json:"h"`       // Height
	Options map[string]interface{} `json:"options"` // Additional options
}

// AuditEntry represents an audit trail entry.
type AuditEntry struct {
	Email  string `json:"email"`  // Signer email
	Viewed string `json:"viewed"` // Viewed timestamp
	Signed string `json:"signed"` // Signed timestamp
}

// DeleteDocumentResponse represents the response from deleting a document.
type DeleteDocumentResponse struct {
	ObjectID  string `json:"objectId"`        // Document ID
	DeletedAt string `json:"deletedAt"`       // Deletion timestamp
	Error     string `json:"error,omitempty"` // Error message
}

// RevokeDocumentRequest represents the request to revoke a document.
type RevokeDocumentRequest struct {
	DocumentID string `json:"document_id"` // Document ID to revoke
}

// RevokeDocumentResponse represents the response from revoking a document.
type RevokeDocumentResponse struct {
	Message string `json:"message"`         // Success message
	Error   string `json:"error,omitempty"` // Error message
}

// WebhookPayload represents an incoming webhook event from OpenSign.
type WebhookPayload struct {
	Event       string    `json:"event"`       // Event type
	DocumentID  string    `json:"documentId"`  // Document ID
	SignerEmail string    `json:"signerEmail"` // Signer email (if applicable)
	Status      string    `json:"status"`      // New status
	Timestamp   time.Time `json:"timestamp"`   // Event timestamp
}
