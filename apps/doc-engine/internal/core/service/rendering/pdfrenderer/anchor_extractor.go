package pdfrenderer

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/dslipak/pdf"
)

// AnchorPosition represents coordinates of anchor text in PDF.
type AnchorPosition struct {
	Page       int
	X          float64 // points, left to right
	Y          float64 // points, bottom to top (PDF standard)
	Width      float64 // points
	PageWidth  float64 // points
	PageHeight float64 // points
}

// ExtractAnchorPositions finds anchor texts in PDF and returns their positions.
// Chrome PDFs often have text split into individual characters, so we concatenate
// by Y coordinate to reconstruct lines.
func ExtractAnchorPositions(pdfPath string, anchors []string) (map[string]AnchorPosition, error) {
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
			slog.Warn("skipping page due to content extraction error", "page", pageNum, "error", err)
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
					slog.Debug("found anchor", "anchor", anchor, "line", line.text, "x", line.x, "y", line.y)
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

// ToDocumensoPercentage converts PDF points to Documenso percentage (0-100).
// PDF: Y=0 at bottom, increasing upward
// Documenso: Y=0 at top, increasing downward
func (p AnchorPosition) ToDocumensoPercentage() (posX, posY float64) {
	posX = (p.X / p.PageWidth) * 100
	posY = 100 - ((p.Y / p.PageHeight) * 100)
	return posX, posY
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
