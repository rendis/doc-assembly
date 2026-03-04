package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseCSVList_DedupesAndTrims(t *testing.T) {
	raw := " https://a.example ,https://b.example,https://A.example , ,https://b.example "
	got := parseCSVList(raw)

	assert.Equal(t, []string{"https://a.example", "https://b.example"}, got)
}

func TestApplyServerEnvOverrides_PublicSigningFrameAncestors(t *testing.T) {
	t.Setenv(serverPublicSigningFrameAncestorsEnv, "https://foo.example, https://bar.example/")

	cfg := &ServerConfig{
		PublicSigningFrameAncestors: []string{"https://old.example"},
	}

	applyServerEnvOverrides(cfg)

	assert.Equal(t, []string{"https://foo.example", "https://bar.example/"}, cfg.PublicSigningFrameAncestors)
}
