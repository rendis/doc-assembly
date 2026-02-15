package pdfrenderer

import (
	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// TypstConverter defines the interface for converting portable document nodes to Typst markup.
type TypstConverter interface {
	// ConvertNodes converts a slice of portable document nodes to Typst markup.
	// Returns the Typst source string and any signature fields found during conversion.
	ConvertNodes(nodes []portabledoc.Node) (string, []port.SignatureField)

	// GetCurrentPage returns the current page number (1-indexed).
	// This accounts for page breaks encountered during conversion.
	GetCurrentPage() int

	// RemoteImages returns a map of remote image URLs to their placeholder filenames
	// used in the generated Typst source. These images need to be resolved (downloaded
	// or served from cache) before the Typst source can be compiled.
	RemoteImages() map[string]string

	// SetContentWidthPx sets the page content area width in pixels.
	// Used for computing proportional table column widths.
	SetContentWidthPx(width float64)
}
