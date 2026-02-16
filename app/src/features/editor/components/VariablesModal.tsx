import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Clock,
  Database,
  Loader2,
  Search,
  Users,
  Variable as VariableIcon,
  X,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useInjectablesStore } from '../stores/injectables-store'
import { useRoleInjectables } from '../hooks/useRoleInjectables'
import type { VariableDragData } from '../types/drag'
import type { RoleInjectable } from '../types/role-injectable'
import type { Variable } from '../types/variables'
import { DraggableVariable } from './DraggableVariable'
import { VariableGroup } from './VariableGroup'

const COLLAPSE_TRANSITION: Transition = { duration: 0.2, ease: [0.4, 0, 0.2, 1] }

interface VariablesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVariableClick?: (data: VariableDragData) => void
  draggingIds?: string[]
}

export function VariablesModal({
  open,
  onOpenChange,
  onVariableClick,
  draggingIds = [],
}: VariablesModalProps) {
  const { t } = useTranslation()

  const globalVariables = useInjectablesStore((s) => s.variables)
  const groups = useInjectablesStore((s) => s.groups)
  const isLoading = useInjectablesStore((s) => s.isLoading)
  const { roleInjectables } = useRoleInjectables()

  const [searchQuery, setSearchQuery] = useState('')
  const [variablesFilter, setVariablesFilter] = useState<'all' | 'internal' | 'external'>('all')

  const [rolesSectionOpen, setRolesSectionOpen] = useState(false)
  const [internalSectionOpen, setInternalSectionOpen] = useState(false)
  const [externalSectionOpen, setExternalSectionOpen] = useState(false)
  const [groupOpenStates, setGroupOpenStates] = useState<Record<string, boolean>>({})

  // Close modal after variable click
  const handleVariableClick = useCallback((data: VariableDragData) => {
    onVariableClick?.(data)
    onOpenChange(false)
  }, [onVariableClick, onOpenChange])

  const allSectionsExpanded = useMemo(() => {
    const hasRoles = roleInjectables.length > 0
    const hasUngroupedExternal = globalVariables.some(v => v.sourceType === 'EXTERNAL' && !v.group)
    const hasUngroupedInternal = globalVariables.some(v => v.sourceType === 'INTERNAL' && !v.group)
    const groupKeys = groups.map(g => g.key)

    const sectionsOpen = [
      !hasRoles || rolesSectionOpen,
      !hasUngroupedExternal || externalSectionOpen,
      !hasUngroupedInternal || internalSectionOpen,
      ...groupKeys.map(key => groupOpenStates[key] ?? false),
    ]

    return sectionsOpen.every(Boolean)
  }, [rolesSectionOpen, externalSectionOpen, internalSectionOpen, groupOpenStates, roleInjectables, globalVariables, groups])

  const isSearching = searchQuery.trim().length > 0

  // Expand all sections when search begins (adjust state based on derived value)
  const [prevIsSearching, setPrevIsSearching] = useState(isSearching)
  if (isSearching !== prevIsSearching) {
    setPrevIsSearching(isSearching)
    if (isSearching) {
      setRolesSectionOpen(true)
      setExternalSectionOpen(true)
      setInternalSectionOpen(true)
      setGroupOpenStates(() => {
        const newStates: Record<string, boolean> = {}
        for (const group of groups) {
          newStates[group.key] = true
        }
        return newStates
      })
    }
  }

  const toggleAllSections = useCallback(() => {
    const newState = !allSectionsExpanded
    setRolesSectionOpen(newState)
    setExternalSectionOpen(newState)
    setInternalSectionOpen(newState)
    setGroupOpenStates(prev => {
      const newStates = { ...prev }
      for (const group of groups) {
        newStates[group.key] = newState
      }
      return newStates
    })
  }, [allSectionsExpanded, groups])

  const handleGroupOpenChange = useCallback((groupKey: string, isOpen: boolean) => {
    setGroupOpenStates(prev => ({ ...prev, [groupKey]: isOpen }))
  }, [])

  const collapseAllSections = useCallback(() => {
    setRolesSectionOpen(false)
    setExternalSectionOpen(false)
    setInternalSectionOpen(false)
    setGroupOpenStates({})
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    collapseAllSections()
  }, [collapseAllSections])

  const handleSearchChange = useCallback((value: string) => {
    const wasSearching = searchQuery.trim().length > 0
    const willBeEmpty = value.trim().length === 0

    setSearchQuery(value)

    if (wasSearching && willBeEmpty) {
      collapseAllSections()
    }
  }, [searchQuery, collapseAllSections])

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

  const { groupedVariables, ungroupedInternal, ungroupedExternal } = useMemo(() => {
    const filterBySourceType = (sourceType: 'INTERNAL' | 'EXTERNAL', excludeFilter: 'internal' | 'external'): Variable[] => {
      if (variablesFilter === excludeFilter) return []
      const filtered = globalVariables.filter(v => v.sourceType === sourceType)
      if (!lowerSearchQuery) return filtered
      return filtered.filter((v) => {
        const matchesVariable =
          v.label.toLowerCase().includes(lowerSearchQuery) ||
          v.variableId.toLowerCase().includes(lowerSearchQuery)
        const matchesGroup = v.group
          ? groups.find(g => g.key === v.group)?.name.toLowerCase().includes(lowerSearchQuery) ?? false
          : false
        return matchesVariable || matchesGroup
      })
    }

    const internalVars = filterBySourceType('INTERNAL', 'external')
    const externalVars = filterBySourceType('EXTERNAL', 'internal')
    const allVars = [...internalVars, ...externalVars]

    const grouped = new Map<string, Variable[]>()
    const ungroupedInternal: Variable[] = []
    const ungroupedExternal: Variable[] = []

    for (const variable of allVars) {
      if (variable.group) {
        const existing = grouped.get(variable.group) || []
        grouped.set(variable.group, [...existing, variable])
      } else if (variable.sourceType === 'INTERNAL') {
        ungroupedInternal.push(variable)
      } else {
        ungroupedExternal.push(variable)
      }
    }

    const sortedGrouped = Array.from(grouped.entries())
      .sort((a, b) => {
        const groupA = groups.find(g => g.key === a[0])
        const groupB = groups.find(g => g.key === b[0])
        return (groupA?.order ?? 99) - (groupB?.order ?? 99)
      })

    return { groupedVariables: sortedGrouped, ungroupedInternal, ungroupedExternal }
  }, [globalVariables, groups, variablesFilter, lowerSearchQuery])

  const mapVariableToDragData = (v: Variable): VariableDragData => ({
    id: v.variableId,
    itemType: 'variable',
    variableId: v.variableId,
    label: v.label,
    injectorType: v.type,
    formatConfig: v.formatConfig,
    sourceType: v.sourceType,
    description: v.description,
  })

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

  const totalGrouped = groupedVariables.reduce((acc, [, vars]) => acc + vars.length, 0)
  const totalCount = filteredRoleInjectables.length + totalGrouped + ungroupedInternal.length + ungroupedExternal.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-3xl h-[600px] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6 shrink-0">
          <div className="flex items-center gap-3">
            <VariableIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('editor.variablesModal.title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
                {t('editor.variablesModal.description', { count: totalCount })}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAllSections}
              className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label={allSectionsExpanded ? t('editor.variablesPanel.collapseAll') : t('editor.variablesPanel.expandAll')}
              title={allSectionsExpanded ? t('editor.variablesPanel.collapseAll') : t('editor.variablesPanel.expandAll')}
            >
              {allSectionsExpanded ? (
                <ChevronsDownUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">{t('common.close', 'Close')}</span>
            </DialogClose>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 flex flex-col px-6 pt-6 pb-6">
          {/* Search Bar */}
          <div className="shrink-0 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('editor.variablesPanel.search.placeholder')}
                className="pl-10 pr-10 h-9"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <AnimatePresence>
                {searchQuery.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleClearSearch}
                    className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={t('common.clear')}
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Variables Filter Toggle */}
          <div className="shrink-0 mb-6">
            <div className="flex rounded-none border border-border bg-background p-0.5">
              <button
                onClick={() => setVariablesFilter('internal')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
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
                  'flex-1 flex items-center justify-center px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
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
                  'flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors',
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

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="pr-4 pb-2 space-y-4">
              {isLoading && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-xs">{t('editor.variablesPanel.loading')}</span>
                </div>
              )}

              {!isLoading &&
                filteredRoleInjectables.length === 0 &&
                groupedVariables.length === 0 &&
                ungroupedInternal.length === 0 &&
                ungroupedExternal.length === 0 && (
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

              {/* Role Injectables Section */}
              {!isLoading && filteredRoleInjectables.length > 0 && (
                <div className="space-y-2">
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
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-2 pt-2">
                      {filteredRoleInjectables.map((ri, index, array) => {
                        const showSeparator = index > 0 && ri.roleId !== array[index - 1].roleId
                        return (
                          <div key={ri.id}>
                            {showSeparator && (
                              <div className="border-b border-dashed border-role-border/30 my-2 mx-1" />
                            )}
                            <DraggableVariable
                              data={mapRoleToDragData(ri)}
                              onClick={handleVariableClick}
                              isDragging={draggingIds.includes(ri.id)}
                              hideDragHandle={true}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Ungrouped External Variables */}
              {!isLoading && ungroupedExternal.length > 0 && (
                <div className="space-y-2">
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
                      {ungroupedExternal.length}
                    </span>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: externalSectionOpen ? 'auto' : 0,
                      opacity: externalSectionOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-2 pt-2">
                      {ungroupedExternal.map((v) => (
                        <DraggableVariable
                          key={v.variableId}
                          data={mapVariableToDragData(v)}
                          onClick={handleVariableClick}
                          isDragging={draggingIds.includes(v.variableId)}
                          hideDragHandle={true}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Ungrouped Internal Variables */}
              {!isLoading && ungroupedInternal.length > 0 && (
                <div className="space-y-2">
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
                      {ungroupedInternal.length}
                    </span>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: internalSectionOpen ? 'auto' : 0,
                      opacity: internalSectionOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="space-y-2 pt-2">
                      {ungroupedInternal.map((v) => (
                        <DraggableVariable
                          key={v.variableId}
                          data={mapVariableToDragData(v)}
                          onClick={handleVariableClick}
                          isDragging={draggingIds.includes(v.variableId)}
                          hideDragHandle={true}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Grouped Variables */}
              {!isLoading && groupedVariables.map(([groupKey, variables]) => {
                const group = groups.find(g => g.key === groupKey)
                if (!group) return null

                return (
                  <VariableGroup
                    key={groupKey}
                    group={group}
                    variables={variables}
                    onVariableClick={handleVariableClick}
                    draggingIds={draggingIds}
                    isOpen={groupOpenStates[groupKey] ?? false}
                    onOpenChange={(open) => handleGroupOpenChange(groupKey, open)}
                    hideDragHandle={true}
                  />
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
