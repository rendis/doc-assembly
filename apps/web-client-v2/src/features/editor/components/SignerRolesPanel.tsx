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
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Plus, Users } from 'lucide-react'
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
  const isCollapsed = useSignerRolesStore((state) => state.isCollapsed)
  const toggleCollapsed = useSignerRolesStore((state) => state.toggleCollapsed)

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
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 56 : 288 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        'flex flex-col border-l border-border bg-card shrink-0 overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="relative flex items-center h-14 px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
          <motion.span
            initial={false}
            animate={{
              opacity: isCollapsed ? 0 : 1,
              width: isCollapsed ? 0 : 'auto',
            }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground overflow-hidden whitespace-nowrap"
          >
            Roles de Firma
          </motion.span>
        </div>

        {/* Role count - hide when collapsed */}
        <motion.span
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            width: isCollapsed ? 0 : 'auto',
          }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="text-xs text-muted-foreground/70 min-w-[1ch] text-center overflow-hidden"
        >
          {roles.length}
        </motion.span>

        {/* Collapse button - always visible */}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors ml-2"
          aria-label={isCollapsed ? 'Expandir panel' : 'Colapsar panel'}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </button>

        {/* Collapsed state: show badge centered on border line */}
        <AnimatePresence>
          {isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 flex items-center justify-center z-10"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted-foreground text-[13px] font-bold font-mono text-white shadow-md">
                {roles.length}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1"
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
          {roles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No hay roles definidos</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Agrega roles para asignarlos a las firmas
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 border-border text-muted-foreground hover:text-foreground hover:border-foreground"
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
                className="w-full border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                onClick={addRole}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar rol
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
      </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  )
}
