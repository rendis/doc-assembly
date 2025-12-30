package portabledoc

// SignatureAttrs represents signature block attributes.
type SignatureAttrs struct {
	Count      int             `json:"count"` // 1-4
	Layout     string          `json:"layout"`
	LineWidth  string          `json:"lineWidth"` // "sm" | "md" | "lg"
	Signatures []SignatureItem `json:"signatures"`
}

// SignatureItem represents a single signature in a block.
type SignatureItem struct {
	ID            string   `json:"id"`
	RoleID        *string  `json:"roleId,omitempty"`
	Label         string   `json:"label"`
	Subtitle      *string  `json:"subtitle,omitempty"`
	ImageData     *string  `json:"imageData,omitempty"`
	ImageOriginal *string  `json:"imageOriginal,omitempty"`
	ImageOpacity  *float64 `json:"imageOpacity,omitempty"`
	ImageRotation *int     `json:"imageRotation,omitempty"`
	ImageScale    *float64 `json:"imageScale,omitempty"`
	ImageX        *float64 `json:"imageX,omitempty"`
	ImageY        *float64 `json:"imageY,omitempty"`
}

// IsSigned returns true if signature has image data.
func (s SignatureItem) IsSigned() bool {
	return s.ImageData != nil && *s.ImageData != ""
}

// HasRole returns true if signature has a role assigned.
func (s SignatureItem) HasRole() bool {
	return s.RoleID != nil && *s.RoleID != ""
}

// GetRoleID returns the role ID or empty string if not set.
func (s SignatureItem) GetRoleID() string {
	if s.RoleID == nil {
		return ""
	}
	return *s.RoleID
}

// Signature count constraints.
const (
	MinSignatureCount = 1
	MaxSignatureCount = 4
)

// Line width constants.
const (
	LineWidthSmall  = "sm"
	LineWidthMedium = "md"
	LineWidthLarge  = "lg"
)

// ValidLineWidths contains allowed line widths.
var ValidLineWidths = Set[string]{
	LineWidthSmall:  {},
	LineWidthMedium: {},
	LineWidthLarge:  {},
}

// Layout constants for different signature counts.
const (
	// Single signature layouts (count=1)
	LayoutSingleLeft   = "single-left"
	LayoutSingleCenter = "single-center"
	LayoutSingleRight  = "single-right"

	// Dual signature layouts (count=2)
	LayoutDualSides  = "dual-sides"
	LayoutDualCenter = "dual-center"
	LayoutDualLeft   = "dual-left"
	LayoutDualRight  = "dual-right"

	// Triple signature layouts (count=3)
	LayoutTripleRow      = "triple-row"
	LayoutTriplePyramid  = "triple-pyramid"
	LayoutTripleInverted = "triple-inverted"

	// Quad signature layouts (count=4)
	LayoutQuadGrid        = "quad-grid"
	LayoutQuadTopHeavy    = "quad-top-heavy"
	LayoutQuadBottomHeavy = "quad-bottom-heavy"
)

// ValidLayoutsForCount maps signature count to valid layouts.
var ValidLayoutsForCount = map[int]Set[string]{
	1: {LayoutSingleLeft: {}, LayoutSingleCenter: {}, LayoutSingleRight: {}},
	2: {LayoutDualSides: {}, LayoutDualCenter: {}, LayoutDualLeft: {}, LayoutDualRight: {}},
	3: {LayoutTripleRow: {}, LayoutTriplePyramid: {}, LayoutTripleInverted: {}},
	4: {LayoutQuadGrid: {}, LayoutQuadTopHeavy: {}, LayoutQuadBottomHeavy: {}},
}
