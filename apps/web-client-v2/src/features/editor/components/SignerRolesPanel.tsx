import { useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useSignerRolesStore } from '../stores/signer-roles-store'
import { SignerRoleItem } from './SignerRoleItem'
import type { Variable } from '../types/variables'

interface SignerRolesPanelProps {
  variables: Variable[]
  className?: string
}

export function SignerRolesPanel({
  variables,
  className,
}: SignerRolesPanelProps) {
  // Access raw roles and sort with useMemo to avoid infinite loop
  const rawRoles = useSignerRolesStore((state) => state.roles)
  const roles = useMemo(
    () => [...rawRoles].sort((a, b) => a.order - b.order),
    [rawRoles]
  )
  const addRole = useSignerRolesStore((state) => state.addRole)
  const updateRole = useSignerRolesStore((state) => state.updateRole)
  const deleteRole = useSignerRolesStore((state) => state.deleteRole)
  const reorderRoles = useSignerRolesStore((state) => state.reorderRoles)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = roles.findIndex((role) => role.id === active.id)
      const newIndex = roles.findIndex((role) => role.id === over.id)
      reorderRoles(oldIndex, newIndex)
    }
  }

  const roleIds = useMemo(() => roles.map((role) => role.id), [roles])

  return (
    <div
      className={cn(
        'flex flex-col border-l border-gray-100 bg-white w-72',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
            Roles de Firma
          </span>
        </div>
        <span className="text-xs text-gray-300">{roles.length}</span>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No hay roles definidos</p>
              <p className="text-xs text-gray-300 mt-1">
                Agrega roles para asignarlos a las firmas
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-gray-200 text-gray-600 hover:text-black hover:border-black"
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
                className="w-full border-gray-200 text-gray-600 hover:text-black hover:border-black"
                onClick={addRole}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar rol
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
