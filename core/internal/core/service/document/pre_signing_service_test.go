package document

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

func TestResolvePreviewNodes_ReplacesInjectorsWithResolvedText(t *testing.T) {
	nodes := []portabledoc.Node{
		{
			Type: portabledoc.NodeTypeParagraph,
			Content: []portabledoc.Node{
				{Type: portabledoc.NodeTypeText, Text: ptrString("Nombre: ")},
				{
					Type: portabledoc.NodeTypeInjector,
					Attrs: map[string]any{
						"type":       portabledoc.InjectorTypeText,
						"variableId": "student_name",
					},
				},
			},
		},
	}

	got := resolvePreviewNodes(nodes, map[string]any{
		"student_name": "Juan Perez",
	}, nil)

	require.Len(t, got, 1)
	require.Len(t, got[0].Content, 2)
	assert.Equal(t, portabledoc.NodeTypeText, got[0].Content[0].Type)
	assert.Equal(t, "Nombre: ", *got[0].Content[0].Text)
	assert.Equal(t, portabledoc.NodeTypeText, got[0].Content[1].Type)
	require.NotNil(t, got[0].Content[1].Text)
	assert.Equal(t, "Juan Perez", *got[0].Content[1].Text)
}

func TestResolvePreviewNodes_ResolvesRoleVariable(t *testing.T) {
	nodes := []portabledoc.Node{
		{
			Type: portabledoc.NodeTypeParagraph,
			Content: []portabledoc.Node{
				{
					Type: portabledoc.NodeTypeInjector,
					Attrs: map[string]any{
						"type":           portabledoc.InjectorTypeRoleText,
						"isRoleVariable": true,
						"roleId":         "role-guardian",
						"propertyKey":    portabledoc.RolePropertyEmail,
						"prefix":         "<",
						"suffix":         ">",
					},
				},
			},
		},
	}

	got := resolvePreviewNodes(nodes, nil, map[string]port.SignerRoleValue{
		"role-guardian": {
			Name:  "Apoderado",
			Email: "guardian@example.com",
		},
	})

	require.Len(t, got, 1)
	require.Len(t, got[0].Content, 1)
	assert.Equal(t, portabledoc.NodeTypeText, got[0].Content[0].Type)
	require.NotNil(t, got[0].Content[0].Text)
	assert.Equal(t, "<guardian@example.com>", *got[0].Content[0].Text)
}

func ptrString(v string) *string {
	return &v
}
