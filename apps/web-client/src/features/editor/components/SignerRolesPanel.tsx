import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSignerRolesStore } from '../stores/signer-roles-store';
import { SignerRoleItem } from './SignerRoleItem';
import type { Variable } from '../data/variables';

interface SignerRolesPanelProps {
  variables: Variable[];
  className?: string;
}

export function SignerRolesPanel({ variables, className }: SignerRolesPanelProps) {
  // Access raw roles and sort with useMemo to avoid infinite loop
  const rawRoles = useSignerRolesStore((state) => state.roles);
  const roles = useMemo(
    () => [...rawRoles].sort((a, b) => a.order - b.order),
    [rawRoles]
  );
  const isCollapsed = useSignerRolesStore((state) => state.isCollapsed);
  const toggleCollapsed = useSignerRolesStore((state) => state.toggleCollapsed);
  const addRole = useSignerRolesStore((state) => state.addRole);
  const updateRole = useSignerRolesStore((state) => state.updateRole);
  const deleteRole = useSignerRolesStore((state) => state.deleteRole);
  const reorderRoles = useSignerRolesStore((state) => state.reorderRoles);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = roles.findIndex((role) => role.id === active.id);
      const newIndex = roles.findIndex((role) => role.id === over.id);
      reorderRoles(oldIndex, newIndex);
    }
  };

  const roleIds = useMemo(() => roles.map((role) => role.id), [roles]);

  return (
    <div
      className={cn(
        'flex flex-col border-l bg-card transition-all duration-200',
        isCollapsed ? 'w-12' : 'w-80',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-3 border-b shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={toggleCollapsed}
        >
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {!isCollapsed && (
          <>
            <div className="flex items-center gap-2 ml-1 flex-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Roles de Firma</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={addRole}
              title="Agregar rol"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {/* Collapsed state */}
      {isCollapsed && (
        <div className="flex-1 flex flex-col items-center pt-4 gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleCollapsed}
            title="Expandir panel de roles"
          >
            <Users className="h-4 w-4" />
          </Button>
          {roles.length > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {roles.length}
            </span>
          )}
        </div>
      )}

      {/* Expanded content */}
      {!isCollapsed && (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {roles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No hay roles definidos
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Agrega roles para asignarlos a las firmas
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={addRole}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar primer rol
                </Button>
              </div>
            ) : (
              <>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={roleIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {roles.map((role) => (
                      <SignerRoleItem
                        key={role.id}
                        role={role}
                        variables={variables}
                        onUpdate={updateRole}
                        onDelete={deleteRole}
                      />
                    ))}
                  </SortableContext>
                </DndContext>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={addRole}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar rol
                </Button>
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
