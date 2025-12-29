import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Variable, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LogicGroup, LogicRule, ConditionalSchema } from '../ConditionalExtension';
import { LogicBuilderContext } from './LogicBuilderContext';
import { LogicGroupItem } from './LogicGroup';
import type { InjectorType } from '../../../data/variables';
import { Calendar, CheckSquare, Coins, Hash, Image as ImageIcon, Table, Type } from 'lucide-react';

const ICONS = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
};

const ALLOWED_TYPES: InjectorType[] = ['TEXT', 'NUMBER', 'CURRENCY', 'DATE', 'BOOLEAN'];

// --- MOCK VARIABLES ---
const MOCK_VARIABLES: { id: string; label: string; type: InjectorType }[] = [
  { id: 'client_name', label: 'Nombre Cliente', type: 'TEXT' },
  { id: 'total_amount', label: 'Monto Total', type: 'CURRENCY' },
  { id: 'start_date', label: 'Fecha Inicio', type: 'DATE' },
  { id: 'end_date', label: 'Fecha Fin', type: 'DATE' },
  { id: 'is_renewal', label: 'Es Renovación', type: 'BOOLEAN' },
  { id: 'contract_type', label: 'Tipo Contrato', type: 'TEXT' },
  { id: 'company_logo', label: 'Logo Empresa', type: 'IMAGE' }, // Should be filtered out
];

// Pure function - moved outside component for better memoization
const updateNodeRecursively = (
  current: LogicGroup,
  nodeId: string,
  changes: Partial<LogicRule | LogicGroup>
): LogicGroup => {
  if (current.id === nodeId) {
    return { ...current, ...changes } as LogicGroup;
  }
  return {
    ...current,
    children: current.children.map(child => {
      if (child.id === nodeId) {
        return { ...child, ...changes } as LogicRule | LogicGroup;
      }
      if (child.type === 'group') {
        return updateNodeRecursively(child as LogicGroup, nodeId, changes);
      }
      return child;
    })
  };
};

interface LogicBuilderProps {
  initialData: ConditionalSchema;
  onChange: (data: ConditionalSchema) => void;
}

export const LogicBuilder = ({ initialData, onChange }: LogicBuilderProps) => {
  const [data, setData] = useState<ConditionalSchema>(initialData || {
     id: 'root', type: 'group', logic: 'AND', children: []
  });
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor)
  );

  const filteredVariables = useMemo(() => {
    return MOCK_VARIABLES.filter(v => 
      ALLOWED_TYPES.includes(v.type) && 
      v.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // --- ACTIONS ---

  const updateNode = useCallback((nodeId: string, changes: Partial<LogicRule | LogicGroup>) => {
    const newData = updateNodeRecursively(data, nodeId, changes);
    setData(newData);
    onChange(newData);
  }, [data, onChange]);

  const addRule = useCallback((parentId: string) => {
    const newRule: LogicRule = {
      id: uuidv4(),
      type: 'rule',
      variableId: '',
      operator: 'eq',
      value: ''
    };
    // Helper to insert
    const insertInto = (group: LogicGroup): LogicGroup => {
       if (group.id === parentId) {
         return { ...group, children: [...group.children, newRule] };
       }
       return {
         ...group,
         children: group.children.map(c => c.type === 'group' ? insertInto(c as LogicGroup) : c)
       };
    };
    const newData = insertInto(data);
    setData(newData);
    onChange(newData);
  }, [data, onChange]);

  const addGroup = useCallback((parentId: string) => {
    const newGroup: LogicGroup = {
      id: uuidv4(),
      type: 'group',
      logic: 'AND',
      children: []
    };
    const insertInto = (group: LogicGroup): LogicGroup => {
       if (group.id === parentId) {
         return { ...group, children: [...group.children, newGroup] };
       }
       return {
         ...group,
         children: group.children.map(c => c.type === 'group' ? insertInto(c as LogicGroup) : c)
       };
    };
    const newData = insertInto(data);
    setData(newData);
    onChange(newData);
  }, [data, onChange]);

  const removeNode = useCallback((nodeId: string, parentId: string) => {
     const removeFrom = (group: LogicGroup): LogicGroup => {
       if (group.id === parentId) {
         return { ...group, children: group.children.filter(c => c.id !== nodeId) };
       }
       return {
         ...group,
         children: group.children.map(c => c.type === 'group' ? removeFrom(c as LogicGroup) : c)
       };
     };
     const newData = removeFrom(data);
     setData(newData);
     onChange(newData);
  }, [data, onChange]);

  // --- DRAG HANDLERS ---
  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over) return;

    // Check if dropped on a rule variable field
    // ID format: rule-var-{ruleId}
    if (over.id.toString().startsWith('rule-var-')) {
       const ruleId = over.id.toString().replace('rule-var-', '');
       const variableId = active.id.toString();
       updateNode(ruleId, { variableId, value: '', operator: 'eq' }); // Reset value/op on change
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <LogicBuilderContext.Provider value={{
        variables: MOCK_VARIABLES,
        updateNode,
        addRule,
        addGroup,
        removeNode
      }}>
        <div className="flex h-[500px] border rounded-md bg-background overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/20 flex flex-col">
            <div className="p-3 border-b font-medium text-sm flex items-center gap-2">
               <Variable className="h-4 w-4" /> Variables
            </div>
            
            {/* Search Bar */}
            <div className="p-3 pb-0">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-8 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-2">
                {filteredVariables.map(v => (
                  <DraggableVar key={v.id} id={v.id} label={v.label} type={v.type} />
                ))}
                {filteredVariables.length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No se encontraron variables.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Builder Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-muted/30">
             <LogicGroupItem group={data} />
          </div>
        </div>

        <DragOverlay zIndex={100} dropAnimation={null}>
           {activeDragId ? (
             <DraggingItem id={activeDragId} />
           ) : null}
        </DragOverlay>
      </LogicBuilderContext.Provider>
    </DndContext>
  );
};

const DraggingItem = ({ id }: { id: string }) => {
  const v = MOCK_VARIABLES.find(v => v.id === id);
  if (!v) return null;
  const Icon = ICONS[v.type] || Type;
  
  return (
    <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-xl flex items-center gap-2 cursor-grabbing ring-2 ring-white z-[100]">
      <Icon className="h-3 w-3" />
      {v.label}
    </div>
  );
};

const DraggableVar = ({ id, label, type }: { id: string; label: string; type: InjectorType }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id,
    data: { type: 'variable', id }
  });

  const Icon = ICONS[type] || Type;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 p-2.5 text-sm border rounded-md bg-card shadow-sm cursor-grab hover:border-primary/50 hover:shadow transition-all group select-none",
        isDragging ? "opacity-30" : ""
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary/70" />
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span>{label}</span>
    </div>
  );
};