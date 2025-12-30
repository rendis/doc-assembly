import { useState } from 'react';
import { DraggableItem } from './DraggableItem';
import { Input } from '@/components/ui/input';
import {
  Type,
  Hash,
  Calendar,
  Coins,
  CheckSquare,
  Image as ImageIcon,
  Table,
  PenTool,
  GitBranch,
  Variable,
  Wrench,
  Loader2,
  AlertCircle,
  Search,
} from 'lucide-react';
import type { InjectorType } from '../data/variables';
import { useInjectables } from '../hooks/useInjectables';

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
  const [searchQuery, setSearchQuery] = useState('');
  const { variables, isLoading, error, filterVariables } = useInjectables();

  // Filtrar herramientas por nombre
  const filteredTools = searchQuery.trim()
    ? TOOLS.filter((tool) =>
        tool.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TOOLS;

  // Filtrar variables por nombre y key
  const filteredVariables = filterVariables(searchQuery);

  return (
    <div className="w-64 border-r bg-muted/10 flex flex-col h-full max-h-full overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b font-semibold bg-card">
        Toolbox
      </div>

      <div className="flex-shrink-0 p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filtrar por nombre o key..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-20px),transparent)]">
        <div>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            <Wrench className="h-3.5 w-3.5" />
            Estructura
          </h3>
          <div className="space-y-2">
            {filteredTools.length === 0 && searchQuery.trim() && (
              <div className="text-xs text-muted-foreground text-center py-2">
                Sin resultados
              </div>
            )}
            {filteredTools.map((tool) => (
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
          <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            <Variable className="h-3.5 w-3.5" />
            Variables
          </h3>
          <div className="space-y-2">
            {isLoading && (
              <div className="flex items-center justify-center py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-xs">Cargando...</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 py-2 px-3 text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}
            {!isLoading && !error && variables.length === 0 && !searchQuery.trim() && (
              <div className="text-xs text-muted-foreground text-center py-4">
                No hay variables disponibles
              </div>
            )}
            {!isLoading && !error && filteredVariables.length === 0 && searchQuery.trim() && (
              <div className="text-xs text-muted-foreground text-center py-2">
                Sin resultados
              </div>
            )}
            {!isLoading &&
              !error &&
              filteredVariables.map((v) => (
                <DraggableItem
                  key={v.id}
                  id={v.id}
                  label={v.label}
                  icon={ICONS[v.type]}
                  data={{ ...v }}
                  type="variable"
                  description={v.description}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
