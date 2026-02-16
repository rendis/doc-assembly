package pdfrenderer

import (
	"context"
	"encoding/xml"
	"fmt"
	"log/slog"
	"os/exec"
	"strconv"
	"strings"

	"github.com/dslipak/pdf"
)

// AnchorPosition represents coordinates of anchor text in PDF.
type AnchorPosition struct {
	Page       int
	X          float64 // points, left to right
	Y          float64 // points, bottom to top (PDF standard)
	Width      float64 // points (anchor text width)
	PageWidth  float64 // points
	PageHeight float64 // points
}

// ExtractAnchorPositions finds anchor texts in PDF and returns their positions.
// Uses the Go dslipak/pdf library first; falls back to pdftotext for Typst PDFs
// that cause the Go library to panic or fail.
func ExtractAnchorPositions(ctx context.Context, pdfPath string, anchors []string) (map[string]AnchorPosition, error) {
	positions, err := extractWithGoLibrary(ctx, pdfPath, anchors)
	if err != nil {
		slog.DebugContext(ctx, "go pdf library failed, trying pdftotext fallback", "error", err)
	} else if len(positions) > 0 {
		return positions, nil
	}

	// Fallback: pdftotext -bbox handles Typst PDFs that crash the Go library.
	slog.DebugContext(ctx, "go pdf library found no anchors, trying pdftotext fallback")
	return extractWithPdftotext(ctx, pdfPath, anchors)
}

// extractWithGoLibrary uses the dslipak/pdf Go library to find anchors.
func extractWithGoLibrary(ctx context.Context, pdfPath string, anchors []string) (map[string]AnchorPosition, error) {
	r, err := pdf.Open(pdfPath)
	if err != nil {
		return nil, err
	}

	positions := make(map[string]AnchorPosition)
	numPages := r.NumPage()

	for pageNum := 1; pageNum <= numPages; pageNum++ {
		page := r.Page(pageNum)
		if page.V.IsNull() {
			continue
		}

		mediaBox := page.V.Key("MediaBox")
		pageWidth := mediaBox.Index(2).Float64()
		pageHeight := mediaBox.Index(3).Float64()

		content, err := safePageContent(page)
		if err != nil {
			slog.DebugContext(ctx, "skipping page due to content extraction error", "page", pageNum, "error", err)
			continue
		}
		lines := groupTextsByLine(content.Text)

		for _, line := range lines {
			for _, anchor := range anchors {
				if strings.Contains(line.text, anchor) {
					positions[anchor] = AnchorPosition{
						Page: pageNum, X: line.x, Y: line.y, Width: line.width,
						PageWidth: pageWidth, PageHeight: pageHeight,
					}
					slog.DebugContext(ctx, "found anchor", "anchor", anchor, "line", line.text, "x", line.x, "y", line.y)
				}
			}
		}
	}

	return positions, nil
}

type textLine struct {
	text  string
	x     float64
	y     float64
	width float64
}

// groupTextsByLine groups text elements by Y coordinate (with tolerance) and concatenates.
func groupTextsByLine(texts []pdf.Text) []textLine {
	if len(texts) == 0 {
		return nil
	}

	// Group by Y coordinate (tolerance of 2 points for same line)
	const yTolerance = 2.0
	lineMap := make(map[int][]pdf.Text) // key is rounded Y

	for _, t := range texts {
		key := int(t.Y / yTolerance)
		lineMap[key] = append(lineMap[key], t)
	}

	// Convert to lines, sorting chars by X within each line
	var lines []textLine
	for _, chars := range lineMap {
		if len(chars) == 0 {
			continue
		}
		// Sort by X
		sortByX(chars)
		// Concatenate
		var sb strings.Builder
		minX := chars[0].X
		maxX := chars[0].X
		avgY := 0.0
		for _, c := range chars {
			sb.WriteString(c.S)
			if c.X < minX {
				minX = c.X
			}
			if c.X+c.W > maxX {
				maxX = c.X + c.W
			}
			avgY += c.Y
		}
		avgY /= float64(len(chars))
		lines = append(lines, textLine{text: sb.String(), x: minX, y: avgY, width: maxX - minX})
	}

	return lines
}

