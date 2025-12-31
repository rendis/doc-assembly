package contractgenerator

import (
	"regexp"
	"strings"
)

// markerRegex matches markers in format [[ content ]]
var markerRegex = regexp.MustCompile(`\[\[\s*([^\]]+?)\s*\]\]`)

// roleRegex matches ROLE.{label}.{property} pattern
var roleRegex = regexp.MustCompile(`^ROLE\.(\w+)\.(\w+)$`)

// Marker represents a detected marker in the text.
type Marker struct {
	OriginalText string // Full match including brackets: [[ ROLE.cliente.name ]]
	Content      string // Trimmed content: ROLE.cliente.name
	IsRole       bool   // True if this is a ROLE marker
	RoleLabel    string // Role label: cliente (only if IsRole)
	RoleProperty string // Role property: name (only if IsRole)
	StartPos     int    // Start position in original text
	EndPos       int    // End position in original text
}

// DetectedRole represents a unique role detected in the document.
type DetectedRole struct {
	Label      string   // Role label (e.g., "cliente", "empresa")
	Properties []string // Properties found (e.g., ["name", "email"])
}

// DetectedInjectable represents an injectable detected in the document.
type DetectedInjectable struct {
	Key      string // Injectable key (e.g., "rut_cliente")
	IsMapped bool   // True if it exists in availableInjectables
}

// ExtractMarkers finds all markers in the text and returns them.
func ExtractMarkers(text string) []Marker {
	var markers []Marker

	matches := markerRegex.FindAllStringSubmatchIndex(text, -1)
	for _, match := range matches {
		// match[0]:match[1] is the full match [[ ... ]]
		// match[2]:match[3] is the capture group content
		fullMatch := text[match[0]:match[1]]
		content := strings.TrimSpace(text[match[2]:match[3]])

		marker := Marker{
			OriginalText: fullMatch,
			Content:      content,
			StartPos:     match[0],
			EndPos:       match[1],
		}

		// Check if it's a ROLE marker
		if roleMatch := roleRegex.FindStringSubmatch(content); roleMatch != nil {
			marker.IsRole = true
			marker.RoleLabel = roleMatch[1]
			marker.RoleProperty = roleMatch[2]
		}

		markers = append(markers, marker)
	}

	return markers
}

// ExtractUniqueRoles extracts unique roles from markers.
func ExtractUniqueRoles(markers []Marker) []DetectedRole {
	roleMap := make(map[string]*DetectedRole)

	for _, m := range markers {
		if !m.IsRole {
			continue
		}

		if existing, ok := roleMap[m.RoleLabel]; ok {
			// Add property if not already present
			found := false
			for _, p := range existing.Properties {
				if p == m.RoleProperty {
					found = true
					break
				}
			}
			if !found {
				existing.Properties = append(existing.Properties, m.RoleProperty)
			}
		} else {
			roleMap[m.RoleLabel] = &DetectedRole{
				Label:      m.RoleLabel,
				Properties: []string{m.RoleProperty},
			}
		}
	}

	// Convert map to slice
	var roles []DetectedRole
	for _, r := range roleMap {
		roles = append(roles, *r)
	}

	return roles
}

// ClassifyInjectables classifies markers as mapped or suggested injectables.
func ClassifyInjectables(markers []Marker, availableKeys map[string]bool) []DetectedInjectable {
	seen := make(map[string]bool)
	var injectables []DetectedInjectable

	for _, m := range markers {
		// Skip role markers - they're handled separately
		if m.IsRole {
			continue
		}

		key := m.Content
		if seen[key] {
			continue
		}
		seen[key] = true

		injectables = append(injectables, DetectedInjectable{
			Key:      key,
			IsMapped: availableKeys[key],
		})
	}

	return injectables
}

// MarkerSegment represents a segment of text that may or may not contain a marker.
type MarkerSegment struct {
	Text     string  // The text content
	IsMarker bool    // True if this is a marker
	Marker   *Marker // The marker details (only if IsMarker)
}

// SegmentTextWithMarkers splits text into segments of plain text and markers.
func SegmentTextWithMarkers(text string) []MarkerSegment {
	var segments []MarkerSegment

	matches := markerRegex.FindAllStringSubmatchIndex(text, -1)
	if len(matches) == 0 {
		// No markers, return the entire text as one segment
		if text != "" {
			segments = append(segments, MarkerSegment{Text: text, IsMarker: false})
		}
		return segments
	}

	lastEnd := 0
	for _, match := range matches {
		// Add text before this marker
		if match[0] > lastEnd {
			segments = append(segments, MarkerSegment{
				Text:     text[lastEnd:match[0]],
				IsMarker: false,
			})
		}

		// Add the marker
		content := strings.TrimSpace(text[match[2]:match[3]])
		marker := Marker{
			OriginalText: text[match[0]:match[1]],
			Content:      content,
			StartPos:     match[0],
			EndPos:       match[1],
		}

		if roleMatch := roleRegex.FindStringSubmatch(content); roleMatch != nil {
			marker.IsRole = true
			marker.RoleLabel = roleMatch[1]
			marker.RoleProperty = roleMatch[2]
		}

		segments = append(segments, MarkerSegment{
			Text:     marker.OriginalText,
			IsMarker: true,
			Marker:   &marker,
		})

		lastEnd = match[1]
	}

	// Add any remaining text after the last marker
	if lastEnd < len(text) {
		segments = append(segments, MarkerSegment{
			Text:     text[lastEnd:],
			IsMarker: false,
		})
	}

	return segments
}
