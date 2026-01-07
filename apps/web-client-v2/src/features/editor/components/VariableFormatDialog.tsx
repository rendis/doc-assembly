import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAvailableFormats, getDefaultFormat } from '../types/injectable'
import type { Variable } from '../types/variables'

export interface VariableFormatDialogProps {
  variable: Variable
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (format: string) => void
  onCancel: () => void
}

export function VariableFormatDialog({
  variable,
  open,
  onOpenChange,
  onSelect,
  onCancel,
}: VariableFormatDialogProps) {
  const formats = getAvailableFormats(variable.metadata)
  const defaultFormat = getDefaultFormat(variable.metadata)
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat)

  // Estado para controlar la animación de cierre
  const [isClosing, setIsClosing] = useState(false)
  const [internalOpen, setInternalOpen] = useState(open)

  // Sincronizar estado interno cuando open cambia a true
  useEffect(() => {
    if (open) {
      setInternalOpen(true)
      setIsClosing(false)
    }
  }, [open])

  // Handler para el cambio de open desde Radix
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isClosing) {
      // Iniciar el cierre con animación
      setIsClosing(true)
    } else if (newOpen) {
      setInternalOpen(true)
      setIsClosing(false)
      onOpenChange(true)
    }
  }

  // Handler local para Cancelar
  const handleCancel = useCallback(() => {
    setIsClosing(true)
  }, [onCancel])

  // Handler local para Seleccionar
  const handleSelect = useCallback(() => {
    if (!selectedFormat) return
    setIsClosing(true)
  }, [selectedFormat, onSelect])

  // Handler cuando termina la transición
  const handleTransitionEnd = useCallback((e: TransitionEvent) => {
    // Solo responder a transiciones de opacity
    if (e.propertyName === 'opacity' && isClosing) {
      setInternalOpen(false)
      setIsClosing(false)
      // Ejecutar el callback correspondiente
      if (selectedFormat) {
        onSelect(selectedFormat)
      } else {
        onCancel()
      }
    }
  }, [isClosing, selectedFormat, onSelect, onCancel])

  return (
    <DialogPrimitive.Root open={internalOpen} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 transition-opacity duration-150',
            isClosing ? 'opacity-0' : 'opacity-100'
          )}
        />
        <DialogContent className="sm:max-w-[400px] overflow-hidden">
          <div
            className={cn(
              'transition-opacity duration-150',
              isClosing && 'opacity-0',
              '[&[data-state=open]]:animate-[dialog-fade-in_0.25s_ease-out]'
            )}
            onTransitionEnd={handleTransitionEnd}
          >
            <DialogHeader className="border-b border-border pb-4">
              <DialogTitle>Seleccionar formato</DialogTitle>
              <DialogDescription>{variable.label}</DialogDescription>
            </DialogHeader>

        <div className="py-4 space-y-2">
          <Label className="text-xs">Formato</Label>
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger
              id="format-select"
              className="border-border focus:ring-0 focus:ring-offset-0 focus:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              <SelectValue placeholder="Seleccionar formato" />
            </SelectTrigger>
            <SelectContent>
              {formats.map((format) => (
                <SelectItem key={format} value={format} className="text-xs">
                  <span className="font-mono">{format}</span>
                  {format === defaultFormat && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (default)
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="border-t border-border pt-4 gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="border-border"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedFormat}
            className="bg-foreground text-background hover:bg-foreground/90"
          >
            Seleccionar
          </Button>
        </DialogFooter>
          </div>
      </DialogContent>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
  )
}