func sortByX(texts []pdf.Text) {
	for i := 0; i < len(texts)-1; i++ {
		for j := i + 1; j < len(texts); j++ {
			if texts[j].X < texts[i].X {
				texts[i], texts[j] = texts[j], texts[i]
			}
		}
	}
}

// extractWithPdftotext uses the pdftotext CLI tool with -bbox flag to find anchors.
// This handles Typst-generated PDFs that cause the Go library to panic.
func extractWithPdftotext(ctx context.Context, pdfPath string, anchors []string) (map[string]AnchorPosition, error) {
	out, err := exec.Command("pdftotext", "-bbox", pdfPath, "-").Output()
	if err != nil {
		return nil, fmt.Errorf("pdftotext -bbox failed: %w", err)
	}

	var doc bboxDoc
	if err := xml.Unmarshal(out, &doc); err != nil {
		return nil, fmt.Errorf("pdftotext XML parse failed: %w", err)
	}

	positions := make(map[string]AnchorPosition)
	for i, page := range doc.Pages {
		pageNum := i + 1
		pw, _ := strconv.ParseFloat(page.Width, 64)
		ph, _ := strconv.ParseFloat(page.Height, 64)
		if pw <= 0 || ph <= 0 {
			slog.DebugContext(ctx, "skipping page with invalid dimensions", "page", pageNum, "width", pw, "height", ph)
			continue
		}
		matchBboxAnchors(ctx, page.Words, anchors, pageNum, pw, ph, positions)
	}

	return positions, nil
}

// matchBboxAnchors searches individual words for anchor strings and populates positions.
// Matching at word level (not line level) ensures each anchor gets its own X coordinate
// even when multiple anchors share the same Y row (e.g., grid layouts).
// pdftotext -bbox uses top-left origin; Y is converted to PDF standard (bottom-left).
func matchBboxAnchors(ctx context.Context, words []bboxWord, anchors []string, pageNum int, pw, ph float64, positions map[string]AnchorPosition) {
	for _, w := range words {
		for _, anchor := range anchors {
			if !strings.Contains(w.Text, anchor) {
				continue
			}
			xMin, _ := strconv.ParseFloat(w.XMin, 64)
			yMin, _ := strconv.ParseFloat(w.YMin, 64)
			xMax, _ := strconv.ParseFloat(w.XMax, 64)
			positions[anchor] = AnchorPosition{
				Page: pageNum, X: xMin, Y: ph - yMin,
				Width: xMax - xMin, PageWidth: pw, PageHeight: ph,
			}
			slog.DebugContext(ctx, "pdftotext found anchor", "anchor", anchor, "x", xMin, "y", ph-yMin, "page", pageNum)
		}
	}
}

// bboxDoc represents the XML output of pdftotext -bbox.
type bboxDoc struct {
	XMLName xml.Name   `xml:"html"`
	Pages   []bboxPage `xml:"body>doc>page"`
}

type bboxPage struct {
	Width  string     `xml:"width,attr"`
	Height string     `xml:"height,attr"`
	Words  []bboxWord `xml:"word"`
}

type bboxWord struct {
	XMin string `xml:"xMin,attr"`
	YMin string `xml:"yMin,attr"`
	XMax string `xml:"xMax,attr"`
	YMax string `xml:"yMax,attr"`
	Text string `xml:",chardata"`
}

// safePageContent extracts page content with panic recovery.
// Some PDF generators (e.g., Typst) produce font encodings that the dslipak/pdf
// library cannot handle, causing panics in page.Content().
func safePageContent(page pdf.Page) (content pdf.Content, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("pdf content extraction panicked: %v", r)
		}
	}()
	content = page.Content()
	return content, nil
}
