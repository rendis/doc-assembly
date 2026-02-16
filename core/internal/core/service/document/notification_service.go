package document

import (
	"bytes"
	"context"
	"embed"
	"fmt"
	"html/template"
	"log/slog"

	"github.com/rendis/doc-assembly/core/internal/core/port"
)

//go:embed templates/*.html
var templateFS embed.FS

var emailTemplates = template.Must(template.ParseFS(templateFS, "templates/*.html"))

// templateData holds the data passed to all email templates.
type templateData struct {
	RecipientName string
	DocumentTitle string
	ActionURL     string
	CompanyName   string
}

const defaultCompanyName = "Doc Engine"

// NotificationService handles sending document-related notifications.
type NotificationService struct {
	provider      port.NotificationProvider
	recipientRepo port.DocumentRecipientRepository
	documentRepo  port.DocumentRepository
}

// NewNotificationService creates a new notification service.
func NewNotificationService(
	provider port.NotificationProvider,
	recipientRepo port.DocumentRecipientRepository,
	documentRepo port.DocumentRepository,
) *NotificationService {
	return &NotificationService{
		provider:      provider,
		recipientRepo: recipientRepo,
		documentRepo:  documentRepo,
	}
}

// SendReminder sends a reminder notification to pending recipients of a document.
func (s *NotificationService) SendReminder(ctx context.Context, documentID string) error {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		return fmt.Errorf("finding document: %w", err)
	}

	if doc.IsTerminal() {
		return fmt.Errorf("cannot send reminder for document in terminal state: %s", doc.Status)
	}

	recipients, err := s.recipientRepo.FindByDocumentID(ctx, documentID)
	if err != nil {
		return fmt.Errorf("finding recipients: %w", err)
	}

	title := "Document"
	if doc.Title != nil {
		title = *doc.Title
	}

	sent := 0
	for _, recipient := range recipients {
		if recipient.IsSigned() || recipient.IsDeclined() {
			continue
		}

		body, renderErr := renderTemplate("signing_reminder.html", templateData{
			RecipientName: recipient.Name,
			DocumentTitle: title,
			CompanyName:   defaultCompanyName,
		})
		if renderErr != nil {
			slog.ErrorContext(ctx, "failed to render reminder template", slog.String("error", renderErr.Error()))
			continue
		}

		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Reminder: Please sign \"%s\"", title),
			HTMLBody: body,
		}

		if err := s.provider.Send(ctx, req); err != nil {
			slog.WarnContext(ctx, "failed to send reminder",
				slog.String("document_id", documentID),
				slog.String("recipient_id", recipient.ID),
				slog.String("email", recipient.Email),
				slog.String("error", err.Error()),
			)
			continue
		}
		sent++
	}

	slog.InfoContext(ctx, "reminders sent",
		slog.String("document_id", documentID),
		slog.Int("sent", sent),
		slog.Int("total_recipients", len(recipients)),
	)

	return nil
}

// NotifyDocumentCreated sends notifications to all recipients of a newly created document.
func (s *NotificationService) NotifyDocumentCreated(ctx context.Context, documentID string) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find document for notification", slog.String("error", err.Error()))
		return
	}

	recipients, err := s.recipientRepo.FindByDocumentID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find recipients for notification", slog.String("error", err.Error()))
		return
	}

	title := "Document"
	if doc.Title != nil {
		title = *doc.Title
	}

	for _, recipient := range recipients {
		body, renderErr := renderTemplate("signing_request.html", templateData{
			RecipientName: recipient.Name,
			DocumentTitle: title,
			CompanyName:   defaultCompanyName,
		})
		if renderErr != nil {
			slog.ErrorContext(ctx, "failed to render signing request template", slog.String("error", renderErr.Error()))
			continue
		}

		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Document ready for signature: \"%s\"", title),
			HTMLBody: body,
		}

		if err := s.provider.Send(ctx, req); err != nil {
			slog.WarnContext(ctx, "failed to send document created notification",
				slog.String("document_id", documentID),
				slog.String("email", recipient.Email),
				slog.String("error", err.Error()),
			)
		}
	}
}

