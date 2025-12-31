package contractgenerator

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/text"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// ParsedDocument represents the result of parsing markdown to TipTap format.
type ParsedDocument struct {
	Content     *portabledoc.ProseMirrorDoc
	Roles       []DetectedRole
	Injectables []DetectedInjectable
}

// ParseMarkdownToTipTap converts markdown with markers to TipTap/ProseMirror format.
func ParseMarkdownToTipTap(md string, availableInjectables []usecase.InjectableInfo) (*ParsedDocument, error) {
	// 1. Extract all markers from the markdown
	markers := ExtractMarkers(md)

	// 2. Build a set of available injectable keys
	availableKeys := make(map[string]bool)
	for _, inj := range availableInjectables {
		availableKeys[inj.Key] = true
	}

	// 3. Parse markdown to AST
	mdParser := goldmark.New(
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
	)
	reader := text.NewReader([]byte(md))
	doc := mdParser.Parser().Parse(reader)

	// 4. Convert AST to ProseMirror nodes
	pmDoc, err := convertASTToTipTap(doc, []byte(md), availableKeys, availableInjectables)
	if err != nil {
		return nil, fmt.Errorf("converting to tiptap: %w", err)
	}

	// 5. Extract unique roles
	roles := ExtractUniqueRoles(markers)

	// 6. Classify injectables
	injectables := ClassifyInjectables(markers, availableKeys)

	return &ParsedDocument{
		Content:     pmDoc,
		Roles:       roles,
		Injectables: injectables,
	}, nil
}

// convertASTToTipTap converts goldmark AST to ProseMirror document structure.
func convertASTToTipTap(doc ast.Node, source []byte, availableKeys map[string]bool, availableInjectables []usecase.InjectableInfo) (*portabledoc.ProseMirrorDoc, error) {
	pmDoc := &portabledoc.ProseMirrorDoc{
		Type:    portabledoc.NodeTypeDoc,
		Content: []portabledoc.Node{},
	}

	// Build injectable info map for label lookup
	injectableInfoMap := make(map[string]usecase.InjectableInfo)
	for _, inj := range availableInjectables {
		injectableInfoMap[inj.Key] = inj
	}

	// Walk the AST and convert each node
	err := ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}

		// Skip the document node itself
		if n.Kind() == ast.KindDocument {
			return ast.WalkContinue, nil
		}

		// Only process top-level nodes (direct children of document)
		if n.Parent() == nil || n.Parent().Kind() != ast.KindDocument {
			return ast.WalkContinue, nil
		}

		node, err := convertNode(n, source, availableKeys, injectableInfoMap)
		if err != nil {
			return ast.WalkStop, err
		}
		if node != nil {
			pmDoc.Content = append(pmDoc.Content, *node)
		}

		return ast.WalkSkipChildren, nil
	})

	if err != nil {
		return nil, err
	}

	return pmDoc, nil
}

// convertNode converts a goldmark AST node to a ProseMirror node.
func convertNode(n ast.Node, source []byte, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) (*portabledoc.Node, error) {
	switch node := n.(type) {
	case *ast.Heading:
		return convertHeading(node, source, availableKeys, injectableInfoMap)
	case *ast.Paragraph:
		return convertParagraph(node, source, availableKeys, injectableInfoMap)
	case *ast.List:
		return convertList(node, source, availableKeys, injectableInfoMap)
	case *ast.ThematicBreak:
		return &portabledoc.Node{
			Type: portabledoc.NodeTypeHR,
		}, nil
	case *ast.Blockquote:
		return convertBlockquote(node, source, availableKeys, injectableInfoMap)
	case *ast.FencedCodeBlock:
		return convertCodeBlock(node, source)
	default:
		// For unknown block types, try to extract text content
		text := extractTextContent(n, source)
		if strings.TrimSpace(text) != "" {
			return createParagraphWithMarkers(text, availableKeys, injectableInfoMap)
		}
		return nil, nil
	}
}

// convertHeading converts a markdown heading to a TipTap heading node.
func convertHeading(h *ast.Heading, source []byte, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) (*portabledoc.Node, error) {
	level := h.Level
	if level < 1 {
		level = 1
	}
	if level > 6 {
		level = 6
	}

	content, err := convertInlineNodes(h, source, availableKeys, injectableInfoMap)
	if err != nil {
		return nil, err
	}

	return &portabledoc.Node{
		Type: portabledoc.NodeTypeHeading,
		Attrs: map[string]any{
			"level": level,
		},
		Content: content,
	}, nil
}

// convertParagraph converts a markdown paragraph to a TipTap paragraph node.
func convertParagraph(p *ast.Paragraph, source []byte, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) (*portabledoc.Node, error) {
	content, err := convertInlineNodes(p, source, availableKeys, injectableInfoMap)
	if err != nil {
		return nil, err
	}

	return &portabledoc.Node{
		Type:    portabledoc.NodeTypeParagraph,
		Content: content,
	}, nil
}

