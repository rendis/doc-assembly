package opensign

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

const (
	providerName = "opensign"

	// Page dimensions in points (Letter size) for coordinate conversion
	pageWidth  = 612.0
	pageHeight = 792.0
)

// Adapter implements port.SigningProvider for OpenSign.
type Adapter struct {
	config     *Config
	httpClient *http.Client
}

// New creates a new OpenSign adapter.
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
	req.Header.Set("x-api-token", a.config.APIKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
}

// UploadDocument uploads a PDF document to OpenSign and creates a signing request.
func (a *Adapter) UploadDocument(ctx context.Context, req *port.UploadDocumentRequest) (*port.UploadDocumentResult, error) {
	createReq := a.buildCreateDocumentRequest(req)

	respBody, err := a.doRequest(ctx, http.MethodPost, "/createdocument", createReq)
	if err != nil {
		return nil, fmt.Errorf("creating document: %w", err)
	}

	var createResp CreateDocumentResponse
	if err := json.Unmarshal(respBody, &createResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	if createResp.Error != "" {
		return nil, fmt.Errorf("opensign API error: %s", createResp.Error)
	}

	// Get document ID from response (may be in different fields)
	docID := createResp.ObjectID
	if docID == "" {
		docID = createResp.DocID
	}
	if docID == "" {
		return nil, fmt.Errorf("no document ID returned from OpenSign")
	}

	return a.buildUploadResult(docID, createResp.SignURLs, req.Recipients), nil
}

// buildCreateDocumentRequest constructs the OpenSign create document request.
func (a *Adapter) buildCreateDocumentRequest(req *port.UploadDocumentRequest) *CreateDocumentRequest {
	signers := make([]Signer, len(req.Recipients))

	// Group signature fields by role ID
	fieldsByRole := make(map[string][]port.SignatureFieldPosition)
	for _, f := range req.SignatureFields {
		fieldsByRole[f.RoleID] = append(fieldsByRole[f.RoleID], f)
	}

	for i, r := range req.Recipients {
		widgets := make([]Widget, 0)
		if fields, ok := fieldsByRole[r.RoleID]; ok {
			for _, f := range fields {
				widgets = append(widgets, Widget{
					Type: "signature",
					Page: f.Page,
					X:    f.PositionX / 100.0 * pageWidth,
					Y:    f.PositionY / 100.0 * pageHeight,
					W:    f.Width / 100.0 * pageWidth,
					H:    f.Height / 100.0 * pageHeight,
				})
			}
		}

		signers[i] = Signer{
			Role:    r.RoleID,
			Email:   r.Email,
			Name:    r.Name,
			Widgets: widgets,
		}
	}

	return &CreateDocumentRequest{
		File:               base64.StdEncoding.EncodeToString(req.PDF),
		Title:              req.Title,
		Signers:            signers,
		SendEmail:          true,
		SendInOrder:        true,
		EnableOTP:          false,
		EnableTour:         false,
		AllowModifications: false,
		AutoReminder:       false,
		TimeToCompleteDays: 30,
	}
}

// buildUploadResult constructs the upload result from OpenSign response.
func (a *Adapter) buildUploadResult(docID string, signURLs []SignURL, originalRecipients []port.SigningRecipient) *port.UploadDocumentResult {
	result := &port.UploadDocumentResult{
		ProviderDocumentID: docID,
		ProviderName:       providerName,
		Status:             entity.DocumentStatusPending,
		Recipients:         make([]port.RecipientResult, 0, len(originalRecipients)),
	}

	// Create a map from email to sign URL
	emailToURL := make(map[string]string, len(signURLs))
	for _, s := range signURLs {
		emailToURL[s.Email] = s.URL
	}

	for _, r := range originalRecipients {
		signingURL := emailToURL[r.Email]

		result.Recipients = append(result.Recipients, port.RecipientResult{
			RoleID:              r.RoleID,
			ProviderRecipientID: r.Email, // OpenSign uses email as recipient ID
			SigningURL:          signingURL,
			Status:              entity.RecipientStatusPending,
		})
	}

	return result
}

// GetSigningURL returns the URL where a specific recipient can sign the document.
func (a *Adapter) GetSigningURL(ctx context.Context, req *port.GetSigningURLRequest) (*port.GetSigningURLResult, error) {
	// Get document details to find signing URL
	docResp, err := a.getDocument(ctx, req.ProviderDocumentID)
	if err != nil {
		return nil, err
	}

	// OpenSign doesn't store signing URLs in document details after creation
	// The signing URL is only returned when the document is created
	// We need to construct or look up the signing URL differently
	// For now, return an error indicating URL should have been stored from creation
	_ = docResp
	return nil, fmt.Errorf("signing URL not available - OpenSign only provides signing URLs at document creation time")
}

// GetDocumentStatus retrieves the current status of a document from OpenSign.
func (a *Adapter) GetDocumentStatus(ctx context.Context, providerDocumentID string) (*port.DocumentStatusResult, error) {
	docResp, err := a.getDocument(ctx, providerDocumentID)
	if err != nil {
		return nil, err
	}

	// Build audit trail map by email
	auditByEmail := make(map[string]*AuditEntry, len(docResp.AuditTrail))
	for i := range docResp.AuditTrail {
		auditByEmail[docResp.AuditTrail[i].Email] = &docResp.AuditTrail[i]
	}

	recipientResults := make([]port.RecipientStatusResult, len(docResp.Signers))
	for i, s := range docResp.Signers {
		audit := auditByEmail[s.Email]
		var signedAt *time.Time
		if audit != nil && audit.Signed != "" {
			if t, err := time.Parse(time.RFC3339, audit.Signed); err == nil {
				signedAt = &t
			}
		}

		recipientResults[i] = port.RecipientStatusResult{
			ProviderRecipientID: s.Email,
			Status:              MapRecipientStatus(audit, docResp.Status),
			SignedAt:            signedAt,
			ProviderStatus:      docResp.Status,
		}
	}

	result := &port.DocumentStatusResult{
		Status:         MapDocumentStatus(docResp.Status),
		ProviderStatus: docResp.Status,
		Recipients:     recipientResults,
	}

	// If completed, provide the signed document URL
	if docResp.Status == string(StatusCompleted) && docResp.File != "" {
		result.CompletedPDFURL = &docResp.File
	}

	return result, nil
}

// getDocument fetches document details from OpenSign.
func (a *Adapter) getDocument(ctx context.Context, documentID string) (*GetDocumentResponse, error) {
	respBody, err := a.doRequest(ctx, http.MethodGet, "/getdocument/"+documentID, nil)
	if err != nil {
		return nil, err
	}

	var docResp GetDocumentResponse
	if err := json.Unmarshal(respBody, &docResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	if docResp.Error != "" {
		return nil, fmt.Errorf("opensign API error: %s", docResp.Error)
	}

	return &docResp, nil
}

// CancelDocument cancels/revokes a document in OpenSign.
func (a *Adapter) CancelDocument(ctx context.Context, providerDocumentID string) error {
	// OpenSign uses DELETE for document deletion and POST /revokedocument for revocation
	// Try revoke first as it's less destructive
	revokeReq := RevokeDocumentRequest{
		DocumentID: providerDocumentID,
	}

	respBody, err := a.doRequest(ctx, http.MethodPost, "/revokedocument", revokeReq)
	if err != nil {
		// If revoke fails, try delete
		_, deleteErr := a.doRequest(ctx, http.MethodDelete, "/document/"+providerDocumentID, nil)
		if deleteErr != nil {
			return fmt.Errorf("failed to revoke (%v) and delete (%v) document", err, deleteErr)
		}
		return nil
	}

	var revokeResp RevokeDocumentResponse
	if err := json.Unmarshal(respBody, &revokeResp); err != nil {
		return fmt.Errorf("decoding revoke response: %w", err)
	}

	if revokeResp.Error != "" {
		return fmt.Errorf("opensign revoke error: %s", revokeResp.Error)
	}

	return nil
}

// ParseWebhook parses and validates an incoming webhook request.
func (a *Adapter) ParseWebhook(ctx context.Context, body []byte, signature string) (*port.WebhookEvent, error) {
	// OpenSign webhook validation - check secret if configured
	if a.config.WebhookSecret != "" && signature != a.config.WebhookSecret {
		return nil, entity.ErrInvalidWebhookSignature
	}

	var payload WebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("parsing webhook payload: %w", err)
	}

	event := &port.WebhookEvent{
		EventType:          payload.Event,
		ProviderDocumentID: payload.DocumentID,
		Timestamp:          payload.Timestamp,
		RawPayload:         body,
	}

	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	// Map the event type to status changes
	mapping := MapWebhookEvent(payload.Event)
	event.DocumentStatus = mapping.DocumentStatus
	event.RecipientStatus = mapping.RecipientStatus

	// Set recipient ID if signer email is provided
	if payload.SignerEmail != "" {
		event.ProviderRecipientID = payload.SignerEmail
	}

	return event, nil
}

// doRequest executes an HTTP request to the OpenSign API.
func (a *Adapter) doRequest(ctx context.Context, method, path string, body any) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshaling request: %w", err)
		}
		reqBody = bytes.NewReader(jsonBody)
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, a.config.BaseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	a.setAuthHeader(httpReq)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("opensign API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Ensure Adapter implements the interfaces
var (
	_ port.SigningProvider = (*Adapter)(nil)
	_ port.WebhookHandler  = (*Adapter)(nil)
)
