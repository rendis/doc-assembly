package pdfrenderer

import (
	"fmt"
	"html"
	"strconv"
	"strings"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// NodeConverter converts ProseMirror/TipTap nodes to HTML.
type NodeConverter struct {
	injectables      map[string]any
	signerRoleValues map[string]port.SignerRoleValue
	signerRoles      map[string]portabledoc.SignerRole // roleID -> SignerRole
}

// NewNodeConverter creates a new node converter with the given injectable values.
func NewNodeConverter(
	injectables map[string]any,
	signerRoleValues map[string]port.SignerRoleValue,
	signerRoles []portabledoc.SignerRole,
) *NodeConverter {
	roleMap := make(map[string]portabledoc.SignerRole)
	for _, role := range signerRoles {
		roleMap[role.ID] = role
	}

	return &NodeConverter{
		injectables:      injectables,
		signerRoleValues: signerRoleValues,
		signerRoles:      roleMap,
	}
}

// ConvertNodes converts a slice of nodes to HTML.
func (c *NodeConverter) ConvertNodes(nodes []portabledoc.Node) string {
	var sb strings.Builder
	for _, node := range nodes {
		sb.WriteString(c.ConvertNode(node))
	}
	return sb.String()
}

// ConvertNode converts a single node to HTML.
func (c *NodeConverter) ConvertNode(node portabledoc.Node) string {
	switch node.Type {
	case portabledoc.NodeTypeParagraph:
		return c.paragraph(node)
	case portabledoc.NodeTypeHeading:
		return c.heading(node)
	case portabledoc.NodeTypeBlockquote:
		return c.blockquote(node)
	case portabledoc.NodeTypeCodeBlock:
		return c.codeBlock(node)
	case portabledoc.NodeTypeHR:
		return c.horizontalRule()
	case portabledoc.NodeTypeBulletList:
		return c.bulletList(node)
	case portabledoc.NodeTypeOrderedList:
		return c.orderedList(node)
	case portabledoc.NodeTypeTaskList:
		return c.taskList(node)
	case portabledoc.NodeTypeListItem:
		return c.listItem(node)
	case portabledoc.NodeTypeTaskItem:
		return c.taskItem(node)
	case portabledoc.NodeTypeInjector:
		return c.injector(node)
	case portabledoc.NodeTypeConditional:
		return c.conditional(node)
	case portabledoc.NodeTypeSignature:
		return c.signature(node)
	case portabledoc.NodeTypePageBreak:
		return c.pageBreak()
	case portabledoc.NodeTypeImage:
		return c.image(node)
	case portabledoc.NodeTypeText:
		return c.text(node)
	default:
		// Unknown node type, render children if any
		if len(node.Content) > 0 {
			return c.ConvertNodes(node.Content)
		}
		return ""
	}
}

func (c *NodeConverter) paragraph(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	// Empty paragraphs need a non-breaking space to maintain height in PDF
	if content == "" {
		content = "&nbsp;"
	}
	return fmt.Sprintf("<p>%s</p>\n", content)
}

func (c *NodeConverter) heading(node portabledoc.Node) string {
	level := 1
	if l, ok := node.Attrs["level"].(float64); ok {
		level = int(l)
	}
	if level < 1 {
		level = 1
	}
	if level > 6 {
		level = 6
	}
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<h%d>%s</h%d>\n", level, content, level)
}

func (c *NodeConverter) blockquote(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<blockquote>%s</blockquote>\n", content)
}

func (c *NodeConverter) codeBlock(node portabledoc.Node) string {
	language := ""
	if l, ok := node.Attrs["language"].(string); ok {
		language = l
	}

	content := c.ConvertNodes(node.Content)
	if language != "" {
		return fmt.Sprintf("<pre><code class=\"language-%s\">%s</code></pre>\n", html.EscapeString(language), content)
	}
	return fmt.Sprintf("<pre><code>%s</code></pre>\n", content)
}

func (c *NodeConverter) horizontalRule() string {
	return "<hr>\n"
}

func (c *NodeConverter) bulletList(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<ul>%s</ul>\n", content)
}

func (c *NodeConverter) orderedList(node portabledoc.Node) string {
	start := 1
	if s, ok := node.Attrs["start"].(float64); ok {
		start = int(s)
	}
	content := c.ConvertNodes(node.Content)
	if start != 1 {
		return fmt.Sprintf("<ol start=\"%d\">%s</ol>\n", start, content)
	}
	return fmt.Sprintf("<ol>%s</ol>\n", content)
}

func (c *NodeConverter) taskList(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<ul class=\"task-list\">%s</ul>\n", content)
}

