package pdfrenderer

import (
	"context"
	"fmt"

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

	// Build HTML from document
	builder := NewHTMLBuilder(req.Injectables, signerRoleValues, req.Document.SignerRoles)
	html := builder.Build(req.Document)

	// Generate PDF using Chrome
	pdfBytes, err := s.chrome.GeneratePDF(ctx, html, req.Document.PageConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	// Generate filename from document title
	filename := s.generateFilename(req.Document.Meta.Title)

	return &port.RenderPreviewResult{
		PDF:       pdfBytes,
		Filename:  filename,
		PageCount: 0, // Page count would require parsing the PDF
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

// Close releases resources held by the service.
func (s *Service) Close() error {
	if s.chrome != nil {
		return s.chrome.Close()
	}
	return nil
}

// Ensure Service implements port.PDFRenderer
var _ port.PDFRenderer = (*Service)(nil)
