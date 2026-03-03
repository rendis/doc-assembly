import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Clock, Database, Loader2, Search, Variable as VariableIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInjectablesStore } from '../stores/injectables-store'
import type { VariableDragData } from '../types/drag'
import type { Variable } from '../types/variables'
import { DraggableVariable } from './DraggableVariable'
import { VariableGroup } from './VariableGroup'

interface InjectablePickerContentProps {
  onSelect: (data: VariableDragData) => void
  className?: string
  /**
   * Optional list of already selected variable IDs.
   * Used to render selected state metadata in future enhancements.
   */
  selectedVariableIds?: string[]
}

export function InjectablePickerContent({
  onSelect,
  className,
  selectedVariableIds: _selectedVariableIds = [],
}: InjectablePickerContentProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')

  const globalVariables = useInjectablesStore((s) => s.variables)
  const groups = useInjectablesStore((s) => s.groups)
  const isLoading = useInjectablesStore((s) => s.isLoading)

  const lowerSearchQuery = searchQuery.toLowerCase().trim()

  const {
    groupedExternalVariables,
    groupedInternalVariables,
    ungroupedExternalVariables,
    ungroupedInternalVariables,
  } = useMemo(() => {
    const textVariables = globalVariables.filter((v) => v.type === 'TEXT')

    const filterBySource = (sourceType: 'INTERNAL' | 'EXTERNAL') => {
      const sourceVars = textVariables.filter((v) => v.sourceType === sourceType)
      if (!lowerSearchQuery) return sourceVars

      return sourceVars.filter((v) => {
        const matchesVariable =
          v.label.toLowerCase().includes(lowerSearchQuery) ||
          v.variableId.toLowerCase().includes(lowerSearchQuery)
        const matchesGroup = v.group
          ? groups.find((g) => g.key === v.group)?.name.toLowerCase().includes(lowerSearchQuery) ?? false
          : false
        return matchesVariable || matchesGroup
      })
    }

    const separateByGroup = (vars: Variable[]) => {
      const grouped = new Map<string, Variable[]>()
      const ungrouped: Variable[] = []

      for (const variable of vars) {
        if (variable.group) {
          const existing = grouped.get(variable.group) || []
          grouped.set(variable.group, [...existing, variable])
        } else {
          ungrouped.push(variable)
        }
      }

      const sortedGrouped = Array.from(grouped.entries()).sort((a, b) => {
        const groupA = groups.find((g) => g.key === a[0])
        const groupB = groups.find((g) => g.key === b[0])
        return (groupA?.order ?? 99) - (groupB?.order ?? 99)
      })

      return { grouped: sortedGrouped, ungrouped }
    }

    const externalVars = filterBySource('EXTERNAL')
    const internalVars = filterBySource('INTERNAL')

    const externalGrouped = separateByGroup(externalVars)
    const internalGrouped = separateByGroup(internalVars)

    return {
      groupedExternalVariables: externalGrouped.grouped,
      ungroupedExternalVariables: externalGrouped.ungrouped,
      groupedInternalVariables: internalGrouped.grouped,
      ungroupedInternalVariables: internalGrouped.ungrouped,
    }
  }, [globalVariables, groups, lowerSearchQuery])

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

  const totalTextInjectables =
    groupedExternalVariables.reduce((acc, [, vars]) => acc + vars.length, 0) +
    groupedInternalVariables.reduce((acc, [, vars]) => acc + vars.length, 0) +
    ungroupedExternalVariables.length +
    ungroupedInternalVariables.length

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        <VariableIcon className="h-3.5 w-3.5" />
        <span>{t('editor.variablesPanel.header')}</span>
        <span className="ml-auto text-xs text-muted-foreground/70">{totalTextInjectables}</span>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('editor.variablesPanel.search.placeholder')}
          className="h-9 pl-8"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <div className="space-y-4 pb-1">
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-xs">{t('editor.variablesPanel.loading')}</span>
            </div>
          )}

          {!isLoading && totalTextInjectables === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <VariableIcon className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('editor.variablesPanel.empty.title')}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {searchQuery.trim()
                  ? t('editor.variablesPanel.empty.searchSuggestion')
                  : t('editor.roles.card.noVariables')}
              </p>
            </div>
          )}

          {!isLoading && groupedExternalVariables.map(([groupKey, variables]) => {
            const group = groups.find((g) => g.key === groupKey)
            if (!group) return null
            return (
              <VariableGroup
                key={`ext-${groupKey}`}
                group={group}
                variables={variables}
                onVariableClick={onSelect}
                defaultCollapsed={false}
                hideDragHandle
                disableVariableDrag
              />
            )
          })}

          {!isLoading && ungroupedExternalVariables.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-external">
                <Database className="h-3 w-3" />
                <span>{t('editor.variablesPanel.sections.externalVariables')}</span>
                <span className="ml-auto rounded bg-external-muted/50 px-1.5 text-[9px] text-external-foreground">
                  {ungroupedExternalVariables.length}
                </span>
              </div>
              <div className="space-y-2">
                {ungroupedExternalVariables.map((v) => (
                  <DraggableVariable
                    key={v.variableId}
                    data={mapVariableToDragData(v)}
                    onClick={onSelect}
                    hideDragHandle
                    disableDrag
                  />
                ))}
              </div>
            </section>
          )}

          {!isLoading && ungroupedInternalVariables.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-internal">
                <Clock className="h-3 w-3" />
                <span>{t('editor.variablesPanel.sections.internalVariables')}</span>
                <span className="ml-auto rounded bg-internal-muted/50 px-1.5 text-[9px] text-internal-foreground">
                  {ungroupedInternalVariables.length}
                </span>
              </div>
              <div className="space-y-2">
                {ungroupedInternalVariables.map((v) => (
                  <DraggableVariable
                    key={v.variableId}
                    data={mapVariableToDragData(v)}
                    onClick={onSelect}
                    hideDragHandle
                    disableDrag
                  />
                ))}
              </div>
            </section>
          )}

          {!isLoading && groupedInternalVariables.map(([groupKey, variables]) => {
            const group = groups.find((g) => g.key === groupKey)
            if (!group) return null
            return (
              <VariableGroup
                key={`int-${groupKey}`}
                group={group}
                variables={variables}
                onVariableClick={onSelect}
                defaultCollapsed={false}
                hideDragHandle
                disableVariableDrag
              />
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
