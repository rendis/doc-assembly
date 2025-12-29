import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { GitBranch, Settings2 } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { LogicBuilder } from './builder/LogicBuilder';
import type { ConditionalSchema, LogicGroup, LogicRule } from './ConditionalExtension';
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu';

export const ConditionalComponent = (props: NodeViewProps) => {
  const { node, updateAttributes, selected, deleteNode } = props;
  const { conditions, expression } = node.attrs;

  const [tempConditions, setTempConditions] = useState<ConditionalSchema>(conditions || {
      id: 'root', type: 'group', logic: 'AND', children: []
  });
  const [open, setOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleBorderClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const handleSave = () => {
    const summary = generateSummary(tempConditions);
    updateAttributes({
      conditions: tempConditions,
      expression: summary
    });
    setOpen(false);
  };

  return (
    <NodeViewWrapper className="my-6 relative group">
      <div
        data-drag-handle
        onClick={handleBorderClick}
        onContextMenu={handleContextMenu}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 transition-all pt-6',
          selected ? 'border-warning bg-warning-muted/30' : 'border-warning-border'
        )}
      >
        <div className="absolute -top-3 left-4 flex items-center gap-2 z-10">
           <Dialog open={open} onOpenChange={setOpen}>
             <DialogTrigger asChild>
                <button
                  className={cn(
                    "px-2 h-7 bg-card flex items-center gap-2 text-xs font-medium border rounded shadow-sm transition-colors cursor-pointer",
                    selected ? "text-warning border-warning-border" : "text-foreground border-border hover:border-warning-border hover:text-warning"
                  )}
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  <span className="max-w-[300px] truncate">{expression || 'Configurar Lógica'}</span>
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
                 <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                 <Button onClick={handleSave}>Guardar Configuración</Button>
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
  );
};

const generateSummary = (node: LogicGroup | LogicRule): string => {
  if (node.type === 'rule') {
    const r = node as LogicRule;
    if (!r.variableId) return '(Incompleto)';
    const opMap: Record<string, string> = {
      eq: '=', neq: '!=', gt: '>', lt: '<', contains: 'contiene', empty: 'vacío', not_empty: 'no vacío'
    };
    return `${r.variableId} ${opMap[r.operator] || r.operator} "${r.value}"`;
  }

  const g = node as LogicGroup;
  if (g.children.length === 0) return 'Siempre visible (Grupo vacío)';

  const childrenSummary = g.children.map(generateSummary).join(` ${g.logic} `);
  return g.children.length > 1 ? `(${childrenSummary})` : childrenSummary;
};
