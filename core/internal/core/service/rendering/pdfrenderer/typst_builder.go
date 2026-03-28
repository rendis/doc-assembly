package pdfrenderer

import (
	"fmt"
	"strings"

	"github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

// pxToPt converts pixels (at 96 DPI) to typographic points.
const pxToPt = 0.75 // 1px at 96 DPI = 0.75pt

// TypstBuilder constructs complete Typst documents from portable documents.
// It generates the document preamble (page setup, fonts, heading styles)
// and delegates node-by-node conversion to a TypstConverter.
type TypstBuilder struct {
	converter TypstConverter
	tokens    TypstDesignTokens
}

// NewTypstBuilder creates a new Typst builder with the given converter and design tokens.
func NewTypstBuilder(converter TypstConverter, tokens TypstDesignTokens) *TypstBuilder {
	return &TypstBuilder{
		converter: converter,
		tokens:    tokens,
	}
}

// Build creates a complete Typst document from a portable document.
// Returns the Typst source, page count, and signature fields.
func (b *TypstBuilder) Build(doc *portabledoc.Document) (string, int, []port.SignatureField) {
	var sb strings.Builder

	// Package imports
	sb.WriteString("#import \"@preview/wrap-it:0.1.1\": wrap-content\n\n")

	// Page configuration
	hasHeader := doc.Header != nil && doc.Header.Enabled
	sb.WriteString(b.pageSetup(&doc.PageConfig, hasHeader))

	// Base typography
	sb.WriteString(b.typographySetup())

	// Heading styles
	sb.WriteString(b.headingStyles())

	// Set page dimensions for column and signature field calculations
	b.converter.SetPageWidthPx(doc.PageConfig.Width)
	b.converter.SetContentWidthPx(doc.PageConfig.Width - doc.PageConfig.Margins.Left - doc.PageConfig.Margins.Right)

	// Render header block (letterhead, first page only)
	if doc.Header != nil && doc.Header.Enabled {
		sb.WriteString(b.headerBlock(doc.Header))
	}

	// Render content via converter
	if doc.Content != nil {
		typstContent, signatureFields := b.converter.ConvertNodes(doc.Content.Content)
		sb.WriteString(typstContent)
		pageCount := b.converter.GetCurrentPage()
		return sb.String(), pageCount, signatureFields
	}

	return sb.String(), 1, nil
}

// pageSetup generates #set page(...) directive from PageConfig.
func (b *TypstBuilder) pageSetup(config *portabledoc.PageConfig, hasHeader bool) string {
	marginTopPt := config.Margins.Top * pxToPt
	if hasHeader {
		marginTopPt /= 2
	}
	var sb strings.Builder

	// Check if this matches a standard paper size
	paper := detectPaperSize(config.FormatID)
	if paper != "" {
		fmt.Fprintf(&sb, "#set page(\n  paper: %q,\n", paper)
	} else {
		widthPt := config.Width * pxToPt
		heightPt := config.Height * pxToPt
		fmt.Fprintf(&sb, "#set page(\n  width: %.1fpt,\n  height: %.1fpt,\n", widthPt, heightPt)
	}

	fmt.Fprintf(&sb, "  margin: (top: %.1fpt, bottom: %.1fpt, left: %.1fpt, right: %.1fpt),\n",
		marginTopPt,
		config.Margins.Bottom*pxToPt,
		config.Margins.Left*pxToPt,
		config.Margins.Right*pxToPt,
	)

	// Page numbering (always enabled)
	sb.WriteString("  numbering: \"1 / 1\",\n")

	sb.WriteString(")\n\n")
	return sb.String()
}

// detectPaperSize maps FormatID to Typst paper names.
func detectPaperSize(formatID string) string {
	switch formatID {
	case portabledoc.PageFormatA4:
		return "a4"
	case portabledoc.PageFormatLetter:
		return "us-letter"
	case portabledoc.PageFormatLegal:
		return "us-legal"
	default:
		return "" // Custom -- use explicit width/height
	}
}

// typographySetup generates base text and paragraph settings.
func (b *TypstBuilder) typographySetup() string {
	var sb strings.Builder
	sb.WriteString("#set text(\n")

	// Font stack
	sb.WriteString("  font: (")
	for i, font := range b.tokens.FontStack {
		if i > 0 {
			sb.WriteString(", ")
		}
		fmt.Fprintf(&sb, "%q", font)
	}
	sb.WriteString("),\n")

	fmt.Fprintf(&sb, "  size: %s,\n", b.tokens.BaseFontSize)
	fmt.Fprintf(&sb, "  fill: rgb(%q),\n", b.tokens.BaseTextColor)
	sb.WriteString("  hyphenate: true,\n")
	sb.WriteString("  number-width: \"proportional\",\n")
	sb.WriteString(")\n\n")

	fmt.Fprintf(&sb, "#set par(leading: %s, spacing: %s)\n\n", b.tokens.ParagraphLeading, b.tokens.ParagraphSpacing)

	return sb.String()
}

// headingStyles generates show rules for heading sizes matching the CSS styles.
func (b *TypstBuilder) headingStyles() string {
	var sb strings.Builder
	for i, size := range b.tokens.HeadingSizes {
		fmt.Fprintf(&sb, "#show heading.where(level: %d): set text(size: %s, weight: %s)\n", i+1, size, b.tokens.HeadingWeight)
	}
	sb.WriteString("\n")
	return sb.String()
}

// RemoteImages returns the map of remote image URLs to local filenames
// collected during build by the converter.
func (b *TypstBuilder) RemoteImages() map[string]string {
	return b.converter.RemoteImages()
}

// headerBlock renders the document header (letterhead) as a Typst content block.
// It supports three layout modes: image-left, image-right, and image-center.
func (b *TypstBuilder) headerBlock(header *portabledoc.DocumentHeader) string {
	imageTypst := b.renderHeaderImage(header)
	textTypst := b.renderHeaderText(header.TextNodes())

	var content string

	switch header.Layout {
	case portabledoc.HeaderLayoutImageCenter:
		content = renderCenteredHeader(imageTypst, textTypst)
	case portabledoc.HeaderLayoutImageRight:
		content = renderTwoColumnHeader(textTypst, imageTypst, false, "(1fr, 30%)", "(left + top, center + horizon)")
	default: // image-left (default)
		content = renderTwoColumnHeader(imageTypst, textTypst, true, "(30%, 1fr)", "(center + horizon, left + top)")
	}

	return content + "#v(1em)\n"
}

func (b *TypstBuilder) renderHeaderImage(header *portabledoc.DocumentHeader) string {
	if !header.HasImage() {
		return ""
	}

	imageFilename := b.converter.RegisterRemoteImage(*header.ImageURL)
	return fmt.Sprintf("#image(%q, height: 90pt)", imageFilename)
}

func (b *TypstBuilder) renderHeaderText(nodes []portabledoc.Node) string {
	if len(nodes) == 0 {
		return ""
	}

	converted, _ := b.converter.ConvertNodes(nodes)
	return converted
}

func renderCenteredHeader(imageTypst, textTypst string) string {
	if imageTypst != "" {
		return fmt.Sprintf("#pad(y: 6pt)[#align(center)[%s]]\n", imageTypst)
	}
	if textTypst != "" {
		return fmt.Sprintf("#align(center)[%s]\n", textTypst)
	}
	return ""
}

func renderTwoColumnHeader(leftContent, rightContent string, imageOnLeft bool, columns, align string) string {
	switch {
	case leftContent != "" && rightContent != "":
		return fmt.Sprintf(
			"#grid(\n  columns: %s,\n  column-gutter: 1em,\n  align: %s,\n  [%s],\n  [%s],\n)\n",
			columns,
			align,
			leftContent,
			rightContent,
		)
	case leftContent != "":
		if imageOnLeft {
			return fmt.Sprintf("#align(center)[%s]\n", leftContent)
		}
		return leftContent
	case rightContent != "":
		if imageOnLeft {
			return rightContent
		}
		return fmt.Sprintf("#align(center)[%s]\n", rightContent)
	default:
		return ""
	}
}
