package portabledoc

// WorkflowConfig defines the signing workflow configuration.
type WorkflowConfig struct {
	OrderMode     string             `json:"orderMode"` // "parallel" | "sequential"
	Notifications NotificationConfig `json:"notifications"`
}

// NotificationConfig defines notification settings.
type NotificationConfig struct {
	Scope          string             `json:"scope"` // "global" | "individual"
	GlobalTriggers TriggerMap         `json:"globalTriggers"`
	RoleConfigs    []RoleNotifyConfig `json:"roleConfigs"`
}

// TriggerMap maps trigger types to their settings.
type TriggerMap map[string]*TriggerSettings

// TriggerSettings defines settings for a notification trigger.
type TriggerSettings struct {
	Enabled             bool               `json:"enabled"`
	PreviousRolesConfig *PreviousRolesConf `json:"previousRolesConfig,omitempty"`
}

// PreviousRolesConf defines configuration for on_previous_roles_signed trigger.
type PreviousRolesConf struct {
	Mode            string   `json:"mode"` // "auto" | "custom"
	SelectedRoleIDs []string `json:"selectedRoleIds"`
}

// RoleNotifyConfig defines notification config for a specific role.
type RoleNotifyConfig struct {
	RoleID   string     `json:"roleId"`
	Triggers TriggerMap `json:"triggers"`
}

// Order mode constants.
const (
	OrderModeParallel   = "parallel"
	OrderModeSequential = "sequential"
)

// ValidOrderModes contains allowed order modes.
var ValidOrderModes = Set[string]{
	OrderModeParallel:   {},
	OrderModeSequential: {},
}

// Notification scope constants.
const (
	NotifyScopeGlobal     = "global"
	NotifyScopeIndividual = "individual"
)

// ValidNotifyScopes contains allowed notification scopes.
var ValidNotifyScopes = Set[string]{
	NotifyScopeGlobal:     {},
	NotifyScopeIndividual: {},
}

// Trigger type constants.
const (
	TriggerOnDocumentCreated       = "on_document_created"
	TriggerOnPreviousRolesSigned   = "on_previous_roles_signed"
	TriggerOnTurnToSign            = "on_turn_to_sign"
	TriggerOnAllSignaturesComplete = "on_all_signatures_complete"
)

// SequentialOnlyTriggers are triggers only valid for sequential mode.
var SequentialOnlyTriggers = Set[string]{
	TriggerOnPreviousRolesSigned: {},
	TriggerOnTurnToSign:          {},
}

// Previous roles config mode constants.
const (
	PreviousRolesModeAuto   = "auto"
	PreviousRolesModeCustom = "custom"
)

// ValidPreviousRolesModes contains allowed previous roles config modes.
var ValidPreviousRolesModes = Set[string]{
	PreviousRolesModeAuto:   {},
	PreviousRolesModeCustom: {},
}
