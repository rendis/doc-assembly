package pdfrenderer

import (
	"fmt"
	"html"
	"strconv"
	"strings"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// NodeConverter converts ProseMirror/TipTap nodes to HTML.
type NodeConverter struct {
	injectables              map[string]any
	injectableDefaults       map[string]string
	signerRoleValues         map[string]port.SignerRoleValue
	signerRoles              map[string]portabledoc.SignerRole // roleID -> SignerRole
	currentPage              int                               // 1-indexed page tracking
	signatureFields          []port.SignatureField             // collected signature fields
	currentTableHeaderStyles *entity.TableStyles               // current table header styles (for child access)
	currentTableBodyStyles   *entity.TableStyles               // current table body styles (for child access)
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
		currentPage:        1, // Start on page 1
		signatureFields:    make([]port.SignatureField, 0),
	}
}

// GetSignatureFields returns the collected signature fields.
func (c *NodeConverter) GetSignatureFields() []port.SignatureField {
	return c.signatureFields
}

// GetCurrentPage returns the current page number.
func (c *NodeConverter) GetCurrentPage() int {
	return c.currentPage
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
	if handler := c.getNodeHandler(node.Type); handler != nil {
		return handler(node)
	}
	return c.handleUnknownNode(node)
}

// nodeHandler is a function that converts a node to HTML.
type nodeHandler func(node portabledoc.Node) string

// getNodeHandler returns the handler function for a given node type.
func (c *NodeConverter) getNodeHandler(nodeType string) nodeHandler {
	handlers := map[string]nodeHandler{
		portabledoc.NodeTypeParagraph:     c.paragraph,
		portabledoc.NodeTypeHeading:       c.heading,
		portabledoc.NodeTypeBlockquote:    c.blockquote,
		portabledoc.NodeTypeCodeBlock:     c.codeBlock,
		portabledoc.NodeTypeHR:            c.horizontalRule,
		portabledoc.NodeTypeBulletList:    c.bulletList,
		portabledoc.NodeTypeOrderedList:   c.orderedList,
		portabledoc.NodeTypeTaskList:      c.taskList,
		portabledoc.NodeTypeListItem:      c.listItem,
		portabledoc.NodeTypeTaskItem:      c.taskItem,
		portabledoc.NodeTypeInjector:      c.injector,
		portabledoc.NodeTypeConditional:   c.conditional,
		portabledoc.NodeTypeSignature:     c.signature,
		portabledoc.NodeTypePageBreak:     c.pageBreak,
		portabledoc.NodeTypeImage:         c.image,
		portabledoc.NodeTypeCustomImage:   c.image,
		portabledoc.NodeTypeText:          c.text,
		portabledoc.NodeTypeTableInjector: c.tableInjector,
		portabledoc.NodeTypeTable:         c.table,
		portabledoc.NodeTypeTableRow:      c.tableRow,
		portabledoc.NodeTypeTableCell:     c.tableCellData,
		portabledoc.NodeTypeTableHeader:   c.tableCellHeader,
	}
	return handlers[nodeType]
}

// tableCellData renders a data cell.
func (c *NodeConverter) tableCellData(node portabledoc.Node) string {
	return c.tableCell(node, false)
}

// tableCellHeader renders a header cell.
func (c *NodeConverter) tableCellHeader(node portabledoc.Node) string {
	return c.tableCell(node, true)
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
	c.collectSignatureFields(attrs)
	return c.renderSignatureBlock(attrs)
}

// collectSignatureFields extracts signature field positions from the signature block.
func (c *NodeConverter) collectSignatureFields(attrs portabledoc.SignatureAttrs) {
	// Default signature dimensions (as percentage of page)
	const (
		defaultWidth  = 30.0 // 30% of page width
		defaultHeight = 8.0  // 8% of page height
	)

	// Calculate X positions based on layout
	xPositions := c.calculateXPositions(attrs.Layout, attrs.Count)

	// Default Y position - approximation based on typical document layouts
	// The exact position depends on document content; this targets upper-middle area
	yPosition := 55.0 // 55% from top (middle-upper area where signature lines typically appear)

	for i, sig := range attrs.Signatures {
		if sig.RoleID == nil || *sig.RoleID == "" {
			continue
		}

		roleID := *sig.RoleID
		anchorString := c.getAnchorString(&sig)

		// Get X position for this signature index
		xPos := 35.0 // default center
		if i < len(xPositions) {
			xPos = xPositions[i]
		}

		c.signatureFields = append(c.signatureFields, port.SignatureField{
			RoleID:       roleID,
			AnchorString: anchorString,
			Page:         c.currentPage,
			PositionX:    xPos,
			PositionY:    yPosition,
			Width:        defaultWidth,
			Height:       defaultHeight,
		})
	}
}

