import { useState, useCallback } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
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

  const handleCancel = useCallback(() => {
    onCancel()
    onOpenChange(false)
  }, [onCancel, onOpenChange])

  const handleSelect = useCallback(() => {
    if (!selectedFormat) return
    onSelect(selectedFormat)
    onOpenChange(false)
  }, [selectedFormat, onSelect, onOpenChange])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/80
            data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-[400px]',
            'translate-x-[-50%] translate-y-[-50%]',
            'border border-border bg-background shadow-lg p-6',
            'duration-200',
            // Animaciones
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header con botón de cerrar */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <DialogPrimitive.Title className="text-lg font-semibold">
                Seleccionar formato
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-muted-foreground mt-1">
                {variable.label}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Contenido del formulario */}
          <div className="py-4 space-y-2">
            <Label className="text-xs" htmlFor="format-select">
              Formato
            </Label>
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

          {/* Footer con botones */}
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSelect}
              disabled={!selectedFormat}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Seleccionar
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
