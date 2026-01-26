package docuseal

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

const (
	providerName = "docuseal"

	// Page dimensions in points (Letter size)
	pageWidth  = 612.0
	pageHeight = 792.0
)

// Adapter implements port.SigningProvider for DocuSeal.
type Adapter struct {
	config     *Config
	httpClient *http.Client
}

// New creates a new DocuSeal adapter.
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
	req.Header.Set("X-Auth-Token", a.config.APIKey)
	req.Header.Set("Content-Type", "application/json")
}

// UploadDocument uploads a PDF document to DocuSeal and creates a submission.
func (a *Adapter) UploadDocument(ctx context.Context, req *port.UploadDocumentRequest) (*port.UploadDocumentResult, error) {
	submission := a.buildSubmissionRequest(req)

	respBody, err := a.doRequest(ctx, http.MethodPost, "/submissions/pdf", submission)
	if err != nil {
		return nil, fmt.Errorf("creating submission: %w", err)
	}

	var submitters []submitterResponse
	if err := json.Unmarshal(respBody, &submitters); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	if len(submitters) == 0 {
		return nil, fmt.Errorf("no submitters returned from DocuSeal")
	}

	return a.buildUploadResult(submitters, req.Recipients), nil
}

// buildSubmissionRequest constructs the DocuSeal submission request.
func (a *Adapter) buildSubmissionRequest(req *port.UploadDocumentRequest) submissionRequest {
	// Build role name mapping for recipients
	roleToName := make(map[string]string, len(req.Recipients))
	submitters := make([]submitterRequest, len(req.Recipients))

	for i, r := range req.Recipients {
		roleName := fmt.Sprintf("Signer%d", i+1)
		roleToName[r.RoleID] = roleName

		submitters[i] = submitterRequest{
			Role:       roleName,
			Email:      r.Email,
			Name:       r.Name,
			ExternalID: r.RoleID,
		}
	}

	// Build signature fields
	fields := a.buildFields(req.SignatureFields, roleToName)

	return submissionRequest{
		Name: req.Title,
		Documents: []documentRequest{{
			Name:   "document.pdf",
			File:   base64.StdEncoding.EncodeToString(req.PDF),
			Fields: fields,
		}},
		Submitters: submitters,
		SendEmail:  true,
		Order:      "preserved",
	}
}

// buildFields converts signature field positions to DocuSeal field format.
func (a *Adapter) buildFields(fields []port.SignatureFieldPosition, roleToName map[string]string) []fieldRequest {
	result := make([]fieldRequest, 0, len(fields))

	for i, sf := range fields {
		roleName, ok := roleToName[sf.RoleID]
		if !ok {
			continue
		}

		result = append(result, fieldRequest{
			Name:     fmt.Sprintf("signature_%d", i+1),
			Role:     roleName,
			Type:     "signature",
			Required: true,
			Areas:    []fieldArea{convertToPixels(sf)},
		})
	}

	return result
}

// convertToPixels converts percentage-based coordinates to pixels.
func convertToPixels(sf port.SignatureFieldPosition) fieldArea {
	return fieldArea{
		Page: sf.Page,
		X:    int(sf.PositionX / 100.0 * pageWidth),
		Y:    int(sf.PositionY / 100.0 * pageHeight),
		W:    int(sf.Width / 100.0 * pageWidth),
		H:    int(sf.Height / 100.0 * pageHeight),
	}
}

// buildUploadResult constructs the upload result from DocuSeal response.
func (a *Adapter) buildUploadResult(submitters []submitterResponse, originalRecipients []port.SigningRecipient) *port.UploadDocumentResult {
	result := &port.UploadDocumentResult{
		ProviderDocumentID: strconv.Itoa(submitters[0].SubmissionID),
		ProviderName:       providerName,
		Status:             entity.DocumentStatusPending,
		Recipients:         make([]port.RecipientResult, 0, len(submitters)),
	}

	// Create a map from external_id to original recipient for matching
	externalIDToRecipient := make(map[string]port.SigningRecipient, len(originalRecipients))
	for _, r := range originalRecipients {
		externalIDToRecipient[r.RoleID] = r
	}

	for _, s := range submitters {
		var roleID string
		if s.ExternalID != "" {
			roleID = s.ExternalID
		} else {
			// Fallback: try to match by email
			for _, orig := range originalRecipients {
				if orig.Email == s.Email {
					roleID = orig.RoleID
					break
				}
			}
		}

		result.Recipients = append(result.Recipients, port.RecipientResult{
			RoleID:              roleID,
			ProviderRecipientID: strconv.Itoa(s.ID),
			SigningURL:          s.EmbedSrc,
			Status:              MapSubmitterStatus(s.Status),
		})
	}

	return result
}

// GetSigningURL returns the URL where a specific recipient can sign the document.
func (a *Adapter) GetSigningURL(ctx context.Context, req *port.GetSigningURLRequest) (*port.GetSigningURLResult, error) {
	respBody, err := a.doRequest(ctx, http.MethodGet, "/submissions/"+req.ProviderDocumentID, nil)
	if err != nil {
		return nil, err
	}

	var submission submissionDetailResponse
	if err := json.Unmarshal(respBody, &submission); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	// Find the submitter by ID
	reqSubmitterID, err := strconv.Atoi(req.ProviderRecipientID)
	if err != nil {
		return nil, fmt.Errorf("invalid recipient ID: %w", err)
	}

	for _, s := range submission.Submitters {
		if s.ID == reqSubmitterID {
			return &port.GetSigningURLResult{
				SigningURL: s.EmbedSrc,
			}, nil
		}
	}

	return nil, fmt.Errorf("recipient %s not found in submission", req.ProviderRecipientID)
}

