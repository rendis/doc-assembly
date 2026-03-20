package portabledoc

// DocumentHeader represents the letterhead block rendered at the top of the first page.
type DocumentHeader struct {
	Enabled  bool            `json:"enabled"`
	Layout   string          `json:"layout,omitempty"`   // "image-left" | "image-right" | "image-center"
	ImageURL *string         `json:"imageUrl,omitempty"` // data URI or remote URL; nil/empty = no image
	ImageAlt string          `json:"imageAlt,omitempty"`
	Content  *ProseMirrorDoc `json:"content,omitempty"` // ProseMirror doc for header text
}

// Header layout constants.
const (
	HeaderLayoutImageLeft   = "image-left"
	HeaderLayoutImageRight  = "image-right"
	HeaderLayoutImageCenter = "image-center"
)

// HasImage returns true when the header has a non-empty image URL.
func (h *DocumentHeader) HasImage() bool {
	return h.ImageURL != nil && *h.ImageURL != ""
}

// TextNodes returns the top-level content nodes of the header text, or nil if absent.
func (h *DocumentHeader) TextNodes() []Node {
	if h.Content == nil {
		return nil
	}
	return h.Content.Content
}
