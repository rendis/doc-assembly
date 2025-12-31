package documenso

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

const (
	providerName = "documenso"
)

// Adapter implements port.SigningProvider for Documenso.
type Adapter struct {
	config     *Config
	httpClient *http.Client
}

// New creates a new Documenso adapter.
func New(config *Config) (*Adapter, error) {
	if err := config.Validate(); err != nil {
		return nil, err
	}

	return &Adapter{
		config: config,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// ProviderName returns the name of this signing provider.
func (a *Adapter) ProviderName() string {
	return providerName
}

// UploadDocument uploads a PDF document to Documenso and creates a signing envelope.
func (a *Adapter) UploadDocument(ctx context.Context, req *port.UploadDocumentRequest) (*port.UploadDocumentResult, error) {
	// Create multipart form data
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add PDF file
	part, err := writer.CreateFormFile("file", "document.pdf")
	if err != nil {
		return nil, fmt.Errorf("creating form file: %w", err)
	}
	if _, err := part.Write(req.PDF); err != nil {
		return nil, fmt.Errorf("writing PDF to form: %w", err)
	}

	// Add envelope payload
	payload := map[string]any{
		"title": req.Title,
		"type":  "DOCUMENT",
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshaling payload: %w", err)
	}

	if err := writer.WriteField("payload", string(payloadJSON)); err != nil {
		return nil, fmt.Errorf("writing payload field: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("closing multipart writer: %w", err)
	}

	// Create envelope
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/create", &buf)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("documenso API error (status %d): %s", resp.StatusCode, string(body))
	}

	var createResp envelopeResponse
	if err := json.NewDecoder(resp.Body).Decode(&createResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	envelopeID := createResp.ID

	// Add recipients
	recipients := make([]recipientPayload, len(req.Recipients))
	for i, r := range req.Recipients {
		recipients[i] = recipientPayload{
			Email:      r.Email,
			Name:       r.Name,
			Role:       "SIGNER",
			Order:      r.SignerOrder,
			ExternalID: r.RoleID, // Use roleID as external reference
		}
	}

	recipientsReq := recipientsRequest{
		EnvelopeID: envelopeID,
		Recipients: recipients,
	}

	recipientsBody, err := json.Marshal(recipientsReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling recipients: %w", err)
	}

	httpReq, err = http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/recipient/create-many", bytes.NewReader(recipientsBody))
	if err != nil {
		return nil, fmt.Errorf("creating recipients request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err = a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("executing recipients request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("documenso API error adding recipients (status %d): %s", resp.StatusCode, string(body))
	}

	var recipientsResp recipientsResponse
	if err := json.NewDecoder(resp.Body).Decode(&recipientsResp); err != nil {
		return nil, fmt.Errorf("decoding recipients response: %w", err)
	}

	// Distribute (send) the envelope
	distributeReq := distributeRequest{
		EnvelopeID: envelopeID,
	}

	distributeBody, err := json.Marshal(distributeReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling distribute request: %w", err)
	}

	httpReq, err = http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/distribute", bytes.NewReader(distributeBody))
	if err != nil {
		return nil, fmt.Errorf("creating distribute request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err = a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("executing distribute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("documenso API error distributing envelope (status %d): %s", resp.StatusCode, string(body))
	}

	// Build result
	result := &port.UploadDocumentResult{
		ProviderDocumentID: envelopeID,
		ProviderName:       providerName,
		Status:             entity.DocumentStatusPending,
		Recipients:         make([]port.RecipientResult, len(recipientsResp.Recipients)),
	}

	for i, r := range recipientsResp.Recipients {
		result.Recipients[i] = port.RecipientResult{
			RoleID:              r.ExternalID,
			ProviderRecipientID: r.ID,
			Status:              entity.RecipientStatusSent,
		}
	}

	return result, nil
}

// GetSigningURL returns the URL where a specific recipient can sign the document.
func (a *Adapter) GetSigningURL(ctx context.Context, req *port.GetSigningURLRequest) (*port.GetSigningURLResult, error) {
	// Get envelope details to find the signing token
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/envelope/%s", a.config.BaseURL, req.ProviderDocumentID), nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("documenso API error (status %d): %s", resp.StatusCode, string(body))
	}

	var envResp envelopeDetailResponse
	if err := json.NewDecoder(resp.Body).Decode(&envResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	// Find the recipient and their signing token
	for _, r := range envResp.Recipients {
		if r.ID == req.ProviderRecipientID {
			// Construct signing URL
			// The signing URL format depends on Documenso's implementation
			signingURL := fmt.Sprintf("https://app.documenso.com/sign/%s/%s", req.ProviderDocumentID, r.Token)

			return &port.GetSigningURLResult{
				SigningURL: signingURL,
			}, nil
		}
	}

	return nil, fmt.Errorf("recipient %s not found in envelope", req.ProviderRecipientID)
}

// GetDocumentStatus retrieves the current status of a document from Documenso.
func (a *Adapter) GetDocumentStatus(ctx context.Context, providerDocumentID string) (*port.DocumentStatusResult, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/envelope/%s", a.config.BaseURL, providerDocumentID), nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("documenso API error (status %d): %s", resp.StatusCode, string(body))
	}

	var envResp envelopeDetailResponse
	if err := json.NewDecoder(resp.Body).Decode(&envResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	result := &port.DocumentStatusResult{
		Status:         MapEnvelopeStatus(envResp.Status),
		ProviderStatus: envResp.Status,
		Recipients:     make([]port.RecipientStatusResult, len(envResp.Recipients)),
	}

	// Check if all recipients have signed to determine if document is complete
	allSigned := true
	anyDeclined := false

	for i, r := range envResp.Recipients {
		recipientStatus := MapRecipientStatus(r.Status)

		var signedAt *time.Time
		if r.SignedAt != "" {
			if t, err := time.Parse(time.RFC3339, r.SignedAt); err == nil {
				signedAt = &t
			}
		}

		result.Recipients[i] = port.RecipientStatusResult{
			ProviderRecipientID: r.ID,
			Status:              recipientStatus,
			SignedAt:            signedAt,
			ProviderStatus:      r.Status,
		}

		if recipientStatus != entity.RecipientStatusSigned {
			allSigned = false
		}
		if recipientStatus == entity.RecipientStatusDeclined {
			anyDeclined = true
		}
	}

	// Adjust document status based on recipient states
	if anyDeclined {
		result.Status = entity.DocumentStatusDeclined
	} else if allSigned && len(envResp.Recipients) > 0 {
		result.Status = entity.DocumentStatusCompleted
	} else if result.Status == entity.DocumentStatusPending {
		// Check if any recipient has interacted
		for _, r := range result.Recipients {
			if r.Status == entity.RecipientStatusDelivered || r.Status == entity.RecipientStatusSigned {
				result.Status = entity.DocumentStatusInProgress
				break
			}
		}
	}

	// Get completed PDF URL if available
	if result.Status == entity.DocumentStatusCompleted && envResp.CompletedDocumentURL != "" {
		result.CompletedPDFURL = &envResp.CompletedDocumentURL
	}

	return result, nil
}

// CancelDocument cancels/voids a document that is pending signatures.
func (a *Adapter) CancelDocument(ctx context.Context, providerDocumentID string) error {
	cancelReq := map[string]string{
		"envelopeId": providerDocumentID,
	}

	body, err := json.Marshal(cancelReq)
	if err != nil {
		return fmt.Errorf("marshaling cancel request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		a.config.BaseURL+"/envelope/cancel", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("documenso API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// ParseWebhook parses and validates an incoming webhook request.
func (a *Adapter) ParseWebhook(ctx context.Context, body []byte, signature string) (*port.WebhookEvent, error) {
	// Validate signature if secret is configured
	if a.config.WebhookSecret != "" {
		if !a.validateSignature(body, signature) {
			return nil, entity.ErrInvalidWebhookSignature
		}
	}

	var payload webhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("parsing webhook payload: %w", err)
	}

	event := &port.WebhookEvent{
		EventType:          payload.Event,
		ProviderDocumentID: payload.Data.DocumentID,
		Timestamp:          time.Now(),
		RawPayload:         body,
	}

	// Map the event type to status changes
	mapping := MapWebhookEvent(payload.Event)
	event.DocumentStatus = mapping.DocumentStatus
	event.RecipientStatus = mapping.RecipientStatus

	// Extract recipient ID if present
	if payload.Data.RecipientID != "" {
		event.ProviderRecipientID = payload.Data.RecipientID
	}

	return event, nil
}

// validateSignature validates the webhook signature using HMAC-SHA256.
func (a *Adapter) validateSignature(body []byte, signature string) bool {
	if signature == "" {
		return false
	}

	mac := hmac.New(sha256.New, []byte(a.config.WebhookSecret))
	mac.Write(body)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// Ensure Adapter implements the interfaces
var (
	_ port.SigningProvider = (*Adapter)(nil)
	_ port.WebhookHandler  = (*Adapter)(nil)
)

// API request/response types

type envelopeResponse struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

type recipientPayload struct {
	Email      string `json:"email"`
	Name       string `json:"name"`
	Role       string `json:"role"`
	Order      int    `json:"order,omitempty"`
	ExternalID string `json:"externalId,omitempty"`
}

type recipientsRequest struct {
	EnvelopeID string             `json:"envelopeId"`
	Recipients []recipientPayload `json:"recipients"`
}

type recipientResponse struct {
	ID         string `json:"id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	Status     string `json:"status"`
	Token      string `json:"token,omitempty"`
	SignedAt   string `json:"signedAt,omitempty"`
	ExternalID string `json:"externalId,omitempty"`
}

type recipientsResponse struct {
	Recipients []recipientResponse `json:"recipients"`
}

type distributeRequest struct {
	EnvelopeID string `json:"envelopeId"`
}

type envelopeDetailResponse struct {
	ID                   string              `json:"id"`
	Status               string              `json:"status"`
	Title                string              `json:"title"`
	Recipients           []recipientResponse `json:"recipients"`
	CompletedDocumentURL string              `json:"completedDocumentUrl,omitempty"`
	CreatedAt            string              `json:"createdAt"`
	UpdatedAt            string              `json:"updatedAt"`
}

type webhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		DocumentID  string `json:"documentId"`
		RecipientID string `json:"recipientId,omitempty"`
		Status      string `json:"status,omitempty"`
	} `json:"data"`
	Timestamp string `json:"timestamp"`
}
