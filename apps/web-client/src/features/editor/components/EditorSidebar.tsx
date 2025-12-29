import { DraggableItem } from './DraggableItem';
import { 
  Type, 
  Hash, 
  Calendar, 
  Coins, 
  CheckSquare, 
  Image as ImageIcon, 
  Table, 
  PenTool, 
  GitBranch
} from 'lucide-react';

const MOCK_VARIABLES = [
  { id: 'var_1', label: 'Nombre Cliente', type: 'TEXT', variableId: 'client_name' },
  { id: 'var_2', label: 'Fecha Inicio', type: 'DATE', variableId: 'start_date' },
  { id: 'var_3', label: 'Monto Total', type: 'CURRENCY', variableId: 'total_amount' },
  { id: 'var_4', label: 'Es Renovación', type: 'BOOLEAN', variableId: 'is_renewal' },
];

const TOOLS = [
  { id: 'tool_signature', label: 'Bloque de Firma', icon: PenTool, type: 'signature' },
  { id: 'tool_conditional', label: 'Condicional', icon: GitBranch, type: 'conditional' },
  { id: 'tool_image', label: 'Imagen', icon: ImageIcon, type: 'image' },
];

const ICONS = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
};

export const EditorSidebar = () => {
  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b font-semibold bg-card">
        Toolbox
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Estructura
          </h3>
          <div className="space-y-2">
            {TOOLS.map((tool) => (
              <DraggableItem
                key={tool.id}
                id={tool.id}
                label={tool.label}
                icon={tool.icon}
                data={tool}
                type="tool"
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Variables
          </h3>
          <div className="space-y-2">
            {MOCK_VARIABLES.map((v) => (
              <DraggableItem
                key={v.id}
                id={v.id}
                label={v.label}
                icon={ICONS[v.type as keyof typeof ICONS]}
                data={v}
                type="variable"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
