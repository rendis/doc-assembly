import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { GitBranch, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { LogicBuilder } from './builder/LogicBuilder'
import type {
  ConditionalSchema,
  LogicGroup,
  LogicRule,
  RuleValue,
} from './ConditionalExtension'
import { OPERATOR_SYMBOLS } from './types/operators'
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu'

export const ConditionalComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props
  const { conditions, expression } = node.attrs

  const [tempConditions, setTempConditions] = useState<ConditionalSchema>(
    conditions || {
      id: 'root',
      type: 'group',
      logic: 'AND',
      children: [],
    }
  )
  const [open, setOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleBorderClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
  }

  const handleSave = () => {
    const summary = generateSummary(tempConditions)
    updateAttributes({
      conditions: tempConditions,
      expression: summary,
    })
    setOpen(false)
  }

  return (
    <NodeViewWrapper className="my-6 relative group">
      <div
        data-drag-handle
        onClick={handleBorderClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 transition-all pt-6',
          selected
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
            : 'border-amber-300 hover:border-amber-400 dark:border-amber-700 dark:hover:border-amber-600'
        )}
      >
        <div className="absolute -top-3 left-4 flex items-center gap-2 z-10">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                className={cn(
                  'px-2 h-7 bg-card flex items-center gap-2 text-xs font-medium border rounded shadow-sm transition-colors cursor-pointer',
                  selected
                    ? 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600'
                    : 'text-muted-foreground border-border hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-600 dark:hover:text-amber-400'
                )}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span className="max-w-[300px] truncate">
                  {expression || 'Configurar Lógica'}
                </span>
                <Settings2 className="h-3 w-3 ml-1 opacity-50" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Constructor de Lógica</DialogTitle>
                <DialogDescription>
                  Arrastra variables y configura las reglas de visualización.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 min-h-0 py-4">
                <LogicBuilder
                  initialData={conditions}
                  onChange={setTempConditions}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-border"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Guardar Configuración
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <NodeViewContent className="min-h-[2rem]" />
      </div>

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="conditional"
          onDelete={deleteNode}
          onEdit={() => setOpen(true)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </NodeViewWrapper>
  )
}

const generateSummary = (node: LogicGroup | LogicRule): string => {
  if (node.type === 'rule') {
    const r = node as LogicRule
    if (!r.variableId) return '(Incompleto)'

    const opSymbol = OPERATOR_SYMBOLS[r.operator] || r.operator

    // Operadores sin valor
    if (['empty', 'not_empty', 'is_true', 'is_false'].includes(r.operator)) {
      return `${r.variableId} ${opSymbol}`
    }

    // Normalizar valor (compatibilidad con formato antiguo)
    const ruleValue: RuleValue =
      typeof r.value === 'string'
        ? { mode: 'text', value: r.value }
        : r.value || { mode: 'text', value: '' }

    // Con valor
    let valueDisplay: string
    if (ruleValue.mode === 'variable') {
      valueDisplay = `{${ruleValue.value || '?'}}`
    } else {
      valueDisplay = ruleValue.value ? `"${ruleValue.value}"` : '?'
    }

    return `${r.variableId} ${opSymbol} ${valueDisplay}`
  }

  const g = node as LogicGroup
  if (g.children.length === 0) return 'Siempre visible (Grupo vacío)'

  const childrenSummary = g.children.map(generateSummary).join(` ${g.logic} `)
  return g.children.length > 1 ? `(${childrenSummary})` : childrenSummary
}