func (c *NodeConverter) listItem(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<li>%s</li>\n", content)
}

func (c *NodeConverter) taskItem(node portabledoc.Node) string {
	checked := false
	if c, ok := node.Attrs["checked"].(bool); ok {
		checked = c
	}

	checkedAttr := ""
	if checked {
		checkedAttr = " checked"
	}

	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<li class=\"task-item\"><input type=\"checkbox\" disabled%s> %s</li>\n", checkedAttr, content)
}

func (c *NodeConverter) injector(node portabledoc.Node) string {
	variableID, _ := node.Attrs["variableId"].(string)
	label, _ := node.Attrs["label"].(string)
	isRoleVar, _ := node.Attrs["isRoleVariable"].(bool)

	var value string

	if isRoleVar {
		// Role variable - resolve from signer role values
		roleID, _ := node.Attrs["roleId"].(string)
		propertyKey, _ := node.Attrs["propertyKey"].(string)

		if roleValue, ok := c.signerRoleValues[roleID]; ok {
			switch propertyKey {
			case portabledoc.RolePropertyName:
				value = roleValue.Name
			case portabledoc.RolePropertyEmail:
				value = roleValue.Email
			}
		}
	} else {
		// Regular injectable - get from injectables map
		if v, ok := c.injectables[variableID]; ok {
			value = c.formatInjectableValue(v, node.Attrs)
		}
	}

	// If no value, show placeholder with label
	if value == "" {
		value = fmt.Sprintf("[%s]", label)
		return fmt.Sprintf("<span class=\"injectable injectable-empty\">%s</span>", html.EscapeString(value))
	}

	return fmt.Sprintf("<span class=\"injectable\">%s</span>", html.EscapeString(value))
}

func (c *NodeConverter) formatInjectableValue(value any, attrs map[string]any) string {
	injectorType, _ := attrs["type"].(string)
	format, _ := attrs["format"].(string)

	switch v := value.(type) {
	case string:
		return v
	case float64:
		if injectorType == portabledoc.InjectorTypeCurrency {
			// Format as currency
			if format != "" {
				return fmt.Sprintf("%s %.2f", format, v)
			}
			return fmt.Sprintf("%.2f", v)
		}
		// Check if it's a whole number
		if v == float64(int64(v)) {
			return strconv.FormatInt(int64(v), 10)
		}
		return strconv.FormatFloat(v, 'f', -1, 64)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case bool:
		if v {
			return "Sí"
		}
		return "No"
	default:
		return fmt.Sprintf("%v", v)
	}
}

func (c *NodeConverter) conditional(node portabledoc.Node) string {
	// Evaluate the condition
	if c.evaluateCondition(node.Attrs) {
		// Condition is true, render content
		return c.ConvertNodes(node.Content)
	}
	// Condition is false, don't render
	return ""
}

func (c *NodeConverter) evaluateCondition(attrs map[string]any) bool {
	conditionsRaw, ok := attrs["conditions"]
	if !ok {
		return true // No conditions = always show
	}

	conditionsMap, ok := conditionsRaw.(map[string]any)
	if !ok {
		return true
	}

	return c.evaluateLogicGroup(conditionsMap)
}

func (c *NodeConverter) evaluateLogicGroup(group map[string]any) bool {
	logic, _ := group["logic"].(string)
	childrenRaw, _ := group["children"].([]any)

	if len(childrenRaw) == 0 {
		return true
	}

	for _, childRaw := range childrenRaw {
		child, ok := childRaw.(map[string]any)
		if !ok {
			continue
		}

		childType, _ := child["type"].(string)
		var result bool

		if childType == portabledoc.LogicTypeGroup {
			result = c.evaluateLogicGroup(child)
		} else if childType == portabledoc.LogicTypeRule {
			result = c.evaluateRule(child)
		} else {
			continue
		}

		// Short-circuit evaluation
		if logic == portabledoc.LogicAND && !result {
			return false
		}
		if logic == portabledoc.LogicOR && result {
			return true
		}
	}

	// If we get here:
	// - AND: all were true
	// - OR: none were true
	return logic == portabledoc.LogicAND
}

