package portabledoc

// InteractiveFieldAttrs represents interactive field attributes in a document.
type InteractiveFieldAttrs struct {
	ID          string              `json:"id"`
	FieldType   string              `json:"fieldType"` // "checkbox" | "radio" | "text"
	RoleID      string              `json:"roleId"`
	Label       string              `json:"label"` // question/title
	Required    bool                `json:"required"`
	Options     []InteractiveOption `json:"options,omitempty"`     // checkbox/radio
	Placeholder string              `json:"placeholder,omitempty"` // text
	MaxLength   int                 `json:"maxLength,omitempty"`   // text, 0=unlimited
}

// InteractiveOption represents a single option in a checkbox or radio field.
type InteractiveOption struct {
	ID    string `json:"id"`
	Label string `json:"label"`
}

// Interactive field type constants.
const (
	InteractiveFieldTypeCheckbox = "checkbox"
	InteractiveFieldTypeRadio    = "radio"
	InteractiveFieldTypeText     = "text"
)

// ValidInteractiveFieldTypes contains allowed interactive field types.
var ValidInteractiveFieldTypes = Set[string]{
	InteractiveFieldTypeCheckbox: {},
	InteractiveFieldTypeRadio:    {},
	InteractiveFieldTypeText:     {},
}
