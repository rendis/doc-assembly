import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Users, Search, Loader2, Variable as VariableIcon } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useVariablesPanelStore } from '../stores/variables-panel-store'
import { useInjectablesStore } from '../stores/injectables-store'
import { useRoleInjectables } from '../hooks/useRoleInjectables'
import { DraggableVariable } from './DraggableVariable'
import type { VariableDragData } from '../types/drag'
import type { Variable } from '../types/variables'
import type { RoleInjectable } from '../types/role-injectable'

interface VariablesPanelProps {
  /**
   * Optional click handler for variables
   * If provided, clicking a variable will call this handler
   */
  onVariableClick?: (data: VariableDragData) => void

  /**
   * IDs of currently dragging items (for visual feedback)
   */
  draggingIds?: string[]

  className?: string
}

/**
 * Collapsible left sidebar panel displaying all available variables
 * for drag-and-drop or click-to-insert into the editor
 *
 * Features:
 * - Collapsible with smooth animation (288px ↔ 56px)
 * - Global search for variables
 * - Grouped by: Global variables and Role injectables
 * - Visual differentiation for role variables (purple theme)
 * - Icon indicators for configurable format options
 * - Animated section collapse/expand with smooth transitions
 *
 * Layout:
 * ```
 * ┌─────────────────────────────┐
 * │ Variables        [▼] [42]  │ <- Header with collapse btn & count
 * ├─────────────────────────────┤
 * │ 🔍 Search...               │ <- Search input
 * ├─────────────────────────────┤
 * │ 👥 Roles de Firmantes       │ <- Role injectables section (animated)
 * │   ├── Cliente.nombre        │
 * │   └── Cliente.email         │
 * ├─────────────────────────────┤
 * │ 📦 Variables               │ <- Global variables section (animated)
 * │   ├── Client Name           │
 * │   ├── Amount                │
 * │   └── Date                  │
 * └─────────────────────────────┘
 * ```
 */
