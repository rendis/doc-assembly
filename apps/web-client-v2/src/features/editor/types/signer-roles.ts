import type { Variable } from './variables'

/**
 * Tipo de valor para un campo de rol de firma
 * - 'text': valor fijo de texto
 * - 'injectable': referencia a una variable/inyectable
 */
export type SignerRoleFieldType = 'text' | 'injectable'

/**
 * Valor de un campo de rol (nombre o email)
 */
export interface SignerRoleFieldValue {
  type: SignerRoleFieldType
  value: string // El texto fijo o el variableId
}

/**
 * Definición de un rol de firma
 */
export interface SignerRoleDefinition {
  id: string
  label: string // Nombre del rol (ej: "Cliente", "Vendedor")
  name: SignerRoleFieldValue
  email: SignerRoleFieldValue
  order: number
}

/**
 * Estado del store de roles de firma
 */
export interface SignerRolesState {
  roles: SignerRoleDefinition[]
  isCollapsed: boolean
  isCompactMode: boolean
  workflowConfig: SigningWorkflowConfig
  // Selection mode
  isSelectionMode: boolean
  selectedRoleIds: string[]
}

/**
 * Acciones del store de roles de firma
 */
export interface SignerRolesActions {
  setRoles: (roles: SignerRoleDefinition[]) => void
  addRole: () => void
  updateRole: (
    id: string,
    updates: Partial<Omit<SignerRoleDefinition, 'id'>>
  ) => void
  deleteRole: (id: string) => void
  reorderRoles: (startIndex: number, endIndex: number) => void
  toggleCollapsed: () => void
  toggleCompactMode: () => void
  reset: () => void
  // Selection mode actions
  enterSelectionMode: (initialId?: string) => void
  exitSelectionMode: () => void
  toggleRoleSelection: (id: string) => void
  deleteSelectedRoles: () => void
  // Workflow actions
  setOrderMode: (mode: SigningOrderMode) => void
  setNotificationScope: (scope: NotificationScope) => void
  updateGlobalTriggers: (triggers: NotificationTriggerMap) => void
  updateRoleTriggers: (roleId: string, triggers: NotificationTriggerMap) => void
  setWorkflowConfig: (config: SigningWorkflowConfig) => void
}

/**
 * Store completo de roles de firma
 */
export type SignerRolesStore = SignerRolesState & SignerRolesActions

/**
 * Props del contexto de roles de firma
 */
export interface SignerRolesContextValue {
  roles: SignerRoleDefinition[]
  variables: Variable[]
  getAvailableRoles: (excludeRoleId?: string) => SignerRoleDefinition[]
  getRoleById: (id: string) => SignerRoleDefinition | undefined
  isRoleAssigned: (roleId: string, excludeSignatureId?: string) => boolean
}

/**
 * Crea una definición de rol vacía con valores por defecto
 */
export function createEmptyRole(
  order: number
): Omit<SignerRoleDefinition, 'id'> {
  return {
    label: `Rol ${order}`,
    name: { type: 'text', value: '' },
    email: { type: 'text', value: '' },
    order,
  }
}

/**
 * Obtiene el texto de visualización para un campo de rol
 */
export function getFieldDisplayValue(
  field: SignerRoleFieldValue,
  variables: Variable[]
): string {
  if (field.type === 'text') {
    return field.value || '(vacío)'
  }

  const variable = variables.find((v) => v.variableId === field.value)
  return variable ? `{{${variable.label}}}` : `{{${field.value}}}`
}

/**
 * Obtiene el nombre para mostrar de un rol
 */
export function getRoleDisplayName(
  role: SignerRoleDefinition,
  _variables: Variable[]
): string {
  return role.label || `Rol ${role.order}`
}

// =============================================================================
// Signing Workflow Types
// =============================================================================

/**
 * Modo de orden de firma
 * - 'parallel': Los firmantes pueden firmar en cualquier orden
 * - 'sequential': Los firmantes deben firmar en el orden definido
 */
export type SigningOrderMode = 'parallel' | 'sequential'

/**
 * Triggers de notificación disponibles
 */
