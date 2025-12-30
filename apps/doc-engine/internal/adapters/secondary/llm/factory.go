// Package llm provides LLM client implementations and factory.
package llm

import (
	"fmt"

	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/llm/openai"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
)

// Factory creates LLM clients based on provider configuration.
type Factory struct{}

// NewFactory creates a new LLM client factory.
func NewFactory() *Factory {
	return &Factory{}
}

// CreateClient creates an LLM client based on the configured provider.
// Returns nil and error if the provider is unsupported or configuration is invalid.
func (f *Factory) CreateClient(cfg *config.LLMConfig) (port.LLMClient, error) {
	switch cfg.Provider {
	case "openai":
		return openai.NewClient(&cfg.OpenAI)
	// Future providers can be added here:
	// case "anthropic":
	//     return anthropic.NewClient(&cfg.Anthropic)
	// case "gemini":
	//     return gemini.NewClient(&cfg.Gemini)
	default:
		// If provider is not explicitly set but OpenAI API key is available, use OpenAI
		if cfg.OpenAI.APIKey != "" {
			return openai.NewClient(&cfg.OpenAI)
		}
		return nil, fmt.Errorf("unsupported or unconfigured LLM provider: %s", cfg.Provider)
	}
}
