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
import { SYSTEM_VARIABLES, type InjectorType } from '../data/variables';

const TOOLS = [
  { id: 'tool_signature', label: 'Bloque de Firma', icon: PenTool, type: 'signature' },
  { id: 'tool_conditional', label: 'Condicional', icon: GitBranch, type: 'conditional' },
  { id: 'tool_image', label: 'Imagen', icon: ImageIcon, type: 'image' },
];

const ICONS: Record<InjectorType, typeof Type> = {
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
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b font-semibold bg-card">
        Toolbox
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-20px),transparent)]">
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
                data={{ ...tool }}
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
            {SYSTEM_VARIABLES.map((v) => (
              <DraggableItem
                key={v.id}
                id={v.id}
                label={v.label}
                icon={ICONS[v.type]}
                data={{ ...v }}
                type="variable"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