func (c *NodeConverter) evaluateRule(rule map[string]any) bool {
	variableID, _ := rule["variableId"].(string)
	operator, _ := rule["operator"].(string)
	valueObj, _ := rule["value"].(map[string]any)

	// Get the actual value from injectables
	actualValue := c.injectables[variableID]

	// Get the comparison value
	valueMode, _ := valueObj["mode"].(string)
	compareValue := valueObj["value"]

	if valueMode == portabledoc.RuleModeVariable {
		// Compare against another variable's value
		compareVarID, _ := compareValue.(string)
		compareValue = c.injectables[compareVarID]
	}

	return c.compareValues(actualValue, compareValue, operator)
}

func (c *NodeConverter) compareValues(actual, compare any, operator string) bool {
	// Convert to strings for comparison
	actualStr := fmt.Sprintf("%v", actual)
	compareStr := fmt.Sprintf("%v", compare)

	switch operator {
	case portabledoc.OpEqual:
		return actualStr == compareStr
	case portabledoc.OpNotEqual:
		return actualStr != compareStr
	case portabledoc.OpEmpty:
		return actual == nil || actualStr == ""
	case portabledoc.OpNotEmpty:
		return actual != nil && actualStr != ""
	case portabledoc.OpStartsWith:
		return strings.HasPrefix(actualStr, compareStr)
	case portabledoc.OpEndsWith:
		return strings.HasSuffix(actualStr, compareStr)
	case portabledoc.OpContains:
		return strings.Contains(actualStr, compareStr)
	case portabledoc.OpIsTrue:
		return actualStr == "true" || actualStr == "1"
	case portabledoc.OpIsFalse:
		return actualStr == "false" || actualStr == "0" || actualStr == ""
	case portabledoc.OpGreater, portabledoc.OpAfter:
		return c.compareNumeric(actual, compare) > 0
	case portabledoc.OpLess, portabledoc.OpBefore:
		return c.compareNumeric(actual, compare) < 0
	case portabledoc.OpGreaterEq:
		return c.compareNumeric(actual, compare) >= 0
	case portabledoc.OpLessEq:
		return c.compareNumeric(actual, compare) <= 0
	default:
		return false
	}
}

func (c *NodeConverter) compareNumeric(a, b any) int {
	aNum := c.toFloat64(a)
	bNum := c.toFloat64(b)

	if aNum < bNum {
		return -1
	}
	if aNum > bNum {
		return 1
	}
	return 0
}

func (c *NodeConverter) toFloat64(v any) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case float32:
		return float64(val)
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case int32:
		return float64(val)
	case string:
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return 0
}

func (c *NodeConverter) signature(node portabledoc.Node) string {
	attrs := c.parseSignatureAttrs(node.Attrs)
	return c.renderSignatureBlock(attrs)
}

func (c *NodeConverter) parseSignatureAttrs(attrs map[string]any) portabledoc.SignatureAttrs {
	result := portabledoc.SignatureAttrs{
		Count:     1,
		Layout:    portabledoc.LayoutSingleCenter,
		LineWidth: portabledoc.LineWidthMedium,
	}

	if count, ok := attrs["count"].(float64); ok {
		result.Count = int(count)
	}
	if layout, ok := attrs["layout"].(string); ok {
		result.Layout = layout
	}
	if lineWidth, ok := attrs["lineWidth"].(string); ok {
		result.LineWidth = lineWidth
	}

	if sigsRaw, ok := attrs["signatures"].([]any); ok {
		for _, sigRaw := range sigsRaw {
			if sigMap, ok := sigRaw.(map[string]any); ok {
				item := portabledoc.SignatureItem{}
				if id, ok := sigMap["id"].(string); ok {
					item.ID = id
				}
				if roleID, ok := sigMap["roleId"].(string); ok {
					item.RoleID = &roleID
				}
				if label, ok := sigMap["label"].(string); ok {
					item.Label = label
				}
				if subtitle, ok := sigMap["subtitle"].(string); ok {
					item.Subtitle = &subtitle
				}
				// Image fields
				if imageData, ok := sigMap["imageData"].(string); ok {
					item.ImageData = &imageData
				}
				if imageOriginal, ok := sigMap["imageOriginal"].(string); ok {
					item.ImageOriginal = &imageOriginal
				}
				if imageOpacity, ok := sigMap["imageOpacity"].(float64); ok {
					item.ImageOpacity = &imageOpacity
				}
				if imageRotation, ok := sigMap["imageRotation"].(float64); ok {
					rotation := int(imageRotation)
					item.ImageRotation = &rotation
				}
				if imageScale, ok := sigMap["imageScale"].(float64); ok {
					item.ImageScale = &imageScale
				}
				if imageX, ok := sigMap["imageX"].(float64); ok {
					item.ImageX = &imageX
				}
				if imageY, ok := sigMap["imageY"].(float64); ok {
					item.ImageY = &imageY
				}
				result.Signatures = append(result.Signatures, item)
			}
		}
	}

	return result
}

