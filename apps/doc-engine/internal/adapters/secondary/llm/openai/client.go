// Package openai provides an OpenAI implementation of the LLMClient interface.
package openai

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/sashabaranov/go-openai"

	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
)

// Client implements the port.LLMClient interface using OpenAI's API.
type Client struct {
	client *openai.Client
	config *config.OpenAIConfig
}

// NewClient creates a new OpenAI client.
func NewClient(cfg *config.OpenAIConfig) (*Client, error) {
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("openai api key is required")
	}

	client := openai.NewClient(cfg.APIKey)

	return &Client{
		client: client,
		config: cfg,
	}, nil
}

// GenerateStructured generates structured JSON output from the given request.
func (c *Client) GenerateStructured(ctx context.Context, req *port.LLMGenerationRequest) (*port.LLMGenerationResponse, error) {
	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: req.SystemPrompt,
		},
	}

	// Build user message based on content type
	userMessage, err := c.buildUserMessage(req.UserContent)
	if err != nil {
		return nil, fmt.Errorf("building user message: %w", err)
	}
	messages = append(messages, userMessage)

	// Create chat completion request
	chatReq := openai.ChatCompletionRequest{
		Model:       c.config.Model,
		Messages:    messages,
		MaxTokens:   c.config.MaxTokens,
		Temperature: float32(c.config.Temperature),
	}

	// Only use JSON mode if a schema is provided
	// When no schema is provided, we want plain text output (e.g., Markdown)
	if len(req.JSONSchema) > 0 {
		chatReq.ResponseFormat = &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		}
	}

	// Make the API call
	resp, err := c.client.CreateChatCompletion(ctx, chatReq)
	if err != nil {
		return nil, fmt.Errorf("openai api call: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no choices returned from openai")
	}

	choice := resp.Choices[0]

	return &port.LLMGenerationResponse{
		Content:      json.RawMessage(choice.Message.Content),
		TokensUsed:   resp.Usage.TotalTokens,
		Model:        resp.Model,
		FinishReason: string(choice.FinishReason),
	}, nil
}

// Ping verifies the connection to OpenAI API by listing models.
func (c *Client) Ping(ctx context.Context) error {
	_, err := c.client.ListModels(ctx)
	if err != nil {
		return fmt.Errorf("openai ping failed: %w", err)
	}
	return nil
}

// ProviderName returns "openai".
func (c *Client) ProviderName() string {
	return "openai"
}

// buildUserMessage creates the user message based on content parts.
func (c *Client) buildUserMessage(parts []port.LLMContentPart) (openai.ChatCompletionMessage, error) {
	if len(parts) == 0 {
		return openai.ChatCompletionMessage{}, fmt.Errorf("no content parts provided")
	}

	// For single text content, use simple message
	if len(parts) == 1 && parts[0].Type == port.LLMContentTypeText {
		return openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleUser,
			Content: parts[0].Content,
		}, nil
	}

	// For multi-part or non-text content, use multi-content message
	var multiContent []openai.ChatMessagePart

	for _, part := range parts {
		switch part.Type {
		case port.LLMContentTypeText:
			multiContent = append(multiContent, openai.ChatMessagePart{
				Type: openai.ChatMessagePartTypeText,
				Text: part.Content,
			})

		case port.LLMContentTypeImage:
			// Image content - send as base64 data URL
			dataURL := fmt.Sprintf("data:%s;base64,%s", part.MimeType, part.Content)
			multiContent = append(multiContent, openai.ChatMessagePart{
				Type: openai.ChatMessagePartTypeImageURL,
				ImageURL: &openai.ChatMessageImageURL{
					URL:    dataURL,
					Detail: openai.ImageURLDetailHigh,
				},
			})

		case port.LLMContentTypePDF:
			// PDF content - convert to text instruction for now
			// Note: OpenAI's vision API doesn't directly support PDFs
			// In a full implementation, you would extract text/images from PDF first
			multiContent = append(multiContent, openai.ChatMessagePart{
				Type: openai.ChatMessagePartTypeText,
				Text: fmt.Sprintf("[PDF Document - Base64 content provided. Please analyze and extract the contract structure.]\n\nPDF Content (base64): %s", part.Content[:min(1000, len(part.Content))]+"..."),
			})

		case port.LLMContentTypeDocx:
			// DOCX content - convert to text instruction for now
			// Note: OpenAI's API doesn't directly support DOCX files
			// In a full implementation, you would extract text from DOCX first
			multiContent = append(multiContent, openai.ChatMessagePart{
				Type: openai.ChatMessagePartTypeText,
				Text: fmt.Sprintf("[DOCX Document - Base64 content provided. Please analyze and extract the contract structure.]\n\nDOCX Content (base64): %s", part.Content[:min(1000, len(part.Content))]+"..."),
			})

		default:
			return openai.ChatCompletionMessage{}, fmt.Errorf("unsupported content type: %s", part.Type)
		}
	}

	return openai.ChatCompletionMessage{
		Role:         openai.ChatMessageRoleUser,
		MultiContent: multiContent,
	}, nil
}
