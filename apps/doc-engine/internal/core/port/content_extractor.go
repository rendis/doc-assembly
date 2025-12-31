// Package port defines output ports (interfaces) for the application.
package port

import "context"

// ContentExtractor extracts text content from binary documents.
type ContentExtractor interface {
	// ExtractText extracts plain text from a binary document.
	// Returns the extracted text or error if extraction fails.
	ExtractText(ctx context.Context, content []byte, mimeType string) (string, error)

	// SupportedTypes returns the list of supported MIME types.
	SupportedTypes() []string
}

// ContentExtractorFactory creates the appropriate extractor based on content type.
type ContentExtractorFactory interface {
	// GetExtractor returns the appropriate extractor for the given content type.
	// Returns an error if the content type is not supported.
	GetExtractor(contentType string) (ContentExtractor, error)
}
