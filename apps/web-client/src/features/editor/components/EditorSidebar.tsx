import { useState } from 'react';
import { DraggableItem } from './DraggableItem';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Users,
  User,
  Mail,
  ChevronDown,
} from 'lucide-react';
import type { InjectorType } from '../data/variables';
import { useInjectables } from '../hooks/useInjectables';
import { hasConfigurableOptions } from '../types/injectable';
import { useRoleInjectables } from '../hooks/useRoleInjectables';
import { useSignerRolesStore } from '../stores/signer-roles-store';
import type { RolePropertyKey } from '../types/role-injectable';

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
  ROLE_TEXT: User,
};

// Iconos para propiedades de rol
const ROLE_PROPERTY_ICONS: Record<RolePropertyKey, typeof User> = {
  name: User,
  email: Mail,
};

export const EditorSidebar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { variables, isLoading, error, filterVariables } = useInjectables();
  const { roleInjectables, getRoleInjectablesByRoleId } = useRoleInjectables();
  const roles = useSignerRolesStore((state) => state.roles);

  // Filtrar herramientas por nombre
  const filteredTools = searchQuery.trim()
    ? TOOLS.filter((tool) =>
        tool.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : TOOLS;

  // Filtrar variables por nombre y key
  const filteredVariables = filterVariables(searchQuery);

  // Ordenar roles por order
  const sortedRoles = [...roles].sort((a, b) => a.order - b.order);

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

      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2 [mask-image:linear-gradient(to_bottom,transparent,black_20px,black_calc(100%-20px),transparent)]">
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group">
            <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
            <Wrench className="h-3.5 w-3.5" />
            Estructura
            <span className="ml-auto text-[10px] font-normal opacity-60">
              {filteredTools.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 pt-1 pb-3">
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
          </CollapsibleContent>
        </Collapsible>

        {/* Sección: Roles de Firmantes */}
        {sortedRoles.length > 0 && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group">
              <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
              <Users className="h-3.5 w-3.5" />
              Roles de Firmantes
              <span className="ml-auto text-[10px] font-normal opacity-60">
                {sortedRoles.length}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-1 pb-3">
                {sortedRoles.map((role) => {
                  const roleItems = getRoleInjectablesByRoleId(role.id);
                  // Filtrar por búsqueda si hay query
                  const filteredRoleItems = searchQuery.trim()
                    ? roleItems.filter((ri) =>
                        ri.label.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    : roleItems;

                  // Si no hay items después de filtrar, no mostrar el rol
                  if (filteredRoleItems.length === 0 && searchQuery.trim()) {
                    return null;
                  }

                  return (
                    <Collapsible key={role.id} defaultOpen>
                      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 text-xs font-medium hover:bg-muted rounded-md transition-colors group">
                        <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                        <span className="truncate text-violet-700 dark:text-violet-300">
                          {role.label}
                        </span>
                        <span className="ml-auto text-muted-foreground text-[10px]">
                          {filteredRoleItems.length}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="pl-4 pt-1 space-y-1.5">
                          {filteredRoleItems.map((ri) => (
                            <DraggableItem
                              key={ri.id}
                              id={ri.id}
                              label={ri.label}
                              icon={ROLE_PROPERTY_ICONS[ri.propertyKey]}
                              data={{
                                ...ri,
                                isRoleInjectable: true,
                              }}
                              type="role-variable"
                              variant="role"
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
                {/* Mensaje cuando no hay roles que coincidan con la búsqueda */}
                {searchQuery.trim() &&
                  roleInjectables.filter((ri) =>
                    ri.label.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Sin resultados
                    </div>
                  )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-1.5 w-full py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors group">
            <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
            <Variable className="h-3.5 w-3.5" />
            Variables
            <span className="ml-auto text-[10px] font-normal opacity-60">
              {filteredVariables.length}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="space-y-2 pt-1 pb-3">
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
                    data={{ ...v, metadata: v.metadata }}
                    type="variable"
                    description={v.description}
                    hasConfigurableOptions={hasConfigurableOptions(v.metadata)}
                  />
                ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