// layoutPositions maps layout types to X positions (as percentage of page width).
var layoutPositions = map[string][]float64{
	portabledoc.LayoutSingleLeft:      {5.0},
	portabledoc.LayoutSingleCenter:    {35.0},
	portabledoc.LayoutSingleRight:     {65.0},
	portabledoc.LayoutDualSides:       {5.0, 55.0},
	portabledoc.LayoutDualCenter:      {20.0, 50.0},
	portabledoc.LayoutDualLeft:        {5.0, 35.0},
	portabledoc.LayoutDualRight:       {35.0, 65.0},
	portabledoc.LayoutTripleRow:       {5.0, 35.0, 65.0},
	portabledoc.LayoutTriplePyramid:   {35.0, 5.0, 65.0},
	portabledoc.LayoutTripleInverted:  {5.0, 65.0, 35.0},
	portabledoc.LayoutQuadGrid:        {5.0, 50.0, 5.0, 50.0},
	portabledoc.LayoutQuadTopHeavy:    {5.0, 35.0, 65.0, 35.0},
	portabledoc.LayoutQuadBottomHeavy: {35.0, 5.0, 35.0, 65.0},
}

// calculateXPositions returns X positions for signatures based on layout.
func (c *NodeConverter) calculateXPositions(layout string, count int) []float64 {
	if positions, ok := layoutPositions[layout]; ok {
		return positions
	}
	return c.defaultXPositions(count)
}

