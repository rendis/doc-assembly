import { Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { LogicGroup, LogicRule } from '../ConditionalExtension';
import { LogicRuleItem } from './LogicRule';
import { useLogicBuilder } from './LogicBuilderContext';

interface LogicGroupProps {
  group: LogicGroup;
  parentId?: string; // Root has no parent
  level?: number;
}

export const LogicGroupItem = ({ group, parentId, level = 0 }: LogicGroupProps) => {
  const { addRule, addGroup, updateNode, removeNode } = useLogicBuilder();

  const isRoot = !parentId;

  return (
    <div className={cn(
      "flex flex-col gap-3 p-3 rounded-lg border transition-colors",
      isRoot ? "bg-transparent border-none p-0" : "bg-muted/30 border-border"
    )}>
      {/* Group Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="flex rounded-md border bg-background overflow-hidden p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => updateNode(group.id, { logic: 'AND' })}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-sm transition-all",
                  group.logic === 'AND' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                )}
              >
                AND
              </button>
              <button
                 type="button"
                 onClick={() => updateNode(group.id, { logic: 'OR' })}
                 className={cn(
                   "px-3 py-1 text-xs font-bold rounded-sm transition-all",
                   group.logic === 'OR' ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                 )}
               >
                 OR
               </button>
           </div>
        </div>

        <div className="flex items-center gap-1">
          {!isRoot && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeNode(group.id, parentId!)}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Children */}
      <div className="flex flex-col gap-2 pl-4 border-l-2 border-border/50 min-h-[50px]">
        {group.children.length === 0 && (
          <div className="text-xs text-muted-foreground italic py-2">Grupo vacío</div>
        )}
        
        {group.children.map((child) => (
          child.type === 'group' ? (
            <LogicGroupItem key={child.id} group={child} parentId={group.id} level={level + 1} />
          ) : (
            <LogicRuleItem key={child.id} rule={child as LogicRule} parentId={group.id} />
          )
        ))}

        {/* Action Bar */}
        <div className="flex items-center gap-2 mt-1 opacity-60 hover:opacity-100 transition-opacity">
           <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addRule(group.id)}>
             <Plus className="h-3 w-3 mr-1" /> Regla
           </Button>
           <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addGroup(group.id)}>
             <Layers className="h-3 w-3 mr-1" /> Grupo
           </Button>
        </div>
      </div>
    </div>
  );
};