func (c *NodeConverter) renderSignatureBlock(attrs portabledoc.SignatureAttrs) string {
	var sb strings.Builder

	sb.WriteString("<div class=\"signature-block\">\n")
	sb.WriteString(fmt.Sprintf("  <div class=\"signature-container layout-%s\">\n", attrs.Layout))

	for _, sig := range attrs.Signatures {
		sb.WriteString("    <div class=\"signature-item\">\n")

		// Signature line with anchor string
		anchorString := c.getAnchorString(sig)
		sb.WriteString(fmt.Sprintf("      <div class=\"signature-line line-%s\">\n", attrs.LineWidth))

		// Render signature image if present
		if sig.IsSigned() {
			sb.WriteString(c.renderSignatureImage(sig))
		}

		sb.WriteString(fmt.Sprintf("        <span class=\"anchor-string\">%s</span>\n", html.EscapeString(anchorString)))
		sb.WriteString("      </div>\n")

		// Label
		sb.WriteString(fmt.Sprintf("      <div class=\"signature-label\">%s</div>\n", html.EscapeString(sig.Label)))

		// Subtitle if present
		if sig.Subtitle != nil && *sig.Subtitle != "" {
			sb.WriteString(fmt.Sprintf("      <div class=\"signature-subtitle\">%s</div>\n", html.EscapeString(*sig.Subtitle)))
		}

		sb.WriteString("    </div>\n")
	}

	sb.WriteString("  </div>\n")
	sb.WriteString("</div>\n")

	return sb.String()
}

// renderSignatureImage generates HTML for a signature image with transformations.
// Uses a wrapper div for centering to avoid interfering with user-defined transforms.
func (c *NodeConverter) renderSignatureImage(sig portabledoc.SignatureItem) string {
	if sig.ImageData == nil || *sig.ImageData == "" {
		return ""
	}

	var styleBuilder strings.Builder
	var transforms []string

	// Build transform property in the same order as frontend:
	// translate(X, Y) → rotate(N) → scale(N)

	// Position offsets first (same as frontend)
	if sig.ImageX != nil || sig.ImageY != nil {
		x := 0.0
		y := 0.0
		if sig.ImageX != nil {
			x = *sig.ImageX
		}
		if sig.ImageY != nil {
			y = *sig.ImageY
		}
		transforms = append(transforms, fmt.Sprintf("translate(%.0fpx, %.0fpx)", x, y))
	}

	// Rotation
	if sig.ImageRotation != nil && *sig.ImageRotation != 0 {
		transforms = append(transforms, fmt.Sprintf("rotate(%ddeg)", *sig.ImageRotation))
	}

	// Scale
	if sig.ImageScale != nil && *sig.ImageScale != 1.0 {
		transforms = append(transforms, fmt.Sprintf("scale(%.2f)", *sig.ImageScale))
	}

	if len(transforms) > 0 {
		styleBuilder.WriteString(fmt.Sprintf("transform: %s; ", strings.Join(transforms, " ")))
	}

	// Opacity - always apply when defined (to support transparency)
	if sig.ImageOpacity != nil {
		styleBuilder.WriteString(fmt.Sprintf("opacity: %.2f; ", *sig.ImageOpacity))
	}

	// Use wrapper div for centering - this allows user transforms to work correctly
	return fmt.Sprintf("        <div class=\"signature-image-wrapper\"><img class=\"signature-image\" src=\"%s\" style=\"%s\" alt=\"Signature\"></div>\n",
		html.EscapeString(*sig.ImageData),
		styleBuilder.String())
}