// NotifyDocumentCompleted sends a notification that the document is fully signed.
func (s *NotificationService) NotifyDocumentCompleted(ctx context.Context, documentID string) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find document for completion notification", slog.String("error", err.Error()))
		return
	}

	recipients, err := s.recipientRepo.FindByDocumentID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find recipients for completion notification", slog.String("error", err.Error()))
		return
	}

	title := "Document"
	if doc.Title != nil {
		title = *doc.Title
	}

	for _, recipient := range recipients {
		body, renderErr := renderTemplate("signing_completed.html", templateData{
			RecipientName: recipient.Name,
			DocumentTitle: title,
			CompanyName:   defaultCompanyName,
		})
		if renderErr != nil {
			slog.ErrorContext(ctx, "failed to render completed template", slog.String("error", renderErr.Error()))
			continue
		}

		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Document signed: \"%s\"", title),
			HTMLBody: body,
		}

		if err := s.provider.Send(ctx, req); err != nil {
			slog.WarnContext(ctx, "failed to send completion notification",
				slog.String("document_id", documentID),
				slog.String("email", recipient.Email),
				slog.String("error", err.Error()),
			)
		}
	}
}

// NotifyDocumentDeclined sends a notification that a signer has declined.
func (s *NotificationService) NotifyDocumentDeclined(ctx context.Context, documentID string) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find document for declined notification", slog.String("error", err.Error()))
		return
	}

	recipients, err := s.recipientRepo.FindByDocumentID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find recipients for declined notification", slog.String("error", err.Error()))
		return
	}

	title := "Document"
	if doc.Title != nil {
		title = *doc.Title
	}

	for _, recipient := range recipients {
		body, renderErr := renderTemplate("signing_declined.html", templateData{
			RecipientName: recipient.Name,
			DocumentTitle: title,
			CompanyName:   defaultCompanyName,
		})
		if renderErr != nil {
			slog.ErrorContext(ctx, "failed to render declined template", slog.String("error", renderErr.Error()))
			continue
		}

		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Signing declined: \"%s\"", title),
			HTMLBody: body,
		}

		if err := s.provider.Send(ctx, req); err != nil {
			slog.WarnContext(ctx, "failed to send declined notification",
				slog.String("document_id", documentID),
				slog.String("email", recipient.Email),
				slog.String("error", err.Error()),
			)
		}
	}
}

// NotifyDocumentExpired sends a notification that the signing period has expired.
func (s *NotificationService) NotifyDocumentExpired(ctx context.Context, documentID string) {
	doc, err := s.documentRepo.FindByID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find document for expiration notification", slog.String("error", err.Error()))
		return
	}

	recipients, err := s.recipientRepo.FindByDocumentID(ctx, documentID)
	if err != nil {
		slog.WarnContext(ctx, "failed to find recipients for expiration notification", slog.String("error", err.Error()))
		return
	}

	title := "Document"
	if doc.Title != nil {
		title = *doc.Title
	}

	for _, recipient := range recipients {
		body, renderErr := renderTemplate("document_expired.html", templateData{
			RecipientName: recipient.Name,
			DocumentTitle: title,
			CompanyName:   defaultCompanyName,
		})
		if renderErr != nil {
			slog.ErrorContext(ctx, "failed to render expired template", slog.String("error", renderErr.Error()))
			continue
		}

		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Document expired: \"%s\"", title),
			HTMLBody: body,
		}

		if err := s.provider.Send(ctx, req); err != nil {
			slog.WarnContext(ctx, "failed to send expiration notification",
				slog.String("document_id", documentID),
				slog.String("email", recipient.Email),
				slog.String("error", err.Error()),
			)
		}
	}
}

// renderTemplate executes the named template with the given data and returns the rendered HTML.
func renderTemplate(name string, data templateData) (string, error) {
	var buf bytes.Buffer
	if err := emailTemplates.ExecuteTemplate(&buf, name, data); err != nil {
		return "", fmt.Errorf("executing template %s: %w", name, err)
	}
	return buf.String(), nil
}