// GetDocumentStatus retrieves the current status of a document from DocuSeal.
func (a *Adapter) GetDocumentStatus(ctx context.Context, providerDocumentID string) (*port.DocumentStatusResult, error) {
	respBody, err := a.doRequest(ctx, http.MethodGet, "/submissions/"+providerDocumentID, nil)
	if err != nil {
		return nil, err
	}

	var submission submissionDetailResponse
	if err := json.Unmarshal(respBody, &submission); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	recipientResults := make([]port.RecipientStatusResult, len(submission.Submitters))
	for i, s := range submission.Submitters {
		var signedAt *time.Time
		if s.CompletedAt != "" {
			if t, err := time.Parse(time.RFC3339, s.CompletedAt); err == nil {
				signedAt = &t
			}
		}

		recipientResults[i] = port.RecipientStatusResult{
			ProviderRecipientID: strconv.Itoa(s.ID),
			Status:              MapSubmitterStatus(s.Status),
			SignedAt:            signedAt,
			ProviderStatus:      s.Status,
		}
	}

	result := &port.DocumentStatusResult{
		Status:         MapSubmissionStatus(submission.Submitters),
		ProviderStatus: submission.Status,
		Recipients:     recipientResults,
	}

	if submission.Status == "completed" && len(submission.Documents) > 0 {
		result.CompletedPDFURL = &submission.Documents[0].URL
	}

	return result, nil
}

// CancelDocument cancels/archives a document in DocuSeal.
func (a *Adapter) CancelDocument(ctx context.Context, providerDocumentID string) error {
	_, err := a.doRequest(ctx, http.MethodDelete, "/submissions/"+providerDocumentID, nil)
	return err
}

// ParseWebhook parses and validates an incoming webhook request.
func (a *Adapter) ParseWebhook(ctx context.Context, body []byte, signature string) (*port.WebhookEvent, error) {
	// DocuSeal uses a simple secret header for validation
	if a.config.WebhookSecret != "" && signature != a.config.WebhookSecret {
		return nil, entity.ErrInvalidWebhookSignature
	}

	var payload webhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("parsing webhook payload: %w", err)
	}

	event := &port.WebhookEvent{
		EventType:          payload.EventType,
		ProviderDocumentID: strconv.Itoa(payload.Data.SubmissionID),
		Timestamp:          time.Now(),
		RawPayload:         body,
	}

	// Map the event type to status changes
	mapping := MapWebhookEvent(payload.EventType)
	event.DocumentStatus = mapping.DocumentStatus
	event.RecipientStatus = mapping.RecipientStatus

	// Extract submitter ID if present
	if payload.Data.SubmitterID != 0 {
		event.ProviderRecipientID = strconv.Itoa(payload.Data.SubmitterID)
	}

	return event, nil
}

// doRequest executes an HTTP request to the DocuSeal API.
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
		return nil, fmt.Errorf("docuseal API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// Ensure Adapter implements the interfaces
var (
	_ port.SigningProvider = (*Adapter)(nil)
	_ port.WebhookHandler  = (*Adapter)(nil)
)

// API request/response types

type submissionRequest struct {
	Name       string             `json:"name"`
	Documents  []documentRequest  `json:"documents"`
	Submitters []submitterRequest `json:"submitters"`
	SendEmail  bool               `json:"send_email"`
	Order      string             `json:"order"`
}

type documentRequest struct {
	Name   string         `json:"name"`
	File   string         `json:"file"`
	Fields []fieldRequest `json:"fields,omitempty"`
}

type fieldRequest struct {
	Name     string      `json:"name"`
	Role     string      `json:"role"`
	Type     string      `json:"type"`
	Required bool        `json:"required"`
	Areas    []fieldArea `json:"areas"`
}

type fieldArea struct {
	X    int `json:"x"`
	Y    int `json:"y"`
	W    int `json:"w"`
	H    int `json:"h"`
	Page int `json:"page"`
}

type submitterRequest struct {
	Role       string `json:"role"`
	Email      string `json:"email"`
	Name       string `json:"name,omitempty"`
	ExternalID string `json:"external_id,omitempty"`
}

type submitterResponse struct {
	ID           int    `json:"id"`
	SubmissionID int    `json:"submission_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	EmbedSrc     string `json:"embed_src"`
	Status       string `json:"status"`
	ExternalID   string `json:"external_id,omitempty"`
	CompletedAt  string `json:"completed_at,omitempty"`
}

type submissionDetailResponse struct {
	ID         int                          `json:"id"`
	Status     string                       `json:"status"`
	Submitters []submitterResponse          `json:"submitters"`
	Documents  []submissionDocumentResponse `json:"documents,omitempty"`
	CreatedAt  string                       `json:"created_at"`
	UpdatedAt  string                       `json:"updated_at"`
}

type submissionDocumentResponse struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

type webhookPayload struct {
	EventType string      `json:"event_type"`
	Timestamp string      `json:"timestamp"`
	Data      webhookData `json:"data"`
}

type webhookData struct {
	SubmissionID int    `json:"submission_id"`
	SubmitterID  int    `json:"submitter_id,omitempty"`
	Status       string `json:"status,omitempty"`
}
