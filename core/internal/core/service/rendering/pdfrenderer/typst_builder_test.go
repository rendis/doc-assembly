package pdfrenderer

import (
	"strings"
	"testing"

	"github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

type typstBuilderConverterStub struct {
	convertedInputs [][]portabledoc.Node
	remoteImages    map[string]string
}

func (s *typstBuilderConverterStub) ConvertNodes(nodes []portabledoc.Node) (string, []port.SignatureField) {
	s.convertedInputs = append(s.convertedInputs, nodes)
	return "HEADER_TEXT", nil
}

func (s *typstBuilderConverterStub) GetCurrentPage() int {
	return 1
}

func (s *typstBuilderConverterStub) RemoteImages() map[string]string {
	if s.remoteImages == nil {
		s.remoteImages = map[string]string{}
	}
	return s.remoteImages
}

func (s *typstBuilderConverterStub) SetContentWidthPx(float64) {}

func (s *typstBuilderConverterStub) SetPageWidthPx(float64) {}

func (s *typstBuilderConverterStub) RegisterRemoteImage(url string) string {
	if s.remoteImages == nil {
		s.remoteImages = map[string]string{}
	}
	filename := "remote-image-1"
	s.remoteImages[url] = filename
	return filename
}

func TestTypstBuilderHeaderBlock_ImageLeftWithText(t *testing.T) {
	converter := &typstBuilderConverterStub{}
	builder := NewTypstBuilder(converter, DefaultDesignTokens())
	imageURL := "https://example.com/logo.png"
	headerText := "Header text"

	got := builder.headerBlock(&portabledoc.DocumentHeader{
		Enabled:  true,
		Layout:   portabledoc.HeaderLayoutImageLeft,
		ImageURL: &imageURL,
		Content: &portabledoc.ProseMirrorDoc{
			Type: "doc",
			Content: []portabledoc.Node{
				{
					Type:    portabledoc.NodeTypeParagraph,
					Content: []portabledoc.Node{{Type: portabledoc.NodeTypeText, Text: &headerText}},
				},
			},
		},
	})

	if !strings.Contains(got, "columns: (30%, 1fr)") {
		t.Fatalf("expected image-left grid columns, got %q", got)
	}
	if !strings.Contains(got, "#image(\"remote-image-1\", height: 90pt)") {
		t.Fatalf("expected registered image in header block, got %q", got)
	}
	if !strings.Contains(got, "HEADER_TEXT") {
		t.Fatalf("expected converted header text in block, got %q", got)
	}
	if converter.RemoteImages()[imageURL] != "remote-image-1" {
		t.Fatalf("expected remote image registration for %q", imageURL)
	}
}

func TestTypstBuilderPageSetupHalvesTopMarginWhenHeaderEnabled(t *testing.T) {
	builder := NewTypstBuilder(&typstBuilderConverterStub{}, DefaultDesignTokens())
	pageConfig := &portabledoc.PageConfig{
		FormatID: portabledoc.PageFormatA4,
		Width:    794,
		Height:   1123,
		Margins: portabledoc.Margins{
			Top:    72,
			Bottom: 72,
			Left:   72,
			Right:  72,
		},
	}

	withHeader := builder.pageSetup(pageConfig, true)
	withoutHeader := builder.pageSetup(pageConfig, false)

	if !strings.Contains(withHeader, "top: 27.0pt") {
		t.Fatalf("expected top margin to be halved when header is enabled, got %q", withHeader)
	}
	if !strings.Contains(withoutHeader, "top: 54.0pt") {
		t.Fatalf("expected original top margin when header is disabled, got %q", withoutHeader)
	}
}
