package frontend

import "embed"

// DistFS embeds the pre-built SPA files from the dist/ directory.
// These files are committed to the repo so consumers get the frontend via go:embed.
// Re-build with: make embed-app
//
//go:embed all:dist
var DistFS embed.FS
