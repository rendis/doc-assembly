import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { cn } from '@/lib/utils'
import { GitBranch, Settings2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useState, useCallback } from 'react'
import { LogicBuilder } from './builder/LogicBuilder'
import type {
  ConditionalSchema,
  LogicGroup,
  LogicRule,
  RuleValue,
} from './ConditionalExtension'
import { OPERATOR_SYMBOLS } from './types/operators'

export const ConditionalComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode, editor, getPos } = props
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

  const handleOpenEditor = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }, [])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = getPos()
    if (typeof pos === 'number') {
      const tr = editor.state.tr.setSelection(
        NodeSelection.create(editor.state.doc, pos)
      )
      editor.view.dispatch(tr)
      editor.commands.deleteSelection()
    }
  }, [editor, getPos])

  const handleSelectNode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = getPos()
      if (typeof pos === 'number') {
        const tr = editor.state.tr.setSelection(
          NodeSelection.create(editor.state.doc, pos)
        )
        editor.view.dispatch(tr)
        editor.view.focus()
      }
    },
    [editor, getPos]
  )

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
        onDoubleClick={handleOpenEditor}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-4 transition-all pt-6',
          selected
            ? 'bg-warning-muted/50 dark:bg-warning-muted/20'
            : 'bg-warning-muted/30 dark:bg-warning-muted/10'
        )}
        style={{
          borderColor: selected
            ? 'hsl(var(--warning-border))'
            : 'hsl(var(--warning-border) / 0.7)',
        }}
      >
        {/* Zonas de arrastre en los bordes */}
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-x-0 top-0 h-3 cursor-grab" />
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-x-0 bottom-0 h-3 cursor-grab" />
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-y-0 left-0 w-3 cursor-grab" />
        <div data-drag-handle onClick={handleSelectNode} className="absolute inset-y-0 right-0 w-3 cursor-grab" />

        {/* Tab decorativo superior izquierdo */}
        <div data-drag-handle onClick={handleSelectNode} className="absolute -top-3 left-4 z-10 cursor-grab">
          <div
            className={cn(
              'px-2 h-6 bg-card flex items-center gap-1.5 text-xs font-medium border rounded shadow-sm transition-colors',
              selected
                ? 'text-warning-foreground border-warning-border dark:text-warning dark:border-warning'
                : 'text-muted-foreground border-border hover:border-warning-border hover:text-warning-foreground dark:hover:border-warning dark:hover:text-warning'
            )}
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span className="max-w-[300px] truncate">
              {expression || 'Condicional'}
            </span>
          </div>
        </div>

        {/* Barra de herramientas flotante cuando está seleccionado */}
        {selected && (
          <TooltipProvider delayDuration={300}>
            <div data-toolbar className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleOpenEditor}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Configurar</p>
                </TooltipContent>
              </Tooltip>
              <div className="w-px h-6 bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Eliminar</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

        <NodeViewContent className="min-h-[2rem]" />
      </div>

      {/* Dialog de configuración */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 space-y-1 border-b border-border">
            <DialogTitle>Constructor de Lógica</DialogTitle>
            <DialogDescription>
              Arrastra variables y configura las reglas de visualización.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
            <LogicBuilder
              initialData={conditions}
              onChange={setTempConditions}
            />
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Guardar Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
