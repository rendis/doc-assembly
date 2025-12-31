package documenso

import (
	"errors"
	"strings"
)

// Config contains the configuration for the Documenso signing provider.
type Config struct {
	// APIKey is the Documenso API key for authentication.
	APIKey string

	// BaseURL is the base URL for the Documenso API.
	// Defaults to "https://app.documenso.com/api/v2" if not set.
	BaseURL string

	// WebhookSecret is the secret key used to validate incoming webhooks.
	WebhookSecret string

	// WebhookURL is the URL where Documenso should send webhook events.
	// This is the public URL of your application's webhook endpoint.
	WebhookURL string
}

// Validate checks if the configuration is valid.
func (c *Config) Validate() error {
	if strings.TrimSpace(c.APIKey) == "" {
		return errors.New("documenso: API key is required")
	}

	// Set default base URL if not provided
	if strings.TrimSpace(c.BaseURL) == "" {
		c.BaseURL = "https://app.documenso.com/api/v2"
	}

	// Ensure base URL doesn't have trailing slash
	c.BaseURL = strings.TrimSuffix(c.BaseURL, "/")

	return nil
}

// DefaultConfig returns a configuration with default values.
func DefaultConfig() *Config {
	return &Config{
		BaseURL: "https://app.documenso.com/api/v2",
	}
}
