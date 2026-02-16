package gmail

import (
	smtpnotification "github.com/doc-assembly/doc-engine/internal/adapters/secondary/notification/smtp"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

const (
	gmailHost = "smtp.gmail.com"
	gmailPort = 587
)

// New creates a notification adapter configured for Gmail SMTP.
// The appPassword should be a Gmail App Password (not the account password).
func New(username, appPassword, fromAddress string) port.NotificationProvider {
	return smtpnotification.New(&smtpnotification.Config{
		Host:     gmailHost,
		Port:     gmailPort,
		Username: username,
		Password: appPassword,
		From:     fromAddress,
	})
}
