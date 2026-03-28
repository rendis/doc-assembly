package pdfrenderer

import (
	"strings"
	"testing"
)

func TestTypstRenderer_BuildArgsIncludesConfiguredFontPaths(t *testing.T) {
	renderer := &TypstRenderer{
		opts: TypstOptions{
			BinPath:  "typst",
			FontDirs: []string{"/tmp/fonts-a", "/tmp/fonts-b"},
		},
	}

	args := renderer.buildArgs("/tmp/root")
	got := strings.Join(args, " ")

	if !strings.Contains(got, "--root /tmp/root") {
		t.Fatalf("expected root dir in build args, got %q", got)
	}

	if !strings.Contains(got, "--font-path /tmp/fonts-a") {
		t.Fatalf("expected first font path in build args, got %q", got)
	}

	if !strings.Contains(got, "--font-path /tmp/fonts-b") {
		t.Fatalf("expected second font path in build args, got %q", got)
	}
}
