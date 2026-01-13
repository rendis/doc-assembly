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
	injectables        map[string]any
	injectableDefaults map[string]string
	signerRoleValues   map[string]port.SignerRoleValue
	signerRoles        map[string]portabledoc.SignerRole // roleID -> SignerRole
}

// NewNodeConverter creates a new node converter with the given injectable values.
func NewNodeConverter(
	injectables map[string]any,
	injectableDefaults map[string]string,
	signerRoleValues map[string]port.SignerRoleValue,
	signerRoles []portabledoc.SignerRole,
) *NodeConverter {
	roleMap := make(map[string]portabledoc.SignerRole)
	for _, role := range signerRoles {
		roleMap[role.ID] = role
	}

	return &NodeConverter{
		injectables:        injectables,
		injectableDefaults: injectableDefaults,
		signerRoleValues:   signerRoleValues,
		signerRoles:        roleMap,
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
		return c.horizontalRule(node)
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
		return c.pageBreak(node)
	case portabledoc.NodeTypeImage, portabledoc.NodeTypeCustomImage:
		return c.image(node)
	case portabledoc.NodeTypeText:
		return c.text(node)
	default:
		return c.handleUnknownNode(node)
	}
}

func (c *NodeConverter) handleUnknownNode(node portabledoc.Node) string {
	if len(node.Content) > 0 {
		return c.ConvertNodes(node.Content)
	}
	return ""
}

func (c *NodeConverter) paragraph(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	if content == "" {
		content = "&nbsp;"
	}
	return fmt.Sprintf("<p>%s</p>\n", content)
}

func (c *NodeConverter) heading(node portabledoc.Node) string {
	level := c.parseHeadingLevel(node.Attrs)
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<h%d>%s</h%d>\n", level, content, level)
}

func (c *NodeConverter) parseHeadingLevel(attrs map[string]any) int {
	level := 1
	if l, ok := attrs["level"].(float64); ok {
		level = int(l)
	}
	return clamp(level, 1, 6)
}

func (c *NodeConverter) blockquote(node portabledoc.Node) string {
	content := c.ConvertNodes(node.Content)
	return fmt.Sprintf("<blockquote>%s</blockquote>\n", content)
}

func (c *NodeConverter) codeBlock(node portabledoc.Node) string {
	language, _ := node.Attrs["language"].(string)
	content := c.ConvertNodes(node.Content)

	if language != "" {
		return fmt.Sprintf("<pre><code class=\"language-%s\">%s</code></pre>\n", html.EscapeString(language), content)
	}
	return fmt.Sprintf("<pre><code>%s</code></pre>\n", content)
}

func (c *NodeConverter) horizontalRule(_ portabledoc.Node) string {
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
	checked, _ := node.Attrs["checked"].(bool)
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

	value := c.resolveInjectorValue(variableID, isRoleVar, node.Attrs)
	if value == "" {
		value = c.getDefaultValue(variableID)
	}

	if value == "" {
		placeholder := fmt.Sprintf("[%s]", label)
		return fmt.Sprintf("<span class=\"injectable injectable-empty\">%s</span>", html.EscapeString(placeholder))
	}
	return fmt.Sprintf("<span class=\"injectable\">%s</span>", html.EscapeString(value))
}

func (c *NodeConverter) resolveInjectorValue(variableID string, isRoleVar bool, attrs map[string]any) string {
	if !isRoleVar {
		return c.resolveRegularInjectable(variableID, attrs)
	}
	return c.resolveRoleVariable(variableID, attrs)
}

func (c *NodeConverter) resolveRegularInjectable(variableID string, attrs map[string]any) string {
	if v, ok := c.injectables[variableID]; ok {
		return c.formatInjectableValue(v, attrs)
	}
	return ""
}

func (c *NodeConverter) resolveRoleVariable(variableID string, attrs map[string]any) string {
	roleID, _ := attrs["roleId"].(string)
	propertyKey, _ := attrs["propertyKey"].(string)

	if roleValue, ok := c.signerRoleValues[roleID]; ok {
		if value := c.getRolePropertyValue(roleValue, propertyKey); value != "" {
			return value
		}
	}

	// Fallback: try injectables directly for cases like ROLE.Rol_1.email
	if v, ok := c.injectables[variableID]; ok {
		return c.formatInjectableValue(v, attrs)
	}
	return ""
}

