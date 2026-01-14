package pdfrenderer

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// Service implements the PDFRenderer interface.
type Service struct {
	chrome *ChromeRenderer
}

// NewService creates a new PDF renderer service.
func NewService(opts ChromeOptions) (*Service, error) {
	chrome, err := NewChromeRenderer(opts)
	if err != nil {
		return nil, fmt.Errorf("failed to create chrome renderer: %w", err)
	}

	return &Service{
		chrome: chrome,
	}, nil
}

// RenderPreview generates a preview PDF with injected values.
func (s *Service) RenderPreview(ctx context.Context, req *port.RenderPreviewRequest) (*port.RenderPreviewResult, error) {
	if req.Document == nil {
		return nil, fmt.Errorf("document is required")
	}

	// Resolve signer role values if not provided
	signerRoleValues := req.SignerRoleValues
	if signerRoleValues == nil {
		signerRoleValues = s.resolveSignerRoleValues(req.Document.SignerRoles, req.Injectables)
	}

	// Ensure defaults map is not nil
	injectableDefaults := req.InjectableDefaults
	if injectableDefaults == nil {
		injectableDefaults = make(map[string]string)
	}

	// Build HTML from document using HTMLBuilder with signature tracking
	builder := NewHTMLBuilder(req.Injectables, injectableDefaults, signerRoleValues, req.Document.SignerRoles)
	htmlContent := builder.Build(req.Document)

	// Get signature fields and page count from the builder
	signatureFields := builder.GetSignatureFields()
	pageCount := builder.GetPageCount()

	// Generate PDF using Chrome
	pdfBytes, err := s.chrome.GeneratePDF(ctx, htmlContent, req.Document.PageConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	// Extract actual anchor positions from generated PDF
	if len(signatureFields) > 0 {
		signatureFields = s.extractAndUpdatePositions(ctx, pdfBytes, signatureFields)
	}

	// Generate filename from document title
	filename := s.generateFilename(req.Document.Meta.Title)

	return &port.RenderPreviewResult{
		PDF:             pdfBytes,
		Filename:        filename,
		PageCount:       pageCount,
		SignatureFields: signatureFields,
	}, nil
}

// resolveSignerRoleValues resolves signer role values from the document and injectables.
func (s *Service) resolveSignerRoleValues(
	signerRoles []portabledoc.SignerRole,
	injectables map[string]any,
) map[string]port.SignerRoleValue {
	result := make(map[string]port.SignerRoleValue)

	for _, role := range signerRoles {
		value := port.SignerRoleValue{}

		// Resolve name
		if role.Name.IsText() {
			value.Name = role.Name.Value
		} else if role.Name.IsInjectable() {
			if v, ok := injectables[role.Name.Value]; ok {
				value.Name = fmt.Sprintf("%v", v)
			}
		}

		// Resolve email
		if role.Email.IsText() {
			value.Email = role.Email.Value
		} else if role.Email.IsInjectable() {
			if v, ok := injectables[role.Email.Value]; ok {
				value.Email = fmt.Sprintf("%v", v)
			}
		}

		result[role.ID] = value
	}

	return result
}

// generateFilename creates a safe filename from the document title.
func (s *Service) generateFilename(title string) string {
	if title == "" {
		return "document.pdf"
	}

	// Simple sanitization - remove problematic characters
	safe := make([]rune, 0, len(title))
	for _, r := range title {
		if (r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '-' || r == '_' || r == ' ' {
			safe = append(safe, r)
		}
	}

	filename := string(safe)
	if filename == "" {
		filename = "document"
	}

	return filename + ".pdf"
}

// extractAndUpdatePositions extracts anchor positions from PDF and updates signature fields.
func (s *Service) extractAndUpdatePositions(
	ctx context.Context,
	pdfBytes []byte,
	fields []port.SignatureField,
) []port.SignatureField {
	tmpPath, cleanup, err := s.writeTempPDF(ctx, pdfBytes)
	if err != nil {
		return fields
	}
	defer cleanup()

	positions, err := s.extractPositions(ctx, tmpPath, fields)
	if err != nil {
		return fields
	}

	return s.updateFieldPositions(ctx, fields, positions)
}

// writeTempPDF writes PDF bytes to a temp file and returns path + cleanup function.
func (s *Service) writeTempPDF(ctx context.Context, pdfBytes []byte) (string, func(), error) {
	tmpFile, err := os.CreateTemp("", "sig-extract-*.pdf")
	if err != nil {
		slog.WarnContext(ctx, "failed to create temp file", "error", err)
		return "", nil, err
	}

	tmpPath := tmpFile.Name()
	cleanup := func() { os.Remove(tmpPath) }

	if _, err := tmpFile.Write(pdfBytes); err != nil {
		tmpFile.Close()
		cleanup()
		slog.WarnContext(ctx, "failed to write temp PDF", "error", err)
		return "", nil, err
	}
	tmpFile.Close()

	return tmpPath, cleanup, nil
}

// extractPositions extracts anchor positions from the PDF file.
func (s *Service) extractPositions(
	ctx context.Context,
	tmpPath string,
	fields []port.SignatureField,
) (map[string]AnchorPosition, error) {
	anchors := s.collectAnchors(fields)
	slog.DebugContext(ctx, "extracting anchors", "count", len(anchors))

	positions, err := ExtractAnchorPositions(tmpPath, anchors)
	if err != nil {
		slog.WarnContext(ctx, "anchor extraction failed", "error", err)
		return nil, err
	}

	slog.DebugContext(ctx, "anchors found", "count", len(positions))
	return positions, nil
}

// collectAnchors collects non-empty anchor strings from fields.
func (s *Service) collectAnchors(fields []port.SignatureField) []string {
	anchors := make([]string, 0, len(fields))
	for _, f := range fields {
		if f.AnchorString != "" {
			anchors = append(anchors, f.AnchorString)
		}
	}
	return anchors
}

// updateFieldPositions updates field positions based on extracted anchor positions.
func (s *Service) updateFieldPositions(
	ctx context.Context,
	fields []port.SignatureField,
	positions map[string]AnchorPosition,
) []port.SignatureField {
	updated := make([]port.SignatureField, len(fields))
	copy(updated, fields)

	for i := range updated {
		pos, ok := positions[updated[i].AnchorString]
		if !ok {
			continue
		}
		s.applyPosition(ctx, &updated[i], pos)
	}
	return updated
}

// applyPosition calculates and applies position to a signature field.
func (s *Service) applyPosition(ctx context.Context, field *port.SignatureField, pos AnchorPosition) {
	posX, posY := pos.ToDocumensoPercentage()
	lineWidth := (pos.Width / pos.PageWidth) * 100

	field.Page = pos.Page
	field.PositionX = posX + (lineWidth-field.Width)/2 // Center horizontally
	field.PositionY = posY - field.Height              // Position above line

	slog.DebugContext(ctx, "field positioned", "anchor", field.AnchorString, "x", field.PositionX, "y", field.PositionY)
}

// Close releases resources held by the service.
func (s *Service) Close() error {
	if s.chrome != nil {
		return s.chrome.Close()
	}
	return nil
}

// Ensure Service implements port.PDFRenderer
var _ port.PDFRenderer = (*Service)(nil)
