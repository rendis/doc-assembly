package port

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
)

// RenderPreviewRequest contains the data needed to render a preview PDF.
type RenderPreviewRequest struct {
	// Document is the parsed portable document to render.
	Document *portabledoc.Document

	// Injectables contains the values to inject into the document.
	// Keys are variable IDs, values are the actual values.
	Injectables map[string]any

	// InjectableDefaults contains default values for injectables.
	// Keys are variable IDs, values are the default string values.
	// Used as fallback when Injectables doesn't contain a value.
	InjectableDefaults map[string]string

	// SignerRoleValues contains resolved values for signer roles.
	// Keys are role IDs, values contain name and email.
	SignerRoleValues map[string]SignerRoleValue
}

// SignerRoleValue contains the resolved name and email for a signer role.
type SignerRoleValue struct {
	Name  string
	Email string
}

// RenderPreviewResult contains the result of rendering a preview PDF.
type RenderPreviewResult struct {
	// PDF contains the raw PDF bytes.
	PDF []byte

	// Filename is the suggested filename for the PDF.
	Filename string

	// PageCount is the number of pages in the generated PDF.
	PageCount int
}

// PDFRenderer defines the interface for PDF rendering operations.
type PDFRenderer interface {
	// RenderPreview generates a preview PDF with injected values.
	// The document is rendered with all variables replaced by their provided values.
	// Conditional blocks are evaluated based on the injectable values.
	// Signature blocks include the anchorString for external signing platforms.
	RenderPreview(ctx context.Context, req *RenderPreviewRequest) (*RenderPreviewResult, error)

	// Close releases any resources held by the renderer.
	// This should be called when the renderer is no longer needed.
	Close() error
}