export type NotificationTrigger =
  | 'on_document_created' // Al crear documento
  | 'on_previous_roles_signed' // Cuando firmen roles anteriores (solo secuencial)
  | 'on_turn_to_sign' // Cuando le toque firmar (solo secuencial)
  | 'on_all_signatures_complete' // Al completar todas las firmas

/**
 * Triggers disponibles en modo paralelo
 */
export type ParallelNotificationTrigger = Extract<
  NotificationTrigger,
  'on_document_created' | 'on_all_signatures_complete'
>

/**
 * Triggers disponibles en modo secuencial
 */
export type SequentialNotificationTrigger = NotificationTrigger

/**
 * Configuración para el trigger "on_previous_roles_signed"
 * - 'auto': Notifica cuando todos los roles anteriores (por order) hayan firmado
 * - 'custom': Notifica cuando roles específicos seleccionados hayan firmado
 */
export interface PreviousRolesConfig {
  mode: 'auto' | 'custom'
  /** IDs de roles que deben firmar antes (solo cuando mode es 'custom') */
  selectedRoleIds: string[]
}

/**
 * Configuración de un trigger de notificación
 */
export interface NotificationTriggerSettings {
  enabled: boolean
  /** Configuración adicional para 'on_previous_roles_signed' */
  previousRolesConfig?: PreviousRolesConfig
}

/**
 * Mapa de triggers a sus configuraciones
 */
export type NotificationTriggerMap = Partial<
  Record<NotificationTrigger, NotificationTriggerSettings>
>

/**
 * Configuración de notificaciones para un rol específico
 */
export interface RoleNotificationConfig {
  roleId: string
  triggers: NotificationTriggerMap
}

/**
 * Scope de notificaciones
 * - 'global': Una configuración aplica a todos los roles
 * - 'individual': Cada rol tiene su propia configuración
 */
export type NotificationScope = 'global' | 'individual'

/**
 * Configuración completa de notificaciones del documento
 */
export interface SigningNotificationConfig {
  scope: NotificationScope
  /** Triggers globales (usado cuando scope es 'global') */
  globalTriggers: NotificationTriggerMap
  /** Configuración por rol (usado cuando scope es 'individual') */
  roleConfigs: RoleNotificationConfig[]
}

/**
 * Configuración completa del workflow de firma
 */
export interface SigningWorkflowConfig {
  orderMode: SigningOrderMode
  notifications: SigningNotificationConfig
}

/**
 * Crea triggers por defecto para modo paralelo
 */
export function getDefaultParallelTriggers(): NotificationTriggerMap {
  return {
    on_document_created: { enabled: true },
    on_all_signatures_complete: { enabled: false },
  }
}

/**
 * Crea triggers por defecto para modo secuencial
 */
export function getDefaultSequentialTriggers(): NotificationTriggerMap {
  return {
    on_document_created: { enabled: false },
    on_previous_roles_signed: {
      enabled: false,
      previousRolesConfig: { mode: 'auto', selectedRoleIds: [] },
    },
    on_turn_to_sign: { enabled: true },
    on_all_signatures_complete: { enabled: false },
  }
}

/**
 * Crea configuración de workflow por defecto
 */
export function createDefaultWorkflowConfig(): SigningWorkflowConfig {
  return {
    orderMode: 'parallel',
    notifications: {
      scope: 'global',
      globalTriggers: getDefaultParallelTriggers(),
      roleConfigs: [],
    },
  }
}

/**
 * Obtiene los triggers disponibles según el modo de orden
 */
export function getAvailableTriggers(
  orderMode: SigningOrderMode
): NotificationTrigger[] {
  if (orderMode === 'parallel') {
    return ['on_document_created', 'on_all_signatures_complete']
  }
  return [
    'on_document_created',
    'on_previous_roles_signed',
    'on_turn_to_sign',
    'on_all_signatures_complete',
  ]
}

/**
 * Cuenta los triggers activos en un mapa de triggers
 */
export function countActiveTriggers(triggers: NotificationTriggerMap): number {
  return Object.values(triggers).filter((t) => t?.enabled).length
}
