import {
  Calendar,
  CheckSquare,
  Clock,
  Coins,
  Database,
  Hash,
  Image as ImageIcon,
  List,
  Table,
  Type,
  User,
  Mail,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { InjectorType, Variable } from '../../types/variables'
import type { FormatConfig } from '../../types/injectable'
import {
  getVariables,
  filterVariables as storeFilterVariables,
} from '../../stores/injectables-store'
import {
  getRoleInjectables,
  filterRoleInjectablesStatic,
} from '../../hooks/useRoleInjectables'
import type { RoleInjectable, RolePropertyKey } from '../../types/role-injectable'

// Re-export types for backward compatibility
export type VariableType = InjectorType

export interface MentionVariable {
  id: string
  label: string
  type: VariableType
  formatConfig?: FormatConfig
  sourceType?: 'INTERNAL' | 'EXTERNAL'
  /** Grupo para categorización en el menú */
  group: 'variable' | 'role'
  /** Solo para role injectables */
  isRoleVariable?: boolean
  roleId?: string
  roleLabel?: string
  propertyKey?: RolePropertyKey
}

export const VARIABLE_ICONS: Record<VariableType, LucideIcon> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
  LIST: List,
  ROLE_TEXT: User,
}

// Iconos para propiedades de rol
export const ROLE_PROPERTY_ICONS: Record<RolePropertyKey, LucideIcon> = {
  name: User,
  email: Mail,
}

// Icons for source type
export const SOURCE_TYPE_ICONS: Record<'INTERNAL' | 'EXTERNAL', LucideIcon> = {
  INTERNAL: Clock,
  EXTERNAL: Database,
}

/**
 * Map Variable to MentionVariable format
 */
function mapToMentionVariable(v: Variable): MentionVariable {
  return {
    id: v.variableId,
    label: v.label,
    type: v.type,
    formatConfig: v.formatConfig,
    sourceType: v.sourceType,
    group: 'variable',
  }
}

/**
 * Map RoleInjectable to MentionVariable format
 */
function mapRoleToMentionVariable(ri: RoleInjectable): MentionVariable {
  return {
    id: ri.variableId,
    label: ri.label,
    type: ri.type,
    group: 'role',
    isRoleVariable: true,
    roleId: ri.roleId,
    roleLabel: ri.roleLabel,
    propertyKey: ri.propertyKey,
  }
}

/**
 * Get all variables as MentionVariable format (from store)
 * Roles appear first, then regular variables
 */
export function getMentionVariables(): MentionVariable[] {
  const regularVars = getVariables().map(mapToMentionVariable)
  const roleVars = getRoleInjectables().map(mapRoleToMentionVariable)
  // Roles primero, luego variables regulares
  return [...roleVars, ...regularVars]
}

/**
 * Filter variables by query and return as MentionVariable format
 * Returns both matching regular variables and role injectables
 */
export function filterVariables(query: string): MentionVariable[] {
  const filteredRegular = storeFilterVariables(query).map(mapToMentionVariable)
  const filteredRoles = filterRoleInjectablesStatic(query).map(
    mapRoleToMentionVariable
  )
  // Roles primero, luego variables regulares
  return [...filteredRoles, ...filteredRegular]
}