// convertList converts a markdown list to a TipTap list node.
func convertList(l *ast.List, source []byte, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) (*portabledoc.Node, error) {
	nodeType := portabledoc.NodeTypeBulletList
	if l.IsOrdered() {
		nodeType = portabledoc.NodeTypeOrderedList
	}

	var items []portabledoc.Node
	for child := l.FirstChild(); child != nil; child = child.NextSibling() {
		if li, ok := child.(*ast.ListItem); ok {
			item, err := convertListItem(li, source, availableKeys, injectableInfoMap)
			if err != nil {
				return nil, err
			}
			if item != nil {
				items = append(items, *item)
			}
		}
	}

	return &portabledoc.Node{
		Type:    nodeType,
		Content: items,
	}, nil
}

// convertListItem converts a markdown list item to a TipTap list item node.
func convertListItem(li *ast.ListItem, source []byte, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) (*portabledoc.Node, error) {
	var content []portabledoc.Node

	for child := li.FirstChild(); child != nil; child = child.NextSibling() {
		node, err := convertNode(child, source, availableKeys, injectableInfoMap)
		if err != nil {
			return nil, err
		}
		if node != nil {
			content = append(content, *node)
		}
	}

	return &portabledoc.Node{
		Type:    portabledoc.NodeTypeListItem,
		Content: content,
	}, nil
}

// convertBlockquote converts a markdown blockquote to a TipTap blockquote node.
func convertBlockquote(bq *ast.Blockquote, source []byte, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) (*portabledoc.Node, error) {
	var content []portabledoc.Node

	for child := bq.FirstChild(); child != nil; child = child.NextSibling() {
		node, err := convertNode(child, source, availableKeys, injectableInfoMap)
		if err != nil {
			return nil, err
		}
		if node != nil {
			content = append(content, *node)
		}
	}

	return &portabledoc.Node{
		Type:    portabledoc.NodeTypeBlockquote,
		Content: content,
	}, nil
}

// convertCodeBlock converts a fenced code block to a TipTap code block node.
func convertCodeBlock(cb *ast.FencedCodeBlock, source []byte) (*portabledoc.Node, error) {
	var buf bytes.Buffer
	lines := cb.Lines()
	for i := 0; i < lines.Len(); i++ {
		line := lines.At(i)
		buf.Write(line.Value(source))
	}

	text := buf.String()
	return &portabledoc.Node{
		Type: portabledoc.NodeTypeCodeBlock,
		Attrs: map[string]any{
			"language": string(cb.Language(source)),
		},
		Content: []portabledoc.Node{
			{
				Type: portabledoc.NodeTypeText,
				Text: &text,
			},
		},
	}, nil
}

// convertInlineNodes converts all inline children of a block node.
func convertInlineNodes(n ast.Node, source []byte, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) ([]portabledoc.Node, error) {
	text := extractTextContent(n, source)
	if text == "" {
		return nil, nil
	}

	return processTextWithMarkers(text, availableKeys, injectableInfoMap), nil
}

// processTextWithMarkers processes text, converting markers to appropriate nodes.
func processTextWithMarkers(text string, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) []portabledoc.Node {
	segments := SegmentTextWithMarkers(text)
	var nodes []portabledoc.Node

	for _, seg := range segments {
		if !seg.IsMarker {
			// Plain text
			if seg.Text != "" {
				t := seg.Text
				nodes = append(nodes, portabledoc.Node{
					Type: portabledoc.NodeTypeText,
					Text: &t,
				})
			}
		} else {
			// Marker - convert to appropriate node
			node := convertMarkerToNode(seg.Marker, availableKeys, injectableInfoMap)
			nodes = append(nodes, node)
		}
	}

	return nodes
}

// convertMarkerToNode converts a marker to the appropriate TipTap node.
func convertMarkerToNode(m *Marker, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) portabledoc.Node {
	if m.IsRole {
		// Role variable: create role injector
		return createRoleInjector(m)
	}

	// Check if it's a mapped injectable
	if availableKeys[m.Content] {
		// Mapped injectable: create injector node
		return createInjectorNode(m.Content, injectableInfoMap)
	}

	// Unmapped injectable (suggestion): create highlighted text
	return createHighlightedText(m.OriginalText)
}

// createRoleInjector creates an injector node for a role variable.
func createRoleInjector(m *Marker) portabledoc.Node {
	isRoleVar := true
	variableID := portabledoc.BuildRoleVariableID(m.RoleLabel, m.RoleProperty)
	label := fmt.Sprintf("%s.%s", strings.Title(m.RoleLabel), m.RoleProperty)

	return portabledoc.Node{
		Type: portabledoc.NodeTypeInjector,
		Attrs: map[string]any{
			"type":           portabledoc.InjectorTypeRoleText,
			"label":          label,
			"variableId":     variableID,
			"isRoleVariable": isRoleVar,
			"roleLabel":      m.RoleLabel,
			"propertyKey":    m.RoleProperty,
		},
	}
}