// defaultXPositions generates positions based on count when layout is unknown.
func (c *NodeConverter) defaultXPositions(count int) []float64 {
	positions := make([]float64, count)
	for i := range positions {
		positions[i] = float64(5 + i*30)
	}
	return positions
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
	c.currentPage++
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

// --- Table Rendering ---

// tableInjector renders a dynamic table from a system injector (tableInjector node).
func (c *NodeConverter) tableInjector(node portabledoc.Node) string {
	variableID, _ := node.Attrs["variableId"].(string)
	lang, _ := node.Attrs["lang"].(string)
	if lang == "" {
		lang = "en"
	}

	// Try to resolve table value from injectables
	tableData := c.resolveTableValue(variableID)
	if tableData == nil {
		// Return placeholder if table not found
		label, _ := node.Attrs["label"].(string)
		if label == "" {
			label = variableID
		}
		return fmt.Sprintf("<div class=\"table-placeholder\">[Table: %s]</div>\n", html.EscapeString(label))
	}

	// Override styles from node attrs if provided
	headerStyles := c.parseTableStylesFromAttrs(node.Attrs, "header")
	bodyStyles := c.parseTableStylesFromAttrs(node.Attrs, "body")

	// Merge with table's own styles (node attrs take precedence)
	if tableData.HeaderStyles != nil {
		headerStyles = c.mergeTableStyles(tableData.HeaderStyles, headerStyles)
	}
	if tableData.BodyStyles != nil {
		bodyStyles = c.mergeTableStyles(tableData.BodyStyles, bodyStyles)
	}

	return c.renderTableHTML(tableData, lang, headerStyles, bodyStyles)
}

// resolveTableValue gets a TableValue from the injectables map.
// Supports both direct *entity.TableValue and map[string]any from JSON.
func (c *NodeConverter) resolveTableValue(variableID string) *entity.TableValue {
	if v, ok := c.injectables[variableID]; ok {
		// Direct TableValue pointer (from backend injector resolution)
		if tableVal, ok := v.(*entity.TableValue); ok {
			return tableVal
		}
		// JSON-decoded map (from frontend preview request)
		if mapVal, ok := v.(map[string]any); ok {
			return c.parseTableFromMap(mapVal)
		}
	}
	return nil
}

// parseTableFromMap converts a JSON-decoded map to *entity.TableValue.
// This is used when receiving table data from the frontend preview request.
func (c *NodeConverter) parseTableFromMap(m map[string]any) *entity.TableValue {
	table := entity.NewTableValue()
	c.parseColumnsFromMap(m, table)
	c.parseRowsFromMap(m, table)
	return table
}

// parseColumnsFromMap extracts columns from a JSON map and adds them to the table.
func (c *NodeConverter) parseColumnsFromMap(m map[string]any, table *entity.TableValue) {
	cols, ok := m["columns"].([]any)
	if !ok {
		return
	}
	for _, colAny := range cols {
		col, ok := colAny.(map[string]any)
		if !ok {
			continue
		}
		c.addColumnFromMap(col, table)
	}
}

// addColumnFromMap parses a single column map and adds it to the table.
func (c *NodeConverter) addColumnFromMap(col map[string]any, table *entity.TableValue) {
	key, _ := col["key"].(string)
	dataTypeStr, _ := col["dataType"].(string)
	labels := c.parseLabelsFromMap(col)
	dataType := c.parseDataType(dataTypeStr)

	if width, ok := col["width"].(string); ok && width != "" {
		table.AddColumnWithWidth(key, labels, dataType, width)
	} else {
		table.AddColumn(key, labels, dataType)
	}
}

// parseLabelsFromMap extracts i18n labels from a column map.
func (c *NodeConverter) parseLabelsFromMap(col map[string]any) map[string]string {
	labels := make(map[string]string)
	labelsMap, ok := col["labels"].(map[string]any)
	if !ok {
		return labels
	}
	for lang, label := range labelsMap {
		if labelStr, ok := label.(string); ok {
			labels[lang] = labelStr
		}
	}
	return labels
}

// parseRowsFromMap extracts rows from a JSON map and adds them to the table.
func (c *NodeConverter) parseRowsFromMap(m map[string]any, table *entity.TableValue) {
	rows, ok := m["rows"].([]any)
	if !ok {
		return
	}
	for _, rowAny := range rows {
		row, ok := rowAny.(map[string]any)
		if !ok {
			continue
		}
		cells := c.parseCellsFromRow(row)
		if len(cells) > 0 {
			table.AddRow(cells...)
		}
	}
}

// parseCellsFromRow extracts cells from a row map.
func (c *NodeConverter) parseCellsFromRow(row map[string]any) []entity.TableCell {
	cellsAny, ok := row["cells"].([]any)
	if !ok {
		return nil
	}
	cells := make([]entity.TableCell, 0, len(cellsAny))
	for _, cellAny := range cellsAny {
		if cell, ok := cellAny.(map[string]any); ok {
			cells = append(cells, c.parseCellFromMap(cell))
		}
	}
	return cells
}

// parseCellFromMap converts a JSON cell map to entity.TableCell.
func (c *NodeConverter) parseCellFromMap(cell map[string]any) entity.TableCell {
	valueMap, ok := cell["value"].(map[string]any)
	if !ok || valueMap == nil {
		return entity.EmptyCell()
	}
	return c.parseInjectableValue(valueMap)
}

// parseInjectableValue converts a value map to a TableCell with the appropriate type.
func (c *NodeConverter) parseInjectableValue(valueMap map[string]any) entity.TableCell {
	typeStr, _ := valueMap["type"].(string)

	switch typeStr {
	case "STRING":
		return c.parseStringCell(valueMap)
	case "NUMBER":
		return c.parseNumberCell(valueMap)
	case "BOOLEAN":
		return c.parseBoolCell(valueMap)
	case "DATE":
		return c.parseDateCell(valueMap)
	default:
		return entity.EmptyCell()
	}
}

func (c *NodeConverter) parseStringCell(valueMap map[string]any) entity.TableCell {
	if strVal, ok := valueMap["strVal"].(string); ok {
		return entity.Cell(entity.StringValue(strVal))
	}
	return entity.EmptyCell()
}

func (c *NodeConverter) parseNumberCell(valueMap map[string]any) entity.TableCell {
	if numVal, ok := valueMap["numVal"].(float64); ok {
		return entity.Cell(entity.NumberValue(numVal))
	}
	return entity.EmptyCell()
}

func (c *NodeConverter) parseBoolCell(valueMap map[string]any) entity.TableCell {
	if boolVal, ok := valueMap["boolVal"].(bool); ok {
		return entity.Cell(entity.BoolValue(boolVal))
	}
	return entity.EmptyCell()
}

func (c *NodeConverter) parseDateCell(valueMap map[string]any) entity.TableCell {
	timeStr, ok := valueMap["timeVal"].(string)
	if !ok || timeStr == "" {
		return entity.EmptyCell()
	}

	layouts := []string{"2006-01-02", "2006-01-02T15:04:05Z07:00", "2006-01-02T15:04:05"}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, timeStr); err == nil {
			return entity.Cell(entity.TimeValue(t))
		}
	}
	// Fallback to string if date parsing fails
	return entity.Cell(entity.StringValue(timeStr))
}

