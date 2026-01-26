package docuseal

import (
	"errors"
	"strings"
)

// Config contains the configuration for the DocuSeal signing provider.
type Config struct {
	// APIKey is the DocuSeal API key for authentication.
	APIKey string

	// BaseURL is the base URL for the DocuSeal API.
	// Defaults to "https://api.docuseal.com" if not set.
	BaseURL string

	// WebhookSecret is the secret key used to validate incoming webhooks.
	WebhookSecret string
}

// Validate checks if the configuration is valid.
func (c *Config) Validate() error {
	if strings.TrimSpace(c.APIKey) == "" {
		return errors.New("docuseal: API key is required")
	}

	// Set default base URL if not provided
	if strings.TrimSpace(c.BaseURL) == "" {
		c.BaseURL = "https://api.docuseal.com"
	}

	// Ensure base URL doesn't have trailing slash
	c.BaseURL = strings.TrimSuffix(c.BaseURL, "/")

	return nil
}

// DefaultConfig returns a configuration with default values.
func DefaultConfig() *Config {
	return &Config{
		BaseURL: "https://api.docuseal.com",
	}
}
