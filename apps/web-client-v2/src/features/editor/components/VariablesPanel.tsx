import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { ChevronRight, Clock, Database, Loader2, Search, Users, Variable as VariableIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRoleInjectables } from '../hooks/useRoleInjectables'
import { useInjectablesStore } from '../stores/injectables-store'
import { useVariablesPanelStore } from '../stores/variables-panel-store'
import type { VariableDragData } from '../types/drag'
import type { RoleInjectable } from '../types/role-injectable'
import type { Variable } from '../types/variables'
import { DraggableVariable } from './DraggableVariable'

const COLLAPSE_TRANSITION: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] }

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

  // Filter state for variables by source type
  const [variablesFilter, setVariablesFilter] = useState<'all' | 'internal' | 'external'>('all')

  // Collapsible sections state for internal/external variables
  const [internalSectionOpen, setInternalSectionOpen] = useState(true)
  const [externalSectionOpen, setExternalSectionOpen] = useState(true)

  const lowerSearchQuery = searchQuery.toLowerCase().trim()

  const filteredRoleInjectables = useMemo(() => {
    if (!lowerSearchQuery) return roleInjectables
    return roleInjectables.filter(
      (ri) =>
        ri.label.toLowerCase().includes(lowerSearchQuery) ||
        ri.roleLabel.toLowerCase().includes(lowerSearchQuery) ||
        ri.propertyLabel.toLowerCase().includes(lowerSearchQuery)
    )
  }, [roleInjectables, lowerSearchQuery])

  const { internalVariables, externalVariables } = useMemo(() => {
    const filterBySourceType = (sourceType: 'INTERNAL' | 'EXTERNAL', excludeFilter: 'internal' | 'external'): Variable[] => {
      if (variablesFilter === excludeFilter) return []
      const filtered = globalVariables.filter(v => v.sourceType === sourceType)
      if (!lowerSearchQuery) return filtered
      return filtered.filter(
        (v) =>
          v.label.toLowerCase().includes(lowerSearchQuery) ||
          v.variableId.toLowerCase().includes(lowerSearchQuery)
      )
    }

    return {
      internalVariables: filterBySourceType('INTERNAL', 'external'),
      externalVariables: filterBySourceType('EXTERNAL', 'internal'),
    }
  }, [globalVariables, variablesFilter, lowerSearchQuery])

  // Convert Variable to VariableDragData
  const mapVariableToDragData = (v: Variable): VariableDragData => ({
    id: v.variableId,
    itemType: 'variable',
    variableId: v.variableId,
    label: v.label,
    injectorType: v.type,
    metadata: v.metadata,
    sourceType: v.sourceType,
    description: v.description,
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
  const totalCount = filteredRoleInjectables.length + internalVariables.length + externalVariables.length

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 56 : 288 }}
      transition={COLLAPSE_TRANSITION}
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
            transition={COLLAPSE_TRANSITION}
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

            {/* Variables Filter Toggle - 3-step segmented control */}
            <div className="px-4 pb-2">
              <div className="flex rounded-none border border-border bg-background p-0.5">
                <button
                  onClick={() => setVariablesFilter('internal')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
                    variablesFilter === 'internal'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Clock className="h-3 w-3" />
                  Internal
                </button>
                <button
                  onClick={() => setVariablesFilter('all')}
                  className={cn(
                    'flex-1 flex items-center justify-center px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
                    variablesFilter === 'all'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setVariablesFilter('external')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
                    variablesFilter === 'external'
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Database className="h-3 w-3" />
                  External
                </button>
              </div>
            </div>

            {/* Scroll container with gradient overlays */}
            <div className="relative flex-1 min-h-0 overflow-hidden">
              {/* Top fade area - solid bg + gradient */}
              <div className="absolute top-0 left-0 right-0 h-10 pointer-events-none z-10 flex flex-col">
                <div className="h-4 bg-card" />
                <div className="h-6 bg-linear-to-b from-card to-transparent" />
              </div>

              <ScrollArea className="h-full w-full [&>div]:overflow-x-hidden!">
                <div className="p-4 pt-8 pb-12 space-y-4 min-w-0 w-full overflow-hidden">
                {/* Loading state */}
                {isLoading && (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-xs">{t('editor.variablesPanel.loading')}</span>
                  </div>
                )}

                 {/* Empty state */}
                 {!isLoading &&
                   filteredRoleInjectables.length === 0 &&
                   internalVariables.length === 0 &&
                   externalVariables.length === 0 && (
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
                  <div className="space-y-2 min-w-0">
                    <button
                      onClick={() => setRolesSectionOpen(!rolesSectionOpen)}
                      className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-role w-full hover:text-role/80 transition-colors"
                    >
                      <motion.div
                        animate={{ rotate: rolesSectionOpen ? 90 : 0 }}
                        transition={COLLAPSE_TRANSITION}
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
                      <div className="space-y-2 pt-2 min-w-0">
                        {filteredRoleInjectables.map((ri, index, array) => {
                          // Check if we need to add a separator before this item
                          // Add separator when:
                          // 1. Not the first item (index > 0)
                          // 2. AND the roleId is different from the previous item
                          const showSeparator = index > 0 && ri.roleId !== array[index - 1].roleId

                          return (
                            <div key={ri.id} className="min-w-0">
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

                  {/* Internal Variables Section */}
                  {!isLoading && internalVariables.length > 0 && (
                    <div className="space-y-2 min-w-0">
                      <button
                        onClick={() => setInternalSectionOpen(!internalSectionOpen)}
                        className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-internal w-full hover:text-internal/80 transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: internalSectionOpen ? 90 : 0 }}
                          transition={COLLAPSE_TRANSITION}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </motion.div>
                        <Clock className="h-3 w-3" />
                        <span>{t('editor.variablesPanel.sections.internalVariables')}</span>
                        <span className="ml-auto text-[9px] bg-internal-muted/50 text-internal-foreground px-1.5 rounded">
                          {internalVariables.length}
                        </span>
                      </button>

                      <motion.div
                        initial={false}
                        animate={{
                          height: internalSectionOpen ? 'auto' : 0,
                          opacity: internalSectionOpen ? 1 : 0,
                        }}
                        transition={{
                          duration: 0.2,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="space-y-2 pt-2 min-w-0">
                          {internalVariables.map((v) => (
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

                  {/* External Variables Section */}
                  {!isLoading && externalVariables.length > 0 && (
                    <div className="space-y-2 min-w-0">
                      <button
                        onClick={() => setExternalSectionOpen(!externalSectionOpen)}
                        className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-external w-full hover:text-external/80 transition-colors"
                      >
                        <motion.div
                          animate={{ rotate: externalSectionOpen ? 90 : 0 }}
                          transition={COLLAPSE_TRANSITION}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </motion.div>
                        <Database className="h-3 w-3" />
                        <span>{t('editor.variablesPanel.sections.externalVariables')}</span>
                        <span className="ml-auto text-[9px] bg-external-muted/50 text-external-foreground px-1.5 rounded">
                          {externalVariables.length}
                        </span>
                      </button>

                      <motion.div
                        initial={false}
                        animate={{
                          height: externalSectionOpen ? 'auto' : 0,
                          opacity: externalSectionOpen ? 1 : 0,
                        }}
                        transition={{
                          duration: 0.2,
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div className="space-y-2 pt-2 min-w-0">
                          {externalVariables.map((v) => (
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
                <div className="h-6 bg-linear-to-t from-card to-transparent" />
                <div className="h-4 bg-card" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