// parseDataType converts a string dataType to entity.ValueType.
func (c *NodeConverter) parseDataType(s string) entity.ValueType {
	switch s {
	case "NUMBER", "CURRENCY":
		return entity.ValueTypeNumber
	case "BOOLEAN":
		return entity.ValueTypeBool
	case "DATE":
		return entity.ValueTypeTime
	case "TABLE":
		return entity.ValueTypeTable
	default:
		return entity.ValueTypeString
	}
}

// renderTableHTML generates HTML for a TableValue.
func (c *NodeConverter) renderTableHTML(tableData *entity.TableValue, lang string, headerStyles, bodyStyles *entity.TableStyles) string {
	var sb strings.Builder
	sb.WriteString("<table class=\"document-table\">\n")

	// Render header row
	sb.WriteString("  <thead>\n    <tr>\n")
	for _, col := range tableData.Columns {
		label := c.getColumnLabel(col, lang)
		styleAttr := c.buildTableStyleAttr(headerStyles, true)
		widthAttr := ""
		if col.Width != nil {
			widthAttr = fmt.Sprintf(" width=\"%s\"", html.EscapeString(*col.Width))
		}
		sb.WriteString(fmt.Sprintf("      <th%s%s>%s</th>\n", styleAttr, widthAttr, html.EscapeString(label)))
	}
	sb.WriteString("    </tr>\n  </thead>\n")

	// Render body rows
	sb.WriteString("  <tbody>\n")
	for _, row := range tableData.Rows {
		sb.WriteString("    <tr>\n")
		for i, cell := range row.Cells {
			// Skip empty cells (merged cell placeholders)
			if cell.Value == nil && cell.Colspan == 0 && cell.Rowspan == 0 {
				continue
			}

			styleAttr := c.buildTableStyleAttr(bodyStyles, false)
			spanAttrs := c.buildSpanAttrs(cell.Colspan, cell.Rowspan)

			// Get format from column if available
			var format string
			if i < len(tableData.Columns) && tableData.Columns[i].Format != nil {
				format = *tableData.Columns[i].Format
			}

			cellContent := c.formatCellValue(cell.Value, format)
			sb.WriteString(fmt.Sprintf("      <td%s%s>%s</td>\n", styleAttr, spanAttrs, cellContent))
		}
		sb.WriteString("    </tr>\n")
	}
	sb.WriteString("  </tbody>\n")

	sb.WriteString("</table>\n")
	return sb.String()
}

// getColumnLabel returns the label for a column in the specified language.
func (c *NodeConverter) getColumnLabel(col entity.TableColumn, lang string) string {
	if label, ok := col.Labels[lang]; ok {
		return label
	}
	// Fallback to English, then first available, then key
	if label, ok := col.Labels["en"]; ok {
		return label
	}
	for _, label := range col.Labels {
		return label
	}
	return col.Key
}

// formatCellValue formats an InjectableValue for display in a table cell.
func (c *NodeConverter) formatCellValue(value *entity.InjectableValue, format string) string {
	if value == nil {
		return ""
	}

	switch value.Type() {
	case entity.ValueTypeString:
		s, _ := value.String()
		return html.EscapeString(s)
	case entity.ValueTypeNumber:
		n, _ := value.Number()
		if format != "" {
			return fmt.Sprintf(format, n)
		}
		if n == float64(int64(n)) {
			return strconv.FormatInt(int64(n), 10)
		}
		return strconv.FormatFloat(n, 'f', 2, 64)
	case entity.ValueTypeBool:
		b, _ := value.Bool()
		if b {
			return "Yes"
		}
		return "No"
	case entity.ValueTypeTime:
		t, _ := value.Time()
		if format != "" {
			return t.Format(format)
		}
		return t.Format("2006-01-02")
	default:
		return ""
	}
}

// table renders an editable table (user-created with TipTap).
func (c *NodeConverter) table(node portabledoc.Node) string {
	// Parse table styles from attrs
	headerStyles := c.parseTableStylesFromAttrs(node.Attrs, "header")
	bodyStyles := c.parseTableStylesFromAttrs(node.Attrs, "body")

	var sb strings.Builder
	sb.WriteString("<table class=\"document-table\">\n")

	// Store styles for child nodes to access
	c.currentTableHeaderStyles = headerStyles
	c.currentTableBodyStyles = bodyStyles

	// Render children (tableRow nodes)
	for _, child := range node.Content {
		sb.WriteString(c.ConvertNode(child))
	}

	// Clear stored styles
	c.currentTableHeaderStyles = nil
	c.currentTableBodyStyles = nil

	sb.WriteString("</table>\n")
	return sb.String()
}

