package extractor

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/ledongthuc/pdf"

	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// PDFExtractor extracts text content from PDF documents using ledongthuc/pdf.
type PDFExtractor struct{}

// NewPDFExtractor creates a new PDF extractor.
func NewPDFExtractor() *PDFExtractor {
	return &PDFExtractor{}
}

// ExtractText extracts plain text from a PDF document.
func (e *PDFExtractor) ExtractText(ctx context.Context, content []byte, mimeType string) (string, error) {
	// Validate mime type
	if mimeType != "" && mimeType != "application/pdf" {
		return "", fmt.Errorf("unsupported mime type for PDF extractor: %s", mimeType)
	}

	// Check context cancellation
	select {
	case <-ctx.Done():
		return "", ctx.Err()
	default:
	}

	// Create a reader from bytes
	reader := bytes.NewReader(content)
	size := int64(len(content))

	// Open PDF from reader
	pdfReader, err := pdf.NewReader(reader, size)
	if err != nil {
		return "", fmt.Errorf("opening pdf: %w", err)
	}

	totalPages := pdfReader.NumPage()
	if totalPages == 0 {
		return "", fmt.Errorf("pdf has no pages")
	}

	var result strings.Builder

	for pageNum := 1; pageNum <= totalPages; pageNum++ {
		// Check context cancellation between pages
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
		}

		page := pdfReader.Page(pageNum)
		if page.V.IsNull() {
			continue // Skip null pages
		}

		text, err := page.GetPlainText(nil)
		if err != nil {
			// Log warning but continue with other pages
			continue
		}

		if strings.TrimSpace(text) != "" {
			if result.Len() > 0 {
				result.WriteString("\n\n")
			}
			result.WriteString(text)
		}
	}

	finalText := result.String()
	if strings.TrimSpace(finalText) == "" {
		return "", fmt.Errorf("no text content found in PDF (may be scanned/image-based)")
	}

	return finalText, nil
}

// SupportedTypes returns the list of supported MIME types.
func (e *PDFExtractor) SupportedTypes() []string {
	return []string{"application/pdf"}
}

// readerAt implements io.ReaderAt for bytes.Reader
type readerAt struct {
	r *bytes.Reader
}

func (ra *readerAt) ReadAt(p []byte, off int64) (n int, err error) {
	_, err = ra.r.Seek(off, io.SeekStart)
	if err != nil {
		return 0, err
	}
	return ra.r.Read(p)
}

// Ensure PDFExtractor implements ContentExtractor.
var _ port.ContentExtractor = (*PDFExtractor)(nil)
