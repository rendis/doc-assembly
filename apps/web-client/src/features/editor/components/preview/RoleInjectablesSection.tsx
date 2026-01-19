import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { RoleInjectable } from '../../types/role-injectable'
import type {
  InjectableFormValues,
  InjectableFormErrors,
} from '../../types/preview'
import { InjectableInput } from './InjectableInput'
import { generateRoleValue } from '../../services/role-injectable-generator'

interface RoleInjectablesSectionProps {
  roleInjectables: RoleInjectable[]
  values: InjectableFormValues
  errors: InjectableFormErrors
  onChange: (variableId: string, value: unknown) => void
  onGenerateAll: () => void
  disabled?: boolean
}

export function RoleInjectablesSection({
  roleInjectables,
  values,
  errors,
  onChange,
  onGenerateAll,
  disabled = false,
}: RoleInjectablesSectionProps) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Agrupar role injectables por roleLabel
  const roleGroups = useMemo(() => {
    const groups = new Map<string, RoleInjectable[]>()

    roleInjectables.forEach((ri) => {
      const existing = groups.get(ri.roleLabel) || []
      groups.set(ri.roleLabel, [...existing, ri])
    })

    return groups
  }, [roleInjectables])

  // Generar valor individual
  const handleGenerateIndividual = (roleInjectable: RoleInjectable) => {
    const value = generateRoleValue(roleInjectable.propertyKey)
    onChange(roleInjectable.variableId, value)
  }

  if (roleInjectables.length === 0) {
    return null
  }

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={(newOpen) => setIsCollapsed(!newOpen)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {t('editor.preview.roleVariables')}
          </h2>
          {!isCollapsed && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateAll}
              disabled={disabled}
              className="h-7 font-mono text-[10px] uppercase tracking-wider"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {t('editor.preview.generateTestData')}
            </Button>
          )}
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="space-y-4 bg-muted/30 p-3 rounded-sm border border-border">
          {Array.from(roleGroups.entries()).map(
            ([roleLabel, injectables], index) => (
              <div key={roleLabel}>
                <h3 className="font-mono text-[10px] font-medium uppercase tracking-widest text-foreground mb-3">
                  {roleLabel}
                </h3>
                <div className="space-y-4">
                  {injectables.map((ri) => (
                    <InjectableInput
                      key={ri.variableId}
                      variableId={ri.variableId}
                      label={ri.propertyLabel}
                      type={ri.type}
                      value={values[ri.variableId]}
                      error={errors[ri.variableId]}
                      onChange={(value) => onChange(ri.variableId, value)}
                      propertyKey={ri.propertyKey}
                      onGenerate={() => handleGenerateIndividual(ri)}
                      disabled={disabled}
                    />
                  ))}
                </div>
                {/* Separador entre roles (excepto el ultimo) */}
                {index < roleGroups.size - 1 && (
                  <div className="border-t pt-3 mt-3" />
                )}
              </div>
            )
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
