import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Seleccionar formato</DialogTitle>
          <DialogDescription>{variable.label}</DialogDescription>
        </DialogHeader>

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

        <DialogFooter>
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
      </DialogContent>
    </Dialog>
  )
}