func (c *NodeConverter) getAnchorString(sig portabledoc.SignatureItem) string {
	// Generate anchor string for external signing platforms
	// Format: __sig_{roleLabel}__ or __sig_{id}__
	if sig.RoleID != nil && *sig.RoleID != "" {
		if role, ok := c.signerRoles[*sig.RoleID]; ok {
			// Use a sanitized version of the role label
			sanitized := strings.ToLower(role.Label)
			sanitized = strings.ReplaceAll(sanitized, " ", "_")
			return fmt.Sprintf("__sig_%s__", sanitized)
		}
	}
	// Fallback to signature ID
	return fmt.Sprintf("__sig_%s__", sig.ID)
}

func (c *NodeConverter) pageBreak() string {
	return "<div class=\"page-break\"></div>\n"
}

func (c *NodeConverter) image(node portabledoc.Node) string {
	src, _ := node.Attrs["src"].(string)
	alt, _ := node.Attrs["alt"].(string)
	width, _ := node.Attrs["width"].(float64)
	height, _ := node.Attrs["height"].(float64)
	displayMode, _ := node.Attrs["displayMode"].(string)
	align, _ := node.Attrs["align"].(string)

	if src == "" {
		return ""
	}

	var styleBuilder strings.Builder

	if width > 0 {
		styleBuilder.WriteString(fmt.Sprintf("width: %.0fpx; ", width))
	}
	if height > 0 {
		styleBuilder.WriteString(fmt.Sprintf("height: %.0fpx; ", height))
	}

	style := styleBuilder.String()

	classes := []string{"document-image"}
	if displayMode != "" {
		classes = append(classes, fmt.Sprintf("display-%s", displayMode))
	}
	if align != "" {
		classes = append(classes, fmt.Sprintf("align-%s", align))
	}

	imgTag := fmt.Sprintf("<img src=\"%s\" alt=\"%s\"",
		html.EscapeString(src),
		html.EscapeString(alt))

	if style != "" {
		imgTag += fmt.Sprintf(" style=\"%s\"", style)
	}
	imgTag += ">"

	return fmt.Sprintf("<div class=\"%s\">%s</div>\n", strings.Join(classes, " "), imgTag)
}

func (c *NodeConverter) text(node portabledoc.Node) string {
	if node.Text == nil {
		return ""
	}

	text := html.EscapeString(*node.Text)

	// Apply marks (formatting)
	for _, mark := range node.Marks {
		text = c.applyMark(text, mark)
	}

	return text
}

func (c *NodeConverter) applyMark(text string, mark portabledoc.Mark) string {
	switch mark.Type {
	case portabledoc.MarkTypeBold:
		return fmt.Sprintf("<strong>%s</strong>", text)
	case portabledoc.MarkTypeItalic:
		return fmt.Sprintf("<em>%s</em>", text)
	case portabledoc.MarkTypeStrike:
		return fmt.Sprintf("<s>%s</s>", text)
	case portabledoc.MarkTypeCode:
		return fmt.Sprintf("<code>%s</code>", text)
	case portabledoc.MarkTypeUnderline:
		return fmt.Sprintf("<u>%s</u>", text)
	case portabledoc.MarkTypeHighlight:
		color := "#ffeb3b" // Default yellow
		if c, ok := mark.Attrs["color"].(string); ok && c != "" {
			color = c
		}
		return fmt.Sprintf("<mark style=\"background-color: %s\">%s</mark>", html.EscapeString(color), text)
	case portabledoc.MarkTypeLink:
		href, _ := mark.Attrs["href"].(string)
		target, _ := mark.Attrs["target"].(string)
		if href == "" {
			return text
		}
		if target != "" {
			return fmt.Sprintf("<a href=\"%s\" target=\"%s\">%s</a>", html.EscapeString(href), html.EscapeString(target), text)
		}
		return fmt.Sprintf("<a href=\"%s\">%s</a>", html.EscapeString(href), text)
	default:
		return text
	}
}
