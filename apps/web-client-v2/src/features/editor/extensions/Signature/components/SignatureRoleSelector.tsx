import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Check, Link2, Link2Off, Users } from 'lucide-react'
import { useState } from 'react'
import { useSignerRolesContextSafe } from '../../../context/SignerRolesContext'
import { getRoleDisplayName } from '../../../types/signer-roles'

interface SignatureRoleSelectorProps {
  roleId?: string
  signatureId: string
  onChange: (roleId: string | undefined) => void
}

export function SignatureRoleSelector({
  roleId,
  signatureId,
  onChange,
}: SignatureRoleSelectorProps) {
  const [open, setOpen] = useState(false)
  const context = useSignerRolesContextSafe()

  // Si no hay contexto de roles, mostrar mensaje
  if (!context) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">Rol asignado</Label>
        <p className="text-xs text-gray-400">No hay roles disponibles</p>
      </div>
    )
  }

  const { roles, variables, getAvailableRoles, getRoleById, isRoleAssigned } =
    context
  const selectedRole = roleId ? getRoleById(roleId) : undefined
  const availableRoles = getAvailableRoles(roleId)

  const handleSelect = (newRoleId: string) => {
    onChange(newRoleId)
    setOpen(false)
  }

  const handleClear = () => {
    onChange(undefined)
    setOpen(false)
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">Rol asignado</Label>

      {roles.length === 0 ? (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <Users className="h-3 w-3" />
          Define roles en el panel derecho
        </p>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'w-full justify-start text-xs font-normal border-gray-200 hover:border-black',
                !selectedRole && 'text-gray-400'
              )}
            >
              {selectedRole ? (
                <>
                  <Link2 className="h-3.5 w-3.5 mr-2 text-black" />
                  {getRoleDisplayName(selectedRole, variables)}
                </>
              ) : (
                <>
                  <Link2Off className="h-3.5 w-3.5 mr-2" />
                  Sin asignar
                </>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-56 p-0" align="start">
            <div className="p-2 border-b border-gray-100">
              <p className="text-xs font-medium">Seleccionar rol</p>
            </div>

            <ScrollArea className="max-h-48">
              <div className="p-1">
                {/* Opción para limpiar */}
                {selectedRole && (
                  <button
                    onClick={handleClear}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm',
                      'hover:bg-gray-100 text-gray-400'
                    )}
                  >
                    <Link2Off className="h-3.5 w-3.5" />
                    Sin asignar
                  </button>
                )}

                {/* Lista de roles */}
                {availableRoles.map((role) => {
                  const isSelected = role.id === roleId
                  const isAssigned = isRoleAssigned(role.id, signatureId)

                  return (
                    <button
                      key={role.id}
                      onClick={() => handleSelect(role.id)}
                      disabled={isAssigned}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm',
                        'hover:bg-gray-100',
                        isSelected && 'bg-gray-100',
                        isAssigned && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="w-4 flex justify-center">
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-black" />
                        )}
                      </div>
                      <span className="flex-1 text-left">
                        {getRoleDisplayName(role, variables)}
                      </span>
                      {isAssigned && (
                        <span className="text-[10px] text-gray-400">
                          (en uso)
                        </span>
                      )}
                    </button>
                  )
                })}

                {availableRoles.length === 0 && (
                  <p className="px-2 py-4 text-xs text-center text-gray-400">
                    Todos los roles están asignados
                  </p>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
