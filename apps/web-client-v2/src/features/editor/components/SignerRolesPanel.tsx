import { useMemo, useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, LayoutList, Plus, Rows3, Users, Trash2, AlertTriangle, CheckSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSignerRolesStore } from '../stores/signer-roles-store'
import { SignerRoleItem } from './SignerRoleItem'
import { WorkflowConfigButton } from './workflow'
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
  const isCompactMode = useSignerRolesStore((state) => state.isCompactMode)
  const toggleCompactMode = useSignerRolesStore((state) => state.toggleCompactMode)
  // Selection mode
  const isSelectionMode = useSignerRolesStore((state) => state.isSelectionMode)
  const selectedRoleIds = useSignerRolesStore((state) => state.selectedRoleIds)
  const enterSelectionMode = useSignerRolesStore((state) => state.enterSelectionMode)
  const exitSelectionMode = useSignerRolesStore((state) => state.exitSelectionMode)
  const toggleRoleSelection = useSignerRolesStore((state) => state.toggleRoleSelection)
  const deleteSelectedRoles = useSignerRolesStore((state) => state.deleteSelectedRoles)

  // Bulk delete confirmation dialog
  const [showBulkDeleteConfirmation, setShowBulkDeleteConfirmation] = useState(false)

  // Handle bulk delete confirmation
  const handleBulkDelete = useCallback(() => {
    setShowBulkDeleteConfirmation(true)
  }, [])

  const confirmBulkDelete = useCallback(() => {
    deleteSelectedRoles()
    setShowBulkDeleteConfirmation(false)
  }, [deleteSelectedRoles])

  // Escape key to exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        exitSelectionMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSelectionMode, exitSelectionMode])

  // Estado para tracking del item siendo arrastrado
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeRole = useMemo(
    () => roles.find((r) => r.id === activeId),
    [roles, activeId]
  )
  const activeIndex = useMemo(
    () => roles.findIndex((r) => r.id === activeId),
    [roles, activeId]
  )

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

  // Animación suave al soltar el overlay con fade-out
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
    duration: 250,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    keyframes: ({ transform }) => [
      { transform: CSS.Transform.toString(transform.initial), opacity: 1 },
      { transform: CSS.Transform.toString(transform.final), opacity: 0 },
    ],
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = roles.findIndex((role) => role.id === active.id)
      const newIndex = roles.findIndex((role) => role.id === over.id)
      reorderRoles(oldIndex, newIndex)
    }

    // Delay para que la animación del overlay termine antes de mostrar el item original
    setTimeout(() => setActiveId(null), 250)
  }

  const handleDragCancel = () => {
    setTimeout(() => setActiveId(null), 250)
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
        {/* Título */}
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

        {/* Acciones agrupadas */}
        <motion.div
          initial={false}
          animate={{
            opacity: isCollapsed ? 0 : 1,
            width: isCollapsed ? 0 : 'auto',
          }}
          transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-0.5 ml-2 overflow-hidden"
        >
          {/* Selection mode toggle with tooltip */}
          {roles.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={isSelectionMode ? exitSelectionMode : () => enterSelectionMode()}
                  className={cn(
                    'shrink-0 p-1 rounded-md transition-colors',
                    isSelectionMode
                      ? 'bg-muted text-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  )}
                  aria-label={isSelectionMode ? 'Cancelar selección' : 'Seleccionar roles'}
                >
                  <AnimatePresence mode="wait">
                    {isSelectionMode ? (
                      <motion.div
                        key="close"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <X className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="select"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <CheckSquare className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isSelectionMode ? 'Cancelar selección' : 'Seleccionar roles'}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Compact mode toggle with tooltip - hide in selection mode */}
          <AnimatePresence>
            {!isSelectionMode && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleCompactMode}
                      className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
                      aria-label={isCompactMode ? 'Vista expandida' : 'Vista compacta'}
                    >
                      {isCompactMode ? (
                        <Rows3 className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <LayoutList className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isCompactMode ? 'Expandir todas las cards' : 'Vista compacta'}
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Collapse button - always visible */}
        <button
          onClick={toggleCollapsed}
          className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors ml-0.5"
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
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Workflow Configuration Button */}
            <div className="p-4 pb-2">
              <WorkflowConfigButton />
            </div>

            {roles.length === 0 ? (
              // Empty state - centered content
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center px-4">
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
                {/* Scrollable role list */}
                <ScrollArea className="flex-1">
                  <div className="p-4 pb-8 space-y-3">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragCancel={handleDragCancel}
                    >
                      <SortableContext
                        items={roleIds}
                        strategy={verticalListSortingStrategy}
                      >
                        <AnimatePresence mode="popLayout">
                          {roles.map((role, index) => (
                            <motion.div
                              key={role.id}
                              layout={!activeId}
                              initial={{ opacity: 0, y: -16 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8, scale: 0.95 }}
                              transition={{
                                duration: 0.25,
                                ease: [0.4, 0, 0.2, 1],
                                layout: { duration: 0.2 },
                              }}
                            >
                              <SignerRoleItem
                                role={role}
                                index={index}
                                isCompactMode={isCompactMode}
                                isDragging={role.id === activeId}
                                variables={variables}
                                allRoles={roles}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedRoleIds.includes(role.id)}
                                onToggleSelection={toggleRoleSelection}
                                onUpdate={updateRole}
                                onDelete={deleteRole}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </SortableContext>

                      {/* Overlay que sigue al cursor durante el drag */}
                      <DragOverlay dropAnimation={dropAnimation}>
                        {activeRole && (
                          <SignerRoleItem
                            role={activeRole}
                            index={activeIndex}
                            isCompactMode={isCompactMode}
                            isOverlay
                            variables={variables}
                            allRoles={roles}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedRoleIds.includes(activeRole.id)}
                            onToggleSelection={() => {}}
                            onUpdate={() => {}}
                            onDelete={() => {}}
                          />
                        )}
                      </DragOverlay>
                    </DndContext>
                  </div>
                </ScrollArea>

                {/* Sticky footer with gradient */}
                <div className="relative shrink-0">
                  <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                  <AnimatePresence mode="wait">
                    {selectedRoleIds.length > 0 ? (
                      <motion.div
                        key="delete-action"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 pt-2 bg-card"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar {selectedRoleIds.length}{' '}
                          {selectedRoleIds.length === 1 ? 'rol' : 'roles'}
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="add-action"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="p-4 pt-2 bg-card"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                          onClick={addRole}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar rol
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk delete confirmation dialog */}
      <Dialog
        open={showBulkDeleteConfirmation}
        onOpenChange={setShowBulkDeleteConfirmation}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar {selectedRoleIds.length}{' '}
              {selectedRoleIds.length === 1 ? 'rol' : 'roles'}
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Estás seguro de que deseas eliminar los roles seleccionados? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowBulkDeleteConfirmation(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="border-border hover:bg-muted"
              onClick={confirmBulkDelete}
            >
              Eliminar {selectedRoleIds.length}{' '}
              {selectedRoleIds.length === 1 ? 'rol' : 'roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.aside>
  )
}