func (c *NodeConverter) getRolePropertyValue(roleValue port.SignerRoleValue, propertyKey string) string {
	switch propertyKey {
	case portabledoc.RolePropertyName:
		return roleValue.Name
	case portabledoc.RolePropertyEmail:
		return roleValue.Email
	default:
		return ""
	}
}

func (c *NodeConverter) getDefaultValue(variableID string) string {
	if defaultVal, ok := c.injectableDefaults[variableID]; ok && defaultVal != "" {
		return defaultVal
	}
	return ""
}

func (c *NodeConverter) formatInjectableValue(value any, attrs map[string]any) string {
	injectorType, _ := attrs["type"].(string)
	format, _ := attrs["format"].(string)

	switch v := value.(type) {
	case string:
		return v
	case float64:
		return c.formatFloat64(v, injectorType, format)
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case bool:
		return formatBool(v)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func (c *NodeConverter) formatFloat64(v float64, injectorType, format string) string {
	if injectorType == portabledoc.InjectorTypeCurrency {
		if format != "" {
			return fmt.Sprintf("%s %.2f", format, v)
		}
		return fmt.Sprintf("%.2f", v)
	}

	if v == float64(int64(v)) {
		return strconv.FormatInt(int64(v), 10)
	}
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func formatBool(v bool) string {
	if v {
		return "Sí"
	}
	return "No"
}

func (c *NodeConverter) conditional(node portabledoc.Node) string {
	if c.evaluateCondition(node.Attrs) {
		return c.ConvertNodes(node.Content)
	}
	return ""
}

func (c *NodeConverter) evaluateCondition(attrs map[string]any) bool {
	conditionsRaw, ok := attrs["conditions"]
	if !ok {
		return true
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

		result := c.evaluateChild(child)

		if logic == portabledoc.LogicAND && !result {
			return false
		}
		if logic == portabledoc.LogicOR && result {
			return true
		}
	}

	return logic == portabledoc.LogicAND
}

func (c *NodeConverter) evaluateChild(child map[string]any) bool {
	childType, _ := child["type"].(string)
	switch childType {
	case portabledoc.LogicTypeGroup:
		return c.evaluateLogicGroup(child)
	case portabledoc.LogicTypeRule:
		return c.evaluateRule(child)
	default:
		return false
	}
}

func (c *NodeConverter) evaluateRule(rule map[string]any) bool {
	variableID, _ := rule["variableId"].(string)
	operator, _ := rule["operator"].(string)
	valueObj, _ := rule["value"].(map[string]any)

	actualValue := c.injectables[variableID]
	compareValue := c.resolveCompareValue(valueObj)

	return c.compareValues(actualValue, compareValue, operator)
}

func (c *NodeConverter) resolveCompareValue(valueObj map[string]any) any {
	valueMode, _ := valueObj["mode"].(string)
	compareValue := valueObj["value"]

	if valueMode == portabledoc.RuleModeVariable {
		compareVarID, _ := compareValue.(string)
		return c.injectables[compareVarID]
	}
	return compareValue
}

func (c *NodeConverter) compareValues(actual, compare any, operator string) bool {
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
	aNum := toFloat64(a)
	bNum := toFloat64(b)

	if aNum < bNum {
		return -1
	}
	if aNum > bNum {
		return 1
	}
	return 0
}

func toFloat64(v any) float64 {
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
		Count:     getIntAttr(attrs, "count", 1),
		Layout:    getStringAttr(attrs, "layout", portabledoc.LayoutSingleCenter),
		LineWidth: getStringAttr(attrs, "lineWidth", portabledoc.LineWidthMedium),
	}

	if sigsRaw, ok := attrs["signatures"].([]any); ok {
		result.Signatures = c.parseSignatureItems(sigsRaw)
	}
	return result
}

func (c *NodeConverter) parseSignatureItems(sigsRaw []any) []portabledoc.SignatureItem {
	items := make([]portabledoc.SignatureItem, 0, len(sigsRaw))
	for _, sigRaw := range sigsRaw {
		sigMap, ok := sigRaw.(map[string]any)
		if !ok {
			continue
		}
		items = append(items, c.parseSignatureItem(sigMap))
	}
	return items
}

func (c *NodeConverter) parseSignatureItem(sigMap map[string]any) portabledoc.SignatureItem {
	item := portabledoc.SignatureItem{
		ID:    getStringAttr(sigMap, "id", ""),
		Label: getStringAttr(sigMap, "label", ""),
	}

	item.RoleID = getStringPtrAttr(sigMap, "roleId")
	item.Subtitle = getStringPtrAttr(sigMap, "subtitle")
	item.ImageData = getStringPtrAttr(sigMap, "imageData")
	item.ImageOriginal = getStringPtrAttr(sigMap, "imageOriginal")
	item.ImageOpacity = getFloat64PtrAttr(sigMap, "imageOpacity")
	item.ImageRotation = getIntPtrAttr(sigMap, "imageRotation")
	item.ImageScale = getFloat64PtrAttr(sigMap, "imageScale")
	item.ImageX = getFloat64PtrAttr(sigMap, "imageX")
	item.ImageY = getFloat64PtrAttr(sigMap, "imageY")

	return item
}

func (c *NodeConverter) renderSignatureBlock(attrs portabledoc.SignatureAttrs) string {
	var sb strings.Builder
	sb.WriteString("<div class=\"signature-block\">\n")
	sb.WriteString(fmt.Sprintf("  <div class=\"signature-container layout-%s\">\n", attrs.Layout))

	for i := range attrs.Signatures {
		sb.WriteString(c.renderSignatureItem(&attrs.Signatures[i], attrs.LineWidth))
	}

	sb.WriteString("  </div>\n")
	sb.WriteString("</div>\n")
	return sb.String()
}

func (c *NodeConverter) renderSignatureItem(sig *portabledoc.SignatureItem, lineWidth string) string {
	var sb strings.Builder
	sb.WriteString("    <div class=\"signature-item\">\n")

	anchorString := c.getAnchorString(sig)
	sb.WriteString(fmt.Sprintf("      <div class=\"signature-line line-%s\">\n", lineWidth))

	if sig.IsSigned() {
		sb.WriteString(c.renderSignatureImage(sig))
	}

	sb.WriteString(fmt.Sprintf("        <span class=\"anchor-string\">%s</span>\n", html.EscapeString(anchorString)))
	sb.WriteString("      </div>\n")
	sb.WriteString(fmt.Sprintf("      <div class=\"signature-label\">%s</div>\n", html.EscapeString(sig.Label)))

	if sig.Subtitle != nil && *sig.Subtitle != "" {
		sb.WriteString(fmt.Sprintf("      <div class=\"signature-subtitle\">%s</div>\n", html.EscapeString(*sig.Subtitle)))
	}

	sb.WriteString("    </div>\n")
	return sb.String()
}

func (c *NodeConverter) renderSignatureImage(sig *portabledoc.SignatureItem) string {
	if sig.ImageData == nil || *sig.ImageData == "" {
		return ""
	}

	style := c.buildSignatureImageStyle(sig)
	return fmt.Sprintf("        <div class=\"signature-image-wrapper\"><img class=\"signature-image\" src=\"%s\" style=\"%s\" alt=\"Signature\"></div>\n",
		html.EscapeString(*sig.ImageData),
		style)
}

func (c *NodeConverter) buildSignatureImageStyle(sig *portabledoc.SignatureItem) string {
	var styleBuilder strings.Builder

	transforms := c.buildTransforms(sig)
	if len(transforms) > 0 {
		styleBuilder.WriteString(fmt.Sprintf("transform: %s; ", strings.Join(transforms, " ")))
	}

	if sig.ImageOpacity != nil {
		styleBuilder.WriteString(fmt.Sprintf("opacity: %.2f; ", *sig.ImageOpacity))
	}

	return styleBuilder.String()
}

func (c *NodeConverter) buildTransforms(sig *portabledoc.SignatureItem) []string {
	var transforms []string

	if sig.ImageX != nil || sig.ImageY != nil {
		x := getOrDefault(sig.ImageX, 0.0)
		y := getOrDefault(sig.ImageY, 0.0)
		transforms = append(transforms, fmt.Sprintf("translate(%.0fpx, %.0fpx)", x, y))
	}

	if sig.ImageRotation != nil && *sig.ImageRotation != 0 {
		transforms = append(transforms, fmt.Sprintf("rotate(%ddeg)", *sig.ImageRotation))
	}

	if sig.ImageScale != nil && *sig.ImageScale != 1.0 {
		transforms = append(transforms, fmt.Sprintf("scale(%.2f)", *sig.ImageScale))
	}

	return transforms
}

func (c *NodeConverter) getAnchorString(sig *portabledoc.SignatureItem) string {
	if sig.RoleID != nil && *sig.RoleID != "" {
		if role, ok := c.signerRoles[*sig.RoleID]; ok {
			sanitized := strings.ToLower(role.Label)
			sanitized = strings.ReplaceAll(sanitized, " ", "_")
			return fmt.Sprintf("__sig_%s__", sanitized)
		}
	}
	return fmt.Sprintf("__sig_%s__", sig.ID)
}

func (c *NodeConverter) pageBreak(_ portabledoc.Node) string {
	return "<div class=\"page-break\"></div>\n"
}

func (c *NodeConverter) image(node portabledoc.Node) string {
	src, _ := node.Attrs["src"].(string)
	if src == "" {
		return ""
	}

	alt, _ := node.Attrs["alt"].(string)
	width, _ := node.Attrs["width"].(float64)
	height, _ := node.Attrs["height"].(float64)
	displayMode, _ := node.Attrs["displayMode"].(string)
	align, _ := node.Attrs["align"].(string)

	style := c.buildImageStyle(width, height)
	classes := c.buildImageClasses(displayMode, align)
	imgTag := c.buildImgTag(src, alt, style)

	return fmt.Sprintf("<div class=\"%s\">%s</div>\n", strings.Join(classes, " "), imgTag)
}

func (c *NodeConverter) buildImageStyle(width, height float64) string {
	var styleBuilder strings.Builder
	if width > 0 {
		styleBuilder.WriteString(fmt.Sprintf("width: %.0fpx; ", width))
	}
	if height > 0 {
		styleBuilder.WriteString(fmt.Sprintf("height: %.0fpx; ", height))
	}
	return styleBuilder.String()
}

func (c *NodeConverter) buildImageClasses(displayMode, align string) []string {
	classes := []string{"document-image"}
	if displayMode != "" {
		classes = append(classes, fmt.Sprintf("display-%s", displayMode))
	}
	if align != "" {
		classes = append(classes, fmt.Sprintf("align-%s", align))
	}
	return classes
}

func (c *NodeConverter) buildImgTag(src, alt, style string) string {
	imgTag := fmt.Sprintf("<img src=\"%s\" alt=\"%s\"",
		html.EscapeString(src),
		html.EscapeString(alt))

	if style != "" {
		imgTag += fmt.Sprintf(" style=\"%s\"", style)
	}
	imgTag += ">"
	return imgTag
}

func (c *NodeConverter) text(node portabledoc.Node) string {
	if node.Text == nil {
		return ""
	}

	text := html.EscapeString(*node.Text)
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
		return c.applyHighlightMark(text, mark)
	case portabledoc.MarkTypeLink:
		return c.applyLinkMark(text, mark)
	default:
		return text
	}
}

func (c *NodeConverter) applyHighlightMark(text string, mark portabledoc.Mark) string {
	color := "#ffeb3b"
	if c, ok := mark.Attrs["color"].(string); ok && c != "" {
		color = c
	}
	return fmt.Sprintf("<mark style=\"background-color: %s\">%s</mark>", html.EscapeString(color), text)
}

func (c *NodeConverter) applyLinkMark(text string, mark portabledoc.Mark) string {
	href, _ := mark.Attrs["href"].(string)
	if href == "" {
		return text
	}

	target, _ := mark.Attrs["target"].(string)
	if target != "" {
		return fmt.Sprintf("<a href=\"%s\" target=\"%s\">%s</a>", html.EscapeString(href), html.EscapeString(target), text)
	}
	return fmt.Sprintf("<a href=\"%s\">%s</a>", html.EscapeString(href), text)
}

// Helper functions for attribute parsing

func clamp(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func getStringAttr(attrs map[string]any, key, defaultVal string) string {
	if v, ok := attrs[key].(string); ok {
		return v
	}
	return defaultVal
}

func getIntAttr(attrs map[string]any, key string, defaultVal int) int {
	if v, ok := attrs[key].(float64); ok {
		return int(v)
	}
	return defaultVal
}

func getStringPtrAttr(attrs map[string]any, key string) *string {
	if v, ok := attrs[key].(string); ok {
		return &v
	}
	return nil
}

func getFloat64PtrAttr(attrs map[string]any, key string) *float64 {
	if v, ok := attrs[key].(float64); ok {
		return &v
	}
	return nil
}

func getIntPtrAttr(attrs map[string]any, key string) *int {
	if v, ok := attrs[key].(float64); ok {
		i := int(v)
		return &i
	}
	return nil
}

func getOrDefault[T any](ptr *T, defaultVal T) T {
	if ptr != nil {
		return *ptr
	}
	return defaultVal
}
