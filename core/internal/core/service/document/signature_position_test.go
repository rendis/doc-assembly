package document

import (
	"math"
	"testing"

	"github.com/rendis/doc-assembly/core/internal/core/port"
)

func TestConvertFieldToProviderPositionAlignsSignatureFieldBottomToExtractedLine(t *testing.T) {
	field := port.SignatureField{
		PositionX:  10,
		PositionY:  20,
		Width:      30,
		Height:     8,
		PDFPointX:  270,
		PDFPointY:  160,
		PDFAnchorW: 60,
		PDFPageW:   600,
		PDFPageH:   800,
	}

	gotX, gotY := convertFieldToProviderPosition(field)

	assertFloatNear(t, gotX, 35)
	assertFloatNear(t, gotY, 72)
}

func assertFloatNear(t *testing.T, got, want float64) {
	t.Helper()
	if math.Abs(got-want) > 0.0001 {
		t.Fatalf("got %.4f, want %.4f", got, want)
	}
}
