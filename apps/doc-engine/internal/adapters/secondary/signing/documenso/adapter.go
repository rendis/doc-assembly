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
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strconv"
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

// setAuthHeader sets the authorization header on the request.
func (a *Adapter) setAuthHeader(req *http.Request) {
	req.Header.Set("Authorization", a.config.APIKey)
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

	// Create signature fields for each recipient before distributing
	if len(req.SignatureFields) > 0 {
		if err := a.createSignatureFields(ctx, envelopeID, recipientsResp, req.SignatureFields, req.Recipients); err != nil {
			return nil, fmt.Errorf("creating signature fields: %w", err)
		}
	}

	if err := a.distributeEnvelope(ctx, envelopeID); err != nil {
		return nil, err
	}

	// Fetch envelope details to get recipient tokens for signing URLs
	envDetails, err := a.fetchEnvelope(ctx, envelopeID)
	if err != nil {
		return nil, fmt.Errorf("fetching envelope details for signing URLs: %w", err)
	}

	return a.buildUploadResult(envelopeID, envDetails, req.Recipients), nil
}

// createEnvelope creates a new envelope with the PDF document.
func (a *Adapter) createEnvelope(ctx context.Context, title string, pdf []byte) (string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Create file part with explicit PDF content type
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="files"; filename="document.pdf"`)
	h.Set("Content-Type", "application/pdf")

	part, err := writer.CreatePart(h)
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

	a.setAuthHeader(httpReq)
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
		Data:       payloads,
	}

	recipientsBody, err := json.Marshal(recipientsReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling recipients: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/recipient/create-many", bytes.NewReader(recipientsBody))
	if err != nil {
		return nil, fmt.Errorf("creating recipients request: %w", err)
	}

	a.setAuthHeader(httpReq)
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

// createSignatureFields creates signature fields for each recipient in the envelope.
func (a *Adapter) createSignatureFields(
	ctx context.Context,
	envelopeID string,
	recipientsResp *recipientsResponse,
	signatureFields []port.SignatureFieldPosition,
	recipients []port.SigningRecipient,
) error {
	if len(signatureFields) == 0 {
		return nil
	}

	fieldPayloads := a.buildFieldPayloads(signatureFields, recipients, recipientsResp)
	if len(fieldPayloads) == 0 {
		slog.WarnContext(ctx, "no field payloads built from signature fields")
		return nil
	}

	return a.sendFieldsToAPI(ctx, envelopeID, fieldPayloads)
}

// buildFieldPayloads creates field payloads from signature field positions.
func (a *Adapter) buildFieldPayloads(
	signatureFields []port.SignatureFieldPosition,
	recipients []port.SigningRecipient,
	recipientsResp *recipientsResponse,
) []fieldPayload {
	roleToRecipientIdx := make(map[string]int, len(recipients))
	for i, r := range recipients {
		roleToRecipientIdx[r.RoleID] = i
	}

	fieldPayloads := make([]fieldPayload, 0, len(signatureFields))
	for _, sf := range signatureFields {
		payload := a.buildSingleFieldPayload(sf, roleToRecipientIdx, recipientsResp)
		if payload != nil {
			fieldPayloads = append(fieldPayloads, *payload)
		}
	}
	return fieldPayloads
}

// buildSingleFieldPayload creates a single field payload or returns nil if not possible.
func (a *Adapter) buildSingleFieldPayload(
	sf port.SignatureFieldPosition,
	roleToRecipientIdx map[string]int,
	recipientsResp *recipientsResponse,
) *fieldPayload {
	recipientIdx, ok := roleToRecipientIdx[sf.RoleID]
	if !ok || recipientIdx >= len(recipientsResp.Data) {
		return nil
	}

	providerRecipientID := recipientsResp.Data[recipientIdx].ID

	return &fieldPayload{
		RecipientID: providerRecipientID,
		Type:        "SIGNATURE",
		Page:        sf.Page,
		PositionX:   sf.PositionX,
		PositionY:   sf.PositionY,
		Width:       sf.Width,
		Height:      sf.Height,
	}
}

// sendFieldsToAPI sends field creation request to Documenso API.
func (a *Adapter) sendFieldsToAPI(ctx context.Context, envelopeID string, fieldPayloads []fieldPayload) error {
	fieldsReq := fieldsRequest{EnvelopeID: envelopeID, Data: fieldPayloads}

	fieldsBody, err := json.Marshal(fieldsReq)
	if err != nil {
		return fmt.Errorf("marshaling fields request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		a.config.BaseURL+"/envelope/field/create-many", bytes.NewReader(fieldsBody))
	if err != nil {
		return fmt.Errorf("creating fields request: %w", err)
	}

	a.setAuthHeader(httpReq)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("executing fields request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("documenso API error creating fields (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// distributeEnvelope sends the envelope for signing.
func (a *Adapter) distributeEnvelope(ctx context.Context, envelopeID string) error {
	sendReq := map[string]string{
		"envelopeId": envelopeID,
	}

	sendBody, err := json.Marshal(sendReq)
	if err != nil {
		return fmt.Errorf("marshaling send request: %w", err)
	}

	// v2 endpoint: /envelope/distribute
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, a.config.BaseURL+"/envelope/distribute", bytes.NewReader(sendBody))
	if err != nil {
		return fmt.Errorf("creating distribute request: %w", err)
	}

	a.setAuthHeader(httpReq)
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

// buildUploadResult constructs the upload result from the envelope details.
// It matches recipients by index since the order is preserved from the original request.
func (a *Adapter) buildUploadResult(envelopeID string, envDetails *envelopeDetailResponse, originalRecipients []port.SigningRecipient) *port.UploadDocumentResult {
	result := &port.UploadDocumentResult{
		ProviderDocumentID: envelopeID,
		ProviderName:       providerName,
		Status:             entity.DocumentStatusPending,
		Recipients:         make([]port.RecipientResult, 0, len(originalRecipients)),
	}

	// Match recipients by index (order is preserved from request)
	for i, orig := range originalRecipients {
		if i >= len(envDetails.Recipients) {
			continue
		}
		providerRecipient := envDetails.Recipients[i]

		signingURL := fmt.Sprintf("%s/sign/%s", a.config.SigningBaseURL, providerRecipient.Token)

		result.Recipients = append(result.Recipients, port.RecipientResult{
			RoleID:              orig.RoleID,
			ProviderRecipientID: strconv.Itoa(providerRecipient.ID),
			SigningURL:          signingURL,
			Status:              entity.RecipientStatusSent,
		})
	}

	return result
}

// GetSigningURL returns the URL where a specific recipient can sign the document.
func (a *Adapter) GetSigningURL(ctx context.Context, req *port.GetSigningURLRequest) (*port.GetSigningURLResult, error) {
	envResp, err := a.fetchEnvelope(ctx, req.ProviderDocumentID)
	if err != nil {
		return nil, err
	}

	// Find the recipient and their signing token
	reqRecipientID, err := strconv.Atoi(req.ProviderRecipientID)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient ID: %w", err)
	}

	for _, r := range envResp.Recipients {
		if r.ID == reqRecipientID {
			signingURL := fmt.Sprintf("%s/sign/%s", a.config.SigningBaseURL, r.Token)

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

	a.setAuthHeader(httpReq)

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
			ProviderRecipientID: strconv.Itoa(r.ID),
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

	a.setAuthHeader(httpReq)
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
	Data       []recipientPayload `json:"data"`
}

type recipientResponse struct {
	ID         int    `json:"id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	Status     string `json:"status"`
	Token      string `json:"token,omitempty"`
	SignedAt   string `json:"signedAt,omitempty"`
	ExternalID string `json:"externalId,omitempty"`
}

type recipientsResponse struct {
	Data []recipientData `json:"data"`
}

type recipientData struct {
	ID         int    `json:"id"`
	EnvelopeID string `json:"envelopeId"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	Token      string `json:"token"`
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

// Field creation types for Documenso API

type fieldPayload struct {
	RecipientID int     `json:"recipientId"`
	Type        string  `json:"type"` // "SIGNATURE", "TEXT", "DATE", etc.
	Page        int     `json:"page"` // 1-indexed page number
	PositionX   float64 `json:"positionX"`
	PositionY   float64 `json:"positionY"`
	Width       float64 `json:"width"`
	Height      float64 `json:"height"`
}

type fieldsRequest struct {
	EnvelopeID string         `json:"envelopeId"`
	Data       []fieldPayload `json:"data"`
}
