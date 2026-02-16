package pdfrenderer

import (
	"fmt"
	"strings"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
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
	sb.WriteString(b.pageSetup(&doc.PageConfig))

	// Base typography
	sb.WriteString(b.typographySetup())

	// Heading styles
	sb.WriteString(b.headingStyles())

	// Set page dimensions for column and signature field calculations
	b.converter.SetPageWidthPx(doc.PageConfig.Width)
	b.converter.SetContentWidthPx(doc.PageConfig.Width - doc.PageConfig.Margins.Left - doc.PageConfig.Margins.Right)

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
func (b *TypstBuilder) pageSetup(config *portabledoc.PageConfig) string {
	marginTopPt := config.Margins.Top * pxToPt
	marginBottomPt := config.Margins.Bottom * pxToPt
	marginLeftPt := config.Margins.Left * pxToPt
	marginRightPt := config.Margins.Right * pxToPt

	var sb strings.Builder

	// Check if this matches a standard paper size
	paper := detectPaperSize(config.FormatID)
	if paper != "" {
		sb.WriteString(fmt.Sprintf("#set page(\n  paper: \"%s\",\n", paper))
	} else {
		widthPt := config.Width * pxToPt
		heightPt := config.Height * pxToPt
		sb.WriteString(fmt.Sprintf("#set page(\n  width: %.1fpt,\n  height: %.1fpt,\n", widthPt, heightPt))
	}

	sb.WriteString(fmt.Sprintf("  margin: (top: %.1fpt, bottom: %.1fpt, left: %.1fpt, right: %.1fpt),\n",
		marginTopPt, marginBottomPt, marginLeftPt, marginRightPt))

	// Page numbering
	if config.ShowPageNumbers {
		sb.WriteString("  numbering: \"1\",\n")
	}

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
		sb.WriteString(fmt.Sprintf("\"%s\"", font))
	}
	sb.WriteString("),\n")

	sb.WriteString(fmt.Sprintf("  size: %s,\n", b.tokens.BaseFontSize))
	sb.WriteString(fmt.Sprintf("  fill: rgb(\"%s\"),\n", b.tokens.BaseTextColor))
	sb.WriteString("  hyphenate: true,\n")
	sb.WriteString("  number-width: \"proportional\",\n")
	sb.WriteString(")\n\n")

	sb.WriteString(fmt.Sprintf("#set par(leading: %s, spacing: %s)\n\n", b.tokens.ParagraphLeading, b.tokens.ParagraphSpacing))

	return sb.String()
}

// headingStyles generates show rules for heading sizes matching the CSS styles.
func (b *TypstBuilder) headingStyles() string {
	var sb strings.Builder
	for i, size := range b.tokens.HeadingSizes {
		sb.WriteString(fmt.Sprintf("#show heading.where(level: %d): set text(size: %s, weight: %s)\n", i+1, size, b.tokens.HeadingWeight))
	}
	sb.WriteString("\n")
	return sb.String()
}

// RemoteImages returns the map of remote image URLs to local filenames
// collected during build by the converter.
func (b *TypstBuilder) RemoteImages() map[string]string {
	return b.converter.RemoteImages()
}
