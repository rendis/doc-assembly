package pdfrenderer

import (
	"fmt"
	"html"
	"strings"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// HTMLBuilder constructs complete HTML documents from portable documents.
type HTMLBuilder struct {
	converter *NodeConverter
	styles    string
}

// NewHTMLBuilder creates a new HTML builder.
func NewHTMLBuilder(
	injectables map[string]any,
	injectableDefaults map[string]string,
	signerRoleValues map[string]port.SignerRoleValue,
	signerRoles []portabledoc.SignerRole,
) *HTMLBuilder {
	return &HTMLBuilder{
		converter: NewNodeConverter(injectables, injectableDefaults, signerRoleValues, signerRoles),
		styles:    DefaultStyles(),
	}
}

// Build creates a complete HTML document from a portable document.
func (b *HTMLBuilder) Build(doc *portabledoc.Document) string {
	var sb strings.Builder

	// HTML document start
	sb.WriteString("<!DOCTYPE html>\n")
	sb.WriteString("<html lang=\"")
	sb.WriteString(html.EscapeString(doc.Meta.Language))
	sb.WriteString("\">\n")

	// Head
	sb.WriteString("<head>\n")
	sb.WriteString("  <meta charset=\"UTF-8\">\n")
	sb.WriteString("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n")
	sb.WriteString("  <title>")
	sb.WriteString(html.EscapeString(doc.Meta.Title))
	sb.WriteString("</title>\n")
	sb.WriteString("  <style>\n")
	sb.WriteString(b.styles)
	sb.WriteString(b.pageStyles(&doc.PageConfig))
	sb.WriteString("  </style>\n")
	sb.WriteString("</head>\n")

	// Body
	sb.WriteString("<body>\n")
	sb.WriteString("  <div class=\"document\">\n")

	// Render content
	if doc.Content != nil {
		sb.WriteString(b.converter.ConvertNodes(doc.Content.Content))
	}

	sb.WriteString("  </div>\n")

	// Page numbers (if enabled)
	if doc.PageConfig.ShowPageNumbers {
		sb.WriteString(b.pageNumberScript())
	}

	sb.WriteString("</body>\n")
	sb.WriteString("</html>")

	return sb.String()
}

// pageStyles generates CSS for page configuration.
func (b *HTMLBuilder) pageStyles(config *portabledoc.PageConfig) string {
	// Convert pixels to mm for @page rule (96 DPI)
	const pxToMm = 25.4 / 96.0

	widthMm := config.Width * pxToMm
	heightMm := config.Height * pxToMm
	marginTopMm := config.Margins.Top * pxToMm
	marginBottomMm := config.Margins.Bottom * pxToMm
	marginLeftMm := config.Margins.Left * pxToMm
	marginRightMm := config.Margins.Right * pxToMm

	return fmt.Sprintf(`
    @page {
      size: %.2fmm %.2fmm;
      margin: %.2fmm %.2fmm %.2fmm %.2fmm;
    }

    .document {
      width: %.2fmm;
      min-height: %.2fmm;
      margin: 0 auto;
      padding: %.2fmm %.2fmm %.2fmm %.2fmm;
      box-sizing: border-box;
    }

    @media print {
      .document {
        width: auto;
        min-height: auto;
        padding: 0;
        margin: 0;
      }
    }
`,
		widthMm, heightMm,
		marginTopMm, marginRightMm, marginBottomMm, marginLeftMm,
		widthMm, heightMm,
		marginTopMm, marginRightMm, marginBottomMm, marginLeftMm,
	)
}

// pageNumberScript returns JavaScript for adding page numbers.
// Note: This is mainly for preview purposes; Chrome's PrintToPDF has limited support.
func (b *HTMLBuilder) pageNumberScript() string {
	return `
  <script>
    // Page numbers are handled by the print media
    // This script is for preview purposes only
  </script>
`
}

// BuildPreviewHTML creates HTML specifically for preview (with visual aids).
func (b *HTMLBuilder) BuildPreviewHTML(doc *portabledoc.Document) string {
	// For now, preview and final are the same
	// In the future, preview could show placeholders differently
	return b.Build(doc)
}
