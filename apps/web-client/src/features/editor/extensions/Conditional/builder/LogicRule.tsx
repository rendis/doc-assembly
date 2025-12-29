import { useDroppable } from '@dnd-kit/core';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LogicRule, RuleOperator } from '../ConditionalExtension';
import type { InjectorType } from '../../Injector/InjectorExtension';
import { useLogicBuilder } from './LogicBuilderContext';

interface LogicRuleProps {
  rule: LogicRule;
  parentId: string;
}

const TYPE_OPERATORS: Record<InjectorType, RuleOperator[]> = {
  TEXT: ['eq', 'neq', 'contains', 'empty', 'not_empty'],
  NUMBER: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'empty', 'not_empty'],
  CURRENCY: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'empty', 'not_empty'],
  DATE: ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'empty', 'not_empty'],
  BOOLEAN: ['eq', 'neq'],
  IMAGE: ['empty', 'not_empty'],
  TABLE: ['empty', 'not_empty'],
};

const ALL_OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: 'eq', label: 'es igual a' },
  { value: 'neq', label: 'no es igual a' },
  { value: 'gt', label: 'mayor que' },
  { value: 'lt', label: 'menor que' },
  { value: 'gte', label: 'mayor o igual que' },
  { value: 'lte', label: 'menor o igual que' },
  { value: 'contains', label: 'contiene' },
  { value: 'empty', label: 'está vacío' },
  { value: 'not_empty', label: 'no está vacío' },
];

export const LogicRuleItem = ({ rule, parentId }: LogicRuleProps) => {
  const { removeNode, updateNode, variables } = useLogicBuilder();

  // Drop zone for Variable
  const { setNodeRef: setVarRef, isOver: isVarOver } = useDroppable({
    id: `rule-var-${rule.id}`,
    data: { type: 'field-drop', ruleId: rule.id, field: 'variableId' },
  });

  const selectedVar = variables.find(v => v.id === rule.variableId);
  
  const availableOps = selectedVar 
    ? ALL_OPERATORS.filter(op => TYPE_OPERATORS[selectedVar.type as InjectorType]?.includes(op.value))
    : ALL_OPERATORS;

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-card border border-border group relative">
      {/* Variable Input (Droppable) */}
      <div 
        ref={setVarRef}
        className={cn(
          "flex-1 min-w-[150px] h-9 px-3 rounded-md border flex items-center text-sm transition-colors",
          isVarOver ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-input bg-background",
          !rule.variableId && "text-muted-foreground border-dashed"
        )}
      >
        {selectedVar ? (
          <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded text-xs border border-primary/20">
            {selectedVar.label}
          </span>
        ) : (
          <span className="text-xs italic">Arrastra una variable aquí</span>
        )}
      </div>

      {/* Operator */}
      <Select 
        value={rule.operator} 
        onValueChange={(val) => updateNode(rule.id, { operator: val as RuleOperator })}
        disabled={!selectedVar}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder={!selectedVar ? "-" : undefined} />
        </SelectTrigger>
        <SelectContent>
          {availableOps.map(op => (
            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value Input */}
      {/* TODO: Make this droppable too to compare var vs var */}
      <Input
        value={rule.value}
        onChange={(e) => updateNode(rule.id, { value: e.target.value })}
        placeholder="Valor"
        className="flex-1 h-9"
        disabled={rule.operator === 'empty' || rule.operator === 'not_empty'}
      />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => removeNode(rule.id, parentId)}
        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
