package frontend

import "embed"

// DistFS embeds the built SPA files from the dist/ directory.
// When dist/ contains only .gitkeep, the embedded FS is effectively empty
// and the engine will skip frontend serving.
//
//go:embed all:dist
var DistFS embed.FS
