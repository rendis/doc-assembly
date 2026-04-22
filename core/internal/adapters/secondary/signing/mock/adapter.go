package mock

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

const providerName = "mock"

type mockDocument struct {
	ID             string
	Title          string
	Status         string
	CorrelationKey string
	Recipients     []string
	PDFData        []byte
}

type mockRecipient struct {
	ID         string
	DocumentID string
	RoleID     string
	Email      string
	Name       string
	Token      string
	Status     string
	SignedAt   *time.Time
}

// Adapter implements port.SigningProvider and port.WebhookHandler for testing.
type Adapter struct {
	mu         sync.RWMutex
	documents  map[string]*mockDocument
	recipients map[string]*mockRecipient
	byCorr     map[string]string
}

func New() *Adapter {
	return &Adapter{
		documents:  make(map[string]*mockDocument),
		recipients: make(map[string]*mockRecipient),
		byCorr:     make(map[string]string),
	}
}

func (a *Adapter) ProviderName() string { return providerName }

func (a *Adapter) ProviderCapabilities() port.ProviderCapabilities {
	return port.ProviderCapabilities{
		CanFindByCorrelationKey: true,
		CanCancel:               true,
		CanEmbedSigning:         true,
		CanDownloadCompletedPDF: true,
		WebhookIncludesIDs:      true,
	}
}

func (a *Adapter) SubmitAttemptDocument(_ context.Context, req *port.SubmitAttemptDocumentRequest) (*port.SubmitAttemptDocumentResult, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	if existingID, ok := a.byCorr[req.CorrelationKey]; ok {
		return a.buildSubmitResult(existingID), nil
	}

	docID := uuid.New().String()
	recipientIDs := make([]string, 0, len(req.Recipients))
	for _, r := range req.Recipients {
		recipientID := uuid.New().String()
		token := uuid.New().String()
		recipientIDs = append(recipientIDs, recipientID)
		a.recipients[recipientID] = &mockRecipient{
			ID:         recipientID,
			DocumentID: docID,
			RoleID:     r.RoleID,
			Email:      r.Email,
			Name:       r.Name,
			Token:      token,
			Status:     "SENT",
		}
	}

	a.documents[docID] = &mockDocument{
		ID:             docID,
		Title:          req.Title,
		Status:         "PENDING",
		CorrelationKey: req.CorrelationKey,
		Recipients:     recipientIDs,
		PDFData:        req.PDF,
	}
	a.byCorr[req.CorrelationKey] = docID

	return a.buildSubmitResult(docID), nil
}

func (a *Adapter) FindProviderDocumentByCorrelationKey(_ context.Context, req *port.FindProviderDocumentRequest) (*port.ProviderDocumentResult, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	docID, ok := a.byCorr[req.CorrelationKey]
	if !ok {
		return &port.ProviderDocumentResult{Found: false, ProviderName: providerName, CorrelationKey: req.CorrelationKey}, nil
	}
	doc := a.documents[docID]
	return &port.ProviderDocumentResult{
		Found:              true,
		Usable:             true,
		ProviderDocumentID: doc.ID,
		ProviderName:       providerName,
		CorrelationKey:     doc.CorrelationKey,
		Recipients:         a.recipientResults(doc),
		Status:             mapAttemptStatus(doc.Status),
		RawStatus:          doc.Status,
	}, nil
}

func (a *Adapter) GetProviderDocumentStatus(_ context.Context, req *port.GetProviderDocumentStatusRequest) (*port.ProviderDocumentStatusResult, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	doc, ok := a.documents[req.ProviderDocumentID]
	if !ok {
		return nil, fmt.Errorf("mock: document %s not found", req.ProviderDocumentID)
	}

	recipientResults := make([]port.RecipientStatusResult, 0, len(doc.Recipients))
	allSigned := true
	anyDeclined := false
	for _, rid := range doc.Recipients {
		r := a.recipients[rid]
		status := mapRecipientStatus(r.Status)
		if status != entity.RecipientStatusSigned {
			allSigned = false
		}
		if status == entity.RecipientStatusDeclined {
			anyDeclined = true
		}
		recipientResults = append(recipientResults, port.RecipientStatusResult{
			ProviderRecipientID: r.ID,
			Status:              status,
			SignedAt:            r.SignedAt,
			ProviderStatus:      r.Status,
		})
	}

	status := mapAttemptStatus(doc.Status)
	if anyDeclined {
		status = entity.SigningAttemptStatusDeclined
	} else if allSigned && len(doc.Recipients) > 0 {
		status = entity.SigningAttemptStatusCompleted
	}

	corr := doc.CorrelationKey
	return &port.ProviderDocumentStatusResult{
		Status:              status,
		Recipients:          recipientResults,
		ProviderStatus:      doc.Status,
		ProviderDocumentID:  doc.ID,
		ProviderCorrelation: &corr,
	}, nil
}

func (a *Adapter) GetAttemptRecipientEmbeddedURL(_ context.Context, req *port.GetAttemptRecipientEmbeddedURLRequest) (*port.GetAttemptRecipientEmbeddedURLResult, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	if _, ok := a.recipients[req.ProviderRecipientID]; !ok {
		return nil, fmt.Errorf("mock: recipient %s not found", req.ProviderRecipientID)
	}
	return &port.GetAttemptRecipientEmbeddedURLResult{
		EmbeddedURL:    fmt.Sprintf("http://mock-signing/embed/%s", req.ProviderRecipientID),
		FrameSrcDomain: "http://mock-signing",
	}, nil
}