// createInjectorNode creates an injector node for a mapped injectable.
func createInjectorNode(key string, injectableInfoMap map[string]usecase.InjectableInfo) portabledoc.Node {
	label := key
	injType := portabledoc.InjectorTypeText

	// Look up the actual label and type if available
	if info, ok := injectableInfoMap[key]; ok {
		label = info.Label
		// Map data type to injector type
		switch strings.ToUpper(info.DataType) {
		case "NUMBER":
			injType = portabledoc.InjectorTypeNumber
		case "DATE":
			injType = portabledoc.InjectorTypeDate
		case "CURRENCY":
			injType = portabledoc.InjectorTypeCurrency
		case "BOOLEAN":
			injType = portabledoc.InjectorTypeBoolean
		case "IMAGE":
			injType = portabledoc.InjectorTypeImage
		case "TABLE":
			injType = portabledoc.InjectorTypeTable
		}
	}

	required := true
	return portabledoc.Node{
		Type: portabledoc.NodeTypeInjector,
		Attrs: map[string]any{
			"type":       injType,
			"label":      label,
			"variableId": key,
			"required":   required,
		},
	}
}

// createHighlightedText creates a text node with highlight mark for suggested injectables.
func createHighlightedText(text string) portabledoc.Node {
	return portabledoc.Node{
		Type: portabledoc.NodeTypeText,
		Text: &text,
		Marks: []portabledoc.Mark{
			{
				Type: portabledoc.MarkTypeHighlight,
				Attrs: map[string]any{
					"color": "#fef3c7", // Yellow highlight for suggestions
				},
			},
		},
	}
}

// createParagraphWithMarkers creates a paragraph node with processed markers.
func createParagraphWithMarkers(text string, availableKeys map[string]bool, injectableInfoMap map[string]usecase.InjectableInfo) (*portabledoc.Node, error) {
	content := processTextWithMarkers(text, availableKeys, injectableInfoMap)

	return &portabledoc.Node{
		Type:    portabledoc.NodeTypeParagraph,
		Content: content,
	}, nil
}

// extractTextContent extracts all text content from an AST node.
func extractTextContent(n ast.Node, source []byte) string {
	var buf bytes.Buffer

	ast.Walk(n, func(child ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}

		if text, ok := child.(*ast.Text); ok {
			buf.Write(text.Segment.Value(source))
			if text.HardLineBreak() || text.SoftLineBreak() {
				buf.WriteString("\n")
			}
		} else if _, ok := child.(*ast.String); ok {
			// Handle string nodes (from some markdown extensions)
			segment := child.(*ast.String).Value
			buf.Write(segment)
		}

		return ast.WalkContinue, nil
	})

	return buf.String()
}

// BuildSignerRoles creates SignerRole entities from detected roles.
func BuildSignerRoles(roles []DetectedRole) []portabledoc.SignerRole {
	var signerRoles []portabledoc.SignerRole

	for i, r := range roles {
		roleID := fmt.Sprintf("role_%d", i+1)
		label := strings.Title(r.Label)

		// Build name field - always use role variable
		nameVarID := portabledoc.BuildRoleVariableID(r.Label, portabledoc.RolePropertyName)
		nameField := portabledoc.FieldValue{
			Type:  portabledoc.FieldTypeInjectable,
			Value: nameVarID,
		}

		// Build email field - use role variable if email property was detected
		var emailField portabledoc.FieldValue
		hasEmail := false
		for _, prop := range r.Properties {
			if prop == portabledoc.RolePropertyEmail {
				hasEmail = true
				break
			}
		}

		if hasEmail {
			emailVarID := portabledoc.BuildRoleVariableID(r.Label, portabledoc.RolePropertyEmail)
			emailField = portabledoc.FieldValue{
				Type:  portabledoc.FieldTypeInjectable,
				Value: emailVarID,
			}
		} else {
			emailField = portabledoc.FieldValue{
				Type:  portabledoc.FieldTypeText,
				Value: "",
			}
		}

		signerRoles = append(signerRoles, portabledoc.SignerRole{
			ID:    roleID,
			Label: label,
			Name:  nameField,
			Email: emailField,
			Order: i + 1,
		})
	}

	return signerRoles
}

// BuildVariableIDs creates the variableIds array from mapped injectables.
func BuildVariableIDs(injectables []DetectedInjectable) []string {
	var ids []string

	for _, inj := range injectables {
		if inj.IsMapped {
			ids = append(ids, inj.Key)
		}
	}

	return ids
}
