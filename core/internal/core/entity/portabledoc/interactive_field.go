package portabledoc

// InteractiveFieldAttrs represents interactive field attributes in a document.
type InteractiveFieldAttrs struct {
	ID            string              `json:"id"`
	FieldType     string              `json:"fieldType"`               // "checkbox" | "radio" | "text"
	RoleID        string              `json:"roleId"`
	Label         string              `json:"label"`                   // question/title
	Required      bool                `json:"required"`
	Options       []InteractiveOption `json:"options,omitempty"`       // checkbox/radio
	Placeholder   string              `json:"placeholder,omitempty"`   // text
	MaxLength     int                 `json:"maxLength,omitempty"`     // text, 0=unlimited
	OptionsLayout string              `json:"optionsLayout,omitempty"` // "vertical" | "inline", default: vertical
}

// GetOptionsLayout returns the layout, defaulting to vertical.
func (a *InteractiveFieldAttrs) GetOptionsLayout() string {
	if a.OptionsLayout == InteractiveFieldLayoutInline {
		return InteractiveFieldLayoutInline
	}
	return InteractiveFieldLayoutVertical
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

// Interactive field layout constants.
const (
	InteractiveFieldLayoutVertical = "vertical"
	InteractiveFieldLayoutInline   = "inline"
)

// ValidInteractiveFieldTypes contains allowed interactive field types.
var ValidInteractiveFieldTypes = Set[string]{
	InteractiveFieldTypeCheckbox: {},
	InteractiveFieldTypeRadio:    {},
	InteractiveFieldTypeText:     {},
}
