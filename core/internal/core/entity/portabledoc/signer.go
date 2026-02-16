package portabledoc

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
	Type  string `json:"type"`  // "text" | "injectable"
	Value string `json:"value"` // literal text or variableId
}

// Field type constants.
const (
	FieldTypeText       = "text"
	FieldTypeInjectable = "injectable"
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
