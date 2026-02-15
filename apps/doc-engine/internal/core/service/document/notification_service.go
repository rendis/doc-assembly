package document

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/doc-assembly/doc-engine/internal/core/port"
)

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

		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Reminder: Please sign \"%s\"", title),
			HTMLBody: buildReminderHTML(title, recipient.Name),
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
		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Document ready for signature: \"%s\"", title),
			HTMLBody: buildDocumentCreatedHTML(title, recipient.Name),
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
		req := &port.NotificationRequest{
			To:       recipient.Email,
			Subject:  fmt.Sprintf("Document signed: \"%s\"", title),
			HTMLBody: buildDocumentCompletedHTML(title, recipient.Name),
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

// buildReminderHTML generates the reminder email body.
func buildReminderHTML(title, recipientName string) string {
	return fmt.Sprintf(`<html><body>
<p>Hello %s,</p>
<p>This is a reminder that the document <strong>%s</strong> is awaiting your signature.</p>
<p>Please review and sign the document at your earliest convenience.</p>
</body></html>`, recipientName, title)
}

// buildDocumentCreatedHTML generates the document created email body.
func buildDocumentCreatedHTML(title, recipientName string) string {
	return fmt.Sprintf(`<html><body>
<p>Hello %s,</p>
<p>A document <strong>%s</strong> has been prepared and is ready for your signature.</p>
<p>Please review and sign the document at your earliest convenience.</p>
</body></html>`, recipientName, title)
}

// buildDocumentCompletedHTML generates the document completed email body.
func buildDocumentCompletedHTML(title, recipientName string) string {
	return fmt.Sprintf(`<html><body>
<p>Hello %s,</p>
<p>The document <strong>%s</strong> has been fully signed by all parties.</p>
</body></html>`, recipientName, title)
}
