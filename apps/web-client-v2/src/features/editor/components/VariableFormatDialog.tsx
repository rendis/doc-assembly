import { useState, useCallback } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
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
import { cn } from '@/lib/utils'

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
          className="fixed inset-0 z-50 bg-black/40 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200"
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-[400px]',
            'translate-x-[-50%] translate-y-[-50%]',
            'border border-border bg-background rounded-lg shadow-lg p-6',
            'opacity-0',
            'data-[state=open]:opacity-100',
            'data-[state=closed]:opacity-0',
            'transition-opacity duration-200'
          )}
        >
          <DialogPrimitive.Title className="text-lg font-semibold border-b border-border pb-4">
            Seleccionar formato
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground border-b border-border pb-4">
            {variable.label}
          </DialogPrimitive.Description>

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

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 border-t border-border pt-4 gap-2">
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
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