// tableRow renders a table row.
func (c *NodeConverter) tableRow(node portabledoc.Node) string {
	var sb strings.Builder
	sb.WriteString("  <tr>\n")
	for _, child := range node.Content {
		sb.WriteString(c.ConvertNode(child))
	}
	sb.WriteString("  </tr>\n")
	return sb.String()
}

// tableCell renders a table cell (header or data).
func (c *NodeConverter) tableCell(node portabledoc.Node, isHeader bool) string {
	tag := "td"
	styles := c.currentTableBodyStyles
	if isHeader {
		tag = "th"
		styles = c.currentTableHeaderStyles
	}

	styleAttr := c.buildTableStyleAttr(styles, isHeader)

	// Handle colspan and rowspan
	colspan := getIntAttr(node.Attrs, "colspan", 1)
	rowspan := getIntAttr(node.Attrs, "rowspan", 1)
	spanAttrs := c.buildSpanAttrs(colspan, rowspan)

	// Render cell content (may contain inline injectors)
	content := c.ConvertNodes(node.Content)
	if content == "" {
		content = "&nbsp;"
	}

	return fmt.Sprintf("    <%s%s%s>%s</%s>\n", tag, styleAttr, spanAttrs, content, tag)
}

// parseTableStylesFromAttrs extracts table styles from node attributes.
func (c *NodeConverter) parseTableStylesFromAttrs(attrs map[string]any, prefix string) *entity.TableStyles {
	styles := &entity.TableStyles{}
	hasStyles := false

	if v, ok := attrs[prefix+"FontFamily"].(string); ok && v != "" {
		styles.FontFamily = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"FontSize"].(float64); ok && v > 0 {
		i := int(v)
		styles.FontSize = &i
		hasStyles = true
	}
	if v, ok := attrs[prefix+"FontWeight"].(string); ok && v != "" {
		styles.FontWeight = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"TextColor"].(string); ok && v != "" {
		styles.TextColor = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"TextAlign"].(string); ok && v != "" {
		styles.TextAlign = &v
		hasStyles = true
	}
	if v, ok := attrs[prefix+"Background"].(string); ok && v != "" {
		styles.Background = &v
		hasStyles = true
	}

	if !hasStyles {
		return nil
	}
	return styles
}

// mergeTableStyles merges base styles with override styles (override takes precedence).
func (c *NodeConverter) mergeTableStyles(base, override *entity.TableStyles) *entity.TableStyles {
	if base == nil {
		return override
	}
	if override == nil {
		return base
	}

	result := *base
	if override.FontFamily != nil {
		result.FontFamily = override.FontFamily
	}
	if override.FontSize != nil {
		result.FontSize = override.FontSize
	}
	if override.FontWeight != nil {
		result.FontWeight = override.FontWeight
	}
	if override.TextColor != nil {
		result.TextColor = override.TextColor
	}
	if override.TextAlign != nil {
		result.TextAlign = override.TextAlign
	}
	if override.Background != nil {
		result.Background = override.Background
	}
	return &result
}

// buildTableStyleAttr builds an inline style attribute from TableStyles.
func (c *NodeConverter) buildTableStyleAttr(styles *entity.TableStyles, isHeader bool) string {
	if styles == nil {
		return ""
	}

	var parts []string
	if styles.FontFamily != nil {
		parts = append(parts, fmt.Sprintf("font-family:%s", *styles.FontFamily))
	}
	if styles.FontSize != nil {
		parts = append(parts, fmt.Sprintf("font-size:%dpx", *styles.FontSize))
	}
	if styles.FontWeight != nil {
		parts = append(parts, fmt.Sprintf("font-weight:%s", *styles.FontWeight))
	}
	if styles.TextColor != nil {
		parts = append(parts, fmt.Sprintf("color:%s", *styles.TextColor))
	}
	if styles.TextAlign != nil {
		parts = append(parts, fmt.Sprintf("text-align:%s", *styles.TextAlign))
	}
	if styles.Background != nil {
		parts = append(parts, fmt.Sprintf("background-color:%s", *styles.Background))
	}

	if len(parts) == 0 {
		return ""
	}
	return fmt.Sprintf(" style=\"%s\"", strings.Join(parts, ";"))
}

// buildSpanAttrs builds colspan and rowspan attributes.
func (c *NodeConverter) buildSpanAttrs(colspan, rowspan int) string {
	var attrs []string
	if colspan > 1 {
		attrs = append(attrs, fmt.Sprintf("colspan=\"%d\"", colspan))
	}
	if rowspan > 1 {
		attrs = append(attrs, fmt.Sprintf("rowspan=\"%d\"", rowspan))
	}
	if len(attrs) == 0 {
		return ""
	}
	return " " + strings.Join(attrs, " ")
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
