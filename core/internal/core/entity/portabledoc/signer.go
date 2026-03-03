package portabledoc

import "strings"

// SignerRole defines a signer role in the document.
type SignerRole struct {
	ID    string     `json:"id"`
	Label string     `json:"label"`
	Name  FieldValue `json:"name"`
	Email FieldValue `json:"email"`
	Order int        `json:"order"`
}

// FieldValue represents a field value (text or injectable reference).
type FieldValue struct {
	Type string `json:"type"` // "text" | "injectable"
	// Legacy/single value.
	// For text: literal value.
	// For injectable: single variableId.
	Value string `json:"value,omitempty"`
	// Multi-value injectable support (used by signer name field).
	Values []string `json:"values,omitempty"`
	// Separator for multi-value injectable concatenation.
	// Supported values: "space" (default).
	Separator string `json:"separator,omitempty"`
}

// Field type constants.
const (
	FieldTypeText       = "text"
	FieldTypeInjectable = "injectable"

	FieldSeparatorSpace = "space"
)

// IsText returns true if field type is text.
func (f FieldValue) IsText() bool {
	return f.Type == FieldTypeText
}

// IsInjectable returns true if field type is injectable.
func (f FieldValue) IsInjectable() bool {
	return f.Type == FieldTypeInjectable
}

// IsEmpty returns true if the field value is empty.
func (f FieldValue) IsEmpty() bool {
	return f.Value == ""
}

// ValidFieldTypes contains allowed field types.
var ValidFieldTypes = Set[string]{
	FieldTypeText:       {},
	FieldTypeInjectable: {},
}

// InjectableRefs returns normalized injectable references.
// - Uses Values when provided
// - Falls back to Value for backward compatibility
func (f FieldValue) InjectableRefs() []string {
	if len(f.Values) > 0 {
		refs := make([]string, 0, len(f.Values))
		for _, v := range f.Values {
			if strings.TrimSpace(v) != "" {
				refs = append(refs, v)
			}
		}
		return refs
	}

	if strings.TrimSpace(f.Value) == "" {
		return nil
	}
	return []string{f.Value}
}

// ResolveSeparator returns a concrete separator string for concatenation.
func (f FieldValue) ResolveSeparator() string {
	if f.Separator == FieldSeparatorSpace || f.Separator == "" {
		return " "
	}
	return " "
}
