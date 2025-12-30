package portabledoc

import "fmt"

// InjectorAttrs represents injector node attributes.
type InjectorAttrs struct {
	Type           string  `json:"type"`
	Label          string  `json:"label"`
	VariableID     string  `json:"variableId"`
	Format         *string `json:"format,omitempty"`
	Required       *bool   `json:"required,omitempty"`
	IsRoleVariable *bool   `json:"isRoleVariable,omitempty"`
	RoleID         *string `json:"roleId,omitempty"`
	RoleLabel      *string `json:"roleLabel,omitempty"`
	PropertyKey    *string `json:"propertyKey,omitempty"` // "name" | "email"
}

// IsRoleVar returns true if this is a role variable.
func (i InjectorAttrs) IsRoleVar() bool {
	return i.IsRoleVariable != nil && *i.IsRoleVariable
}

// Injector type constants.
const (
	InjectorTypeText     = "TEXT"
	InjectorTypeNumber   = "NUMBER"
	InjectorTypeDate     = "DATE"
	InjectorTypeCurrency = "CURRENCY"
	InjectorTypeBoolean  = "BOOLEAN"
	InjectorTypeImage    = "IMAGE"
	InjectorTypeTable    = "TABLE"
	InjectorTypeRoleText = "ROLE_TEXT"
)

// ValidInjectorTypes contains allowed injector types.
var ValidInjectorTypes = Set[string]{
	InjectorTypeText:     {},
	InjectorTypeNumber:   {},
	InjectorTypeDate:     {},
	InjectorTypeCurrency: {},
	InjectorTypeBoolean:  {},
	InjectorTypeImage:    {},
	InjectorTypeTable:    {},
	InjectorTypeRoleText: {},
}

// Role property constants.
const (
	RolePropertyName  = "name"
	RolePropertyEmail = "email"
)

// ValidRoleProperties contains allowed role property keys.
var ValidRoleProperties = Set[string]{
	RolePropertyName:  {},
	RolePropertyEmail: {},
}

// RoleVariablePrefix is the prefix for role variable IDs.
const RoleVariablePrefix = "ROLE."

// BuildRoleVariableID builds a role variable ID from label and property.
// Format: ROLE.{label}.{property}
func BuildRoleVariableID(label, property string) string {
	return fmt.Sprintf("%s%s.%s", RoleVariablePrefix, label, property)
}
