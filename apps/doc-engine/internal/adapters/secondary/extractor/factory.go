// Package extractor provides content extraction adapters for different document types.
package extractor

import (
	"fmt"

	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// Factory creates content extractors based on content type.
type Factory struct {
	pdfExtractor *PDFExtractor
	// Future: docxExtractor, imageExtractor
}

// NewFactory creates a new extractor factory.
func NewFactory() *Factory {
	return &Factory{
		pdfExtractor: NewPDFExtractor(),
	}
}

// GetExtractor returns the appropriate extractor for the given content type.
func (f *Factory) GetExtractor(contentType string) (port.ContentExtractor, error) {
	switch contentType {
	case "pdf":
		return f.pdfExtractor, nil
	// Future implementations:
	// case "docx":
	//     return f.docxExtractor, nil
	// case "image":
	//     return f.imageExtractor, nil
	default:
		return nil, fmt.Errorf("unsupported content type: %s", contentType)
	}
}

// Ensure Factory implements ContentExtractorFactory.
var _ port.ContentExtractorFactory = (*Factory)(nil)