export function VariablesPanel({
  onVariableClick,
  draggingIds = [],
  className,
}: VariablesPanelProps) {
  const { t } = useTranslation()
  const isCollapsed = useVariablesPanelStore((state) => state.isCollapsed)
  const toggleCollapsed = useVariablesPanelStore((state) => state.toggleCollapsed)

  // Get variables from stores
  const { variables: globalVariables, isLoading } = useInjectablesStore()
  const { roleInjectables } = useRoleInjectables()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Collapsible sections state
  const [rolesSectionOpen, setRolesSectionOpen] = useState(true)
  const [variablesSectionOpen, setVariablesSectionOpen] = useState(true)

  // Filter variables based on search query
  const filteredGlobalVariables = useMemo(() => {
    if (!searchQuery.trim()) return globalVariables
    const lowerQuery = searchQuery.toLowerCase()
    return globalVariables.filter(
      (v) =>
        v.label.toLowerCase().includes(lowerQuery) ||
        v.variableId.toLowerCase().includes(lowerQuery)
    )
  }, [globalVariables, searchQuery])

  const filteredRoleInjectables = useMemo(() => {
    if (!searchQuery.trim()) return roleInjectables
    const lowerQuery = searchQuery.toLowerCase()
    return roleInjectables.filter(
      (ri) =>
        ri.label.toLowerCase().includes(lowerQuery) ||
        ri.roleLabel.toLowerCase().includes(lowerQuery) ||
        ri.propertyLabel.toLowerCase().includes(lowerQuery)
    )
  }, [roleInjectables, searchQuery])

  // Convert Variable to VariableDragData
  const mapVariableToDragData = (v: Variable): VariableDragData => ({
    id: v.variableId,
    itemType: 'variable',
    variableId: v.variableId,
    label: v.label,
    injectorType: v.type,
    metadata: v.metadata,
  })

  // Convert RoleInjectable to VariableDragData
  const mapRoleToDragData = (ri: RoleInjectable): VariableDragData => ({
    id: ri.id,
    itemType: 'role-variable',
    variableId: ri.variableId,
    label: ri.label,
    injectorType: ri.type,
    roleId: ri.roleId,
    roleLabel: ri.roleLabel,
    propertyKey: ri.propertyKey,
    propertyLabel: ri.propertyLabel,
  })

  // Total count for badge
  const totalCount = filteredGlobalVariables.length + filteredRoleInjectables.length

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 56 : 288 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'flex flex-col border-r border-border bg-card shrink-0 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="relative flex items-center h-14 px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <VariableIcon className="h-4 w-4 text-muted-foreground shrink-0" />
          <motion.span
            initial={false}
            animate={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto',
            }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground overflow-hidden whitespace-nowrap"
          >
            {t('editor.variablesPanel.header')}
          </motion.span>
        </div>

        {/* Variable count - hide when collapsed */}
        <motion.span
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            width: isCollapsed ? 0 : 'auto',
          }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="text-xs text-muted-foreground/70 min-w-[1ch] text-center overflow-hidden"
        >
          {totalCount}
        </motion.span>

        {/* Collapse button - always visible */}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors ml-2"
          aria-label={isCollapsed ? t('editor.variablesPanel.collapse.expand') : t('editor.variablesPanel.collapse.collapse')}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </button>

        {/* Collapsed state: show badge centered on border line */}
        <AnimatePresence>
          {isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center justify-center z-10"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground text-[13px] font-bold font-mono text-white shadow-md">
                {totalCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            {/* Static Search Bar */}
            <div className="shrink-0 p-4 pb-2">
              <div className="relative min-w-0">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('editor.variablesPanel.search.placeholder')}
                  className="pl-8 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Scroll container with gradient overlays */}
            <div className="relative flex-1 min-h-0">
              {/* Top fade area - solid bg + gradient */}
              <div className="absolute top-0 left-0 right-0 h-10 pointer-events-none z-10 flex flex-col">
                <div className="h-4 bg-card" />
                <div className="h-6 bg-gradient-to-b from-card to-transparent" />
              </div>

              <ScrollArea className="h-full">
                <div className="p-4 pt-8 pb-12 space-y-4 min-w-0">
                {/* Loading state */}
                {isLoading && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-xs">{t('editor.variablesPanel.loading')}</span>
                  </div>
                )}

                 {/* Empty state */}
                 {!isLoading &&
                   filteredGlobalVariables.length === 0 &&
                   filteredRoleInjectables.length === 0 && (
                     <div className="flex flex-col items-center justify-center py-8 text-center">
                       <VariableIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {t('editor.variablesPanel.empty.title')}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {searchQuery.trim()
                          ? t('editor.variablesPanel.empty.searchSuggestion')
                          : t('editor.variablesPanel.empty.addSuggestion')}
                      </p>
                    </div>
                  )}

                {/* Role Injectables Section - PRIMERO (con animación) */}
                {!isLoading && filteredRoleInjectables.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setRolesSectionOpen(!rolesSectionOpen)}
                      className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-role w-full hover:text-role/80 transition-colors"
                    >
                      <motion.div
                        animate={{ rotate: rolesSectionOpen ? 90 : 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      >
                        <ChevronRight className="h-3 w-3" />
                      </motion.div>
                      <Users className="h-3 w-3" />
                      <span>{t('editor.variablesPanel.sections.signerRoles')}</span>
                      <span className="ml-auto text-[9px] bg-role-muted/50 text-role-foreground px-1.5 rounded">
                        {filteredRoleInjectables.length}
                      </span>
                    </button>

                    <motion.div
                      initial={false}
                      animate={{
                        height: rolesSectionOpen ? 'auto' : 0,
                        opacity: rolesSectionOpen ? 1 : 0,
                      }}
                      transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="space-y-2 pt-2">
                        {filteredRoleInjectables.map((ri, index, array) => {
                          // Check if we need to add a separator before this item
                          // Add separator when:
                          // 1. Not the first item (index > 0)
                          // 2. AND the roleId is different from the previous item
                          const showSeparator = index > 0 && ri.roleId !== array[index - 1].roleId

                          return (
                            <div key={ri.id}>
                              {/* Dotted line separator between different roles */}
                              {showSeparator && (
                                <div className="border-b border-dashed border-role-border/30 my-2 mx-1" />
                              )}
                              <DraggableVariable
                                data={mapRoleToDragData(ri)}
                                onClick={onVariableClick}
                                isDragging={draggingIds.includes(ri.id)}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  </div>
                )}

                 {/* Global Variables Section - SEGUNDO (con animación) */}
                 {!isLoading && filteredGlobalVariables.length > 0 && (
                   <div className="space-y-2">
                     <button
                       onClick={() => setVariablesSectionOpen(!variablesSectionOpen)}
                       className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-full hover:text-foreground/80 transition-colors"
                     >
                       <motion.div
                         animate={{ rotate: variablesSectionOpen ? 90 : 0 }}
                         transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                       >
                         <ChevronRight className="h-3 w-3" />
                       </motion.div>
                       <VariableIcon className="h-3 w-3" />
                      <span>{t('editor.variablesPanel.sections.variables')}</span>
                      <span className="ml-auto text-[9px] bg-muted text-muted-foreground px-1.5 rounded">
                        {filteredGlobalVariables.length}
                      </span>
                    </button>

                    <motion.div
                      initial={false}
                      animate={{
                        height: variablesSectionOpen ? 'auto' : 0,
                        opacity: variablesSectionOpen ? 1 : 0,
                      }}
                      transition={{
                        duration: 0.2,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="space-y-2 pt-2">
                        {filteredGlobalVariables.map((v) => (
                          <DraggableVariable
                            key={v.variableId}
                            data={mapVariableToDragData(v)}
                            onClick={onVariableClick}
                            isDragging={draggingIds.includes(v.variableId)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
                </div>
              </ScrollArea>

              {/* Bottom fade area - solid bg + gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none z-10 flex flex-col">
                <div className="h-6 bg-gradient-to-t from-card to-transparent" />
                <div className="h-4 bg-card" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
