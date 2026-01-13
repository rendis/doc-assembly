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
	envelopeID, err := a.createEnvelope(ctx, req.Title, req.PDF)
	if err != nil {
		return nil, err
	}

	recipientsResp, err := a.addRecipients(ctx, envelopeID, req.Recipients)
	if err != nil {
		return nil, err
	}

	if err := a.distributeEnvelope(ctx, envelopeID); err != nil {
		return nil, err
	}

	return buildUploadResult(envelopeID, recipientsResp), nil
}

// createEnvelope creates a new envelope with the PDF document.
func (a *Adapter) createEnvelope(ctx context.Context, title string, pdf []byte) (string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile("file", "document.pdf")
	if err != nil {
		return "", fmt.Errorf("creating form file: %w", err)
	}
	if _, err := part.Write(pdf); err != nil {
		return "", fmt.Errorf("writing PDF to form: %w", err)
	}

	payload := map[string]any{
		"title": title,
		"type":  "DOCUMENT",
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshaling payload: %w", err)
	}

	if err := writer.WriteField("payload", string(payloadJSON)); err != nil {
		return "", fmt.Errorf("writing payload field: %w", err)
	}

	if err := writer.Close(); err != nil {
		return "", fmt.Errorf("closing multipart writer: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/create", &buf)
	if err != nil {
		return "", fmt.Errorf("creating request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	httpReq.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("documenso API error (status %d): %s", resp.StatusCode, string(body))
	}

	var createResp envelopeResponse
	if err := json.NewDecoder(resp.Body).Decode(&createResp); err != nil {
		return "", fmt.Errorf("decoding response: %w", err)
	}

	return createResp.ID, nil
}

// addRecipients adds recipients to an envelope.
func (a *Adapter) addRecipients(ctx context.Context, envelopeID string, recipients []port.SigningRecipient) (*recipientsResponse, error) {
	payloads := make([]recipientPayload, len(recipients))
	for i, r := range recipients {
		payloads[i] = recipientPayload{
			Email:      r.Email,
			Name:       r.Name,
			Role:       "SIGNER",
			Order:      r.SignerOrder,
			ExternalID: r.RoleID,
		}
	}

	recipientsReq := recipientsRequest{
		EnvelopeID: envelopeID,
		Recipients: payloads,
	}

	recipientsBody, err := json.Marshal(recipientsReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling recipients: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/recipient/create-many", bytes.NewReader(recipientsBody))
	if err != nil {
		return nil, fmt.Errorf("creating recipients request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(httpReq)
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

	return &recipientsResp, nil
}

// distributeEnvelope sends the envelope for signing.
func (a *Adapter) distributeEnvelope(ctx context.Context, envelopeID string) error {
	distributeReq := distributeRequest{
		EnvelopeID: envelopeID,
	}

	distributeBody, err := json.Marshal(distributeReq)
	if err != nil {
		return fmt.Errorf("marshaling distribute request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/distribute", bytes.NewReader(distributeBody))
	if err != nil {
		return fmt.Errorf("creating distribute request: %w", err)
	}

	httpReq.Header.Set("Authorization", "Bearer "+a.config.APIKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("executing distribute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("documenso API error distributing envelope (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// buildUploadResult constructs the upload result from the envelope and recipients response.
func buildUploadResult(envelopeID string, recipientsResp *recipientsResponse) *port.UploadDocumentResult {
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

	return result
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
	envResp, err := a.fetchEnvelope(ctx, providerDocumentID)
	if err != nil {
		return nil, err
	}

	recipientResults, allSigned, anyDeclined := processRecipients(envResp.Recipients)

	result := &port.DocumentStatusResult{
		Status:         MapEnvelopeStatus(envResp.Status),
		ProviderStatus: envResp.Status,
		Recipients:     recipientResults,
	}

	result.Status = determineFinalStatus(envResp.Status, allSigned, anyDeclined, len(envResp.Recipients), recipientResults)

	if result.Status == entity.DocumentStatusCompleted && envResp.CompletedDocumentURL != "" {
		result.CompletedPDFURL = &envResp.CompletedDocumentURL
	}

	return result, nil
}

// fetchEnvelope retrieves envelope details from the Documenso API.
func (a *Adapter) fetchEnvelope(ctx context.Context, providerDocID string) (*envelopeDetailResponse, error) {
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet,
		fmt.Sprintf("%s/envelope/%s", a.config.BaseURL, providerDocID), nil)
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

	return &envResp, nil
}

// processRecipients converts recipient responses to status results and determines signing states.
func processRecipients(recipients []recipientResponse) ([]port.RecipientStatusResult, bool, bool) {
	results := make([]port.RecipientStatusResult, len(recipients))
	allSigned := true
	anyDeclined := false

	for i, r := range recipients {
		recipientStatus := MapRecipientStatus(r.Status)

		var signedAt *time.Time
		if r.SignedAt != "" {
			if t, err := time.Parse(time.RFC3339, r.SignedAt); err == nil {
				signedAt = &t
			}
		}

		results[i] = port.RecipientStatusResult{
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

	return results, allSigned, anyDeclined
}

// determineFinalStatus determines the final document status based on envelope status and recipient states.
func determineFinalStatus(envStatus string, allSigned, anyDeclined bool, recipientCount int, recipientResults []port.RecipientStatusResult) entity.DocumentStatus {
	if anyDeclined {
		return entity.DocumentStatusDeclined
	}

	if allSigned && recipientCount > 0 {
		return entity.DocumentStatusCompleted
	}

	baseStatus := MapEnvelopeStatus(envStatus)
	if baseStatus != entity.DocumentStatusPending {
		return baseStatus
	}

	for _, r := range recipientResults {
		if r.Status == entity.RecipientStatusDelivered || r.Status == entity.RecipientStatusSigned {
			return entity.DocumentStatusInProgress
		}
	}

	return baseStatus
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