func (a *Adapter) DownloadCompletedPDF(_ context.Context, req *port.DownloadCompletedPDFRequest) (*port.DownloadCompletedPDFResult, error) {
	a.mu.RLock()
	defer a.mu.RUnlock()

	doc, ok := a.documents[req.ProviderDocumentID]
	if !ok {
		return nil, entity.ErrRecordNotFound
	}
	if doc.Status != "COMPLETED" && doc.Status != "SIGNED" {
		return nil, fmt.Errorf("provider document is not completed")
	}
	return &port.DownloadCompletedPDFResult{
		PDF:         append([]byte(nil), doc.PDFData...),
		Filename:    "signed-document.pdf",
		ContentType: "application/pdf",
	}, nil
}

func (a *Adapter) CleanupProviderDocument(_ context.Context, req *port.CleanupProviderDocumentRequest) (*port.CleanupProviderDocumentResult, error) {
	a.mu.Lock()
	defer a.mu.Unlock()

	doc, ok := a.documents[req.ProviderDocumentID]
	if !ok {
		return nil, fmt.Errorf("mock: document %s not found", req.ProviderDocumentID)
	}
	doc.Status = "VOIDED"
	return &port.CleanupProviderDocumentResult{Action: "CANCEL", Status: "SUCCEEDED"}, nil
}

func (a *Adapter) ParseWebhook(_ context.Context, req *port.ParseWebhookRequest) (*port.WebhookEvent, error) {
	var event port.WebhookEvent
	if err := json.Unmarshal(req.Body, &event); err != nil {
		return nil, fmt.Errorf("mock: parsing webhook: %w", err)
	}
	if event.ProviderName == "" {
		event.ProviderName = providerName
	}
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}
	event.RawPayload = req.Body
	return &event, nil
}

func (a *Adapter) SimulateSign(recipientID string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	r, ok := a.recipients[recipientID]
	if !ok {
		return
	}
	now := time.Now()
	r.Status = "SIGNED"
	r.SignedAt = &now
}

func (a *Adapter) SimulateComplete(documentID string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	doc, ok := a.documents[documentID]
	if !ok {
		return
	}
	now := time.Now()
	for _, rid := range doc.Recipients {
		r := a.recipients[rid]
		r.Status = "SIGNED"
		r.SignedAt = &now
	}
	doc.Status = "COMPLETED"
}

func (a *Adapter) GetMockDocument(documentID string) *mockDocument {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.documents[documentID]
}

func (a *Adapter) GetMockRecipient(recipientID string) *mockRecipient {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.recipients[recipientID]
}

func (a *Adapter) Reset() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.documents = make(map[string]*mockDocument)
	a.recipients = make(map[string]*mockRecipient)
	a.byCorr = make(map[string]string)
}

func (a *Adapter) DocumentCount() int {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return len(a.documents)
}

func (a *Adapter) buildSubmitResult(docID string) *port.SubmitAttemptDocumentResult {
	doc := a.documents[docID]
	return &port.SubmitAttemptDocumentResult{
		ProviderDocumentID: doc.ID,
		ProviderName:       providerName,
		CorrelationKey:     doc.CorrelationKey,
		Recipients:         a.recipientResults(doc),
		InitialStatus:      entity.SigningAttemptStatusSigningReady,
	}
}

func (a *Adapter) recipientResults(doc *mockDocument) []port.RecipientResult {
	out := make([]port.RecipientResult, 0, len(doc.Recipients))
	for _, rid := range doc.Recipients {
		r := a.recipients[rid]
		out = append(out, port.RecipientResult{
			RoleID:               r.RoleID,
			ProviderRecipientID:  r.ID,
			ProviderSigningToken: r.Token,
			SigningURL:           fmt.Sprintf("http://mock-signing/sign/%s", r.ID),
			Status:               entity.RecipientStatusSent,
		})
	}
	return out
}

func mapRecipientStatus(status string) entity.RecipientStatus {
	switch status {
	case "SENT":
		return entity.RecipientStatusSent
	case "SIGNED":
		return entity.RecipientStatusSigned
	case "DECLINED":
		return entity.RecipientStatusDeclined
	case "DELIVERED":
		return entity.RecipientStatusDelivered
	default:
		return entity.RecipientStatusPending
	}
}

func mapAttemptStatus(status string) entity.SigningAttemptStatus {
	switch status {
	case "COMPLETED":
		return entity.SigningAttemptStatusCompleted
	case "VOIDED", "CANCELLED":
		return entity.SigningAttemptStatusCancelled
	case "DECLINED", "REJECTED":
		return entity.SigningAttemptStatusDeclined
	case "OPENED", "SIGNED":
		return entity.SigningAttemptStatusSigning
	default:
		return entity.SigningAttemptStatusSigningReady
	}
}

var (
	_ port.SigningProvider = (*Adapter)(nil)
	_ port.WebhookHandler  = (*Adapter)(nil)
)
