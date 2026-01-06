import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings2 } from 'lucide-react'
import { PAGE_SIZES, DEFAULT_MARGINS, MARGIN_LIMITS, type PageSize, type PageMargins } from '../types'

interface PageSettingsProps {
  pageSize: PageSize
  margins: PageMargins
  onPageSizeChange: (size: PageSize) => void
  onMarginsChange: (margins: PageMargins) => void
}

export function PageSettings({
  pageSize,
  margins,
  onPageSizeChange,
  onMarginsChange,
}: PageSettingsProps) {
  const [open, setOpen] = useState(false)
  const [customMargins, setCustomMargins] = useState(margins)

  // Detectar si hay cambios pendientes de aplicar
  const hasChanges =
    customMargins.top !== margins.top ||
    customMargins.bottom !== margins.bottom ||
    customMargins.left !== margins.left ||
    customMargins.right !== margins.right

  // Detectar si los márgenes son diferentes a los defaults
  const isNotDefault =
    customMargins.top !== DEFAULT_MARGINS.top ||
    customMargins.bottom !== DEFAULT_MARGINS.bottom ||
    customMargins.left !== DEFAULT_MARGINS.left ||
    customMargins.right !== DEFAULT_MARGINS.right

  const handlePageSizeChange = (value: string) => {
    const size = PAGE_SIZES[value]
    if (size) {
      onPageSizeChange(size)
    }
  }

  const handleMarginChange = (key: keyof PageMargins, value: string) => {
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) &&
        numValue >= MARGIN_LIMITS.min &&
        numValue <= MARGIN_LIMITS.max) {
      setCustomMargins(prev => ({ ...prev, [key]: numValue }))
    }
  }

  const handleApplyMargins = () => {
    onMarginsChange(customMargins)
  }

  const getCurrentSizeKey = () => {
    return Object.entries(PAGE_SIZES).find(
      ([_, size]) => size.width === pageSize.width && size.height === pageSize.height
    )?.[0] || 'A4'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span>{pageSize.label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Configuracion de Pagina</h4>
            <p className="text-sm text-muted-foreground">
              Ajusta el tamano y los margenes de la pagina.
            </p>
          </div>

          {/* Page Size */}
          <div className="grid gap-2">
            <Label htmlFor="page-size">Tamano de Pagina</Label>
            <Select
              value={getCurrentSizeKey()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger id="page-size">
                <SelectValue placeholder="Selecciona un tamano" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAGE_SIZES).map(([key, size]) => (
                  <SelectItem key={key} value={key}>
                    {size.label} ({size.width} x {size.height}px)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Margins */}
          <div className="grid gap-2">
            <Label>Margenes (px)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="margin-top" className="text-xs text-muted-foreground">
                  Superior
                </Label>
                <Input
                  id="margin-top"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={customMargins.top}
                  onChange={(e) => handleMarginChange('top', e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="margin-bottom" className="text-xs text-muted-foreground">
                  Inferior
                </Label>
                <Input
                  id="margin-bottom"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={customMargins.bottom}
                  onChange={(e) => handleMarginChange('bottom', e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="margin-left" className="text-xs text-muted-foreground">
                  Izquierdo
                </Label>
                <Input
                  id="margin-left"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={customMargins.left}
                  onChange={(e) => handleMarginChange('left', e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="margin-right" className="text-xs text-muted-foreground">
                  Derecho
                </Label>
                <Input
                  id="margin-right"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={customMargins.right}
                  onChange={(e) => handleMarginChange('right', e.target.value)}
                  className="h-8"
                />
              </div>
            </div>
          </div>

          {/* Margin buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isNotDefault}
              onClick={() => {
                setCustomMargins(DEFAULT_MARGINS)
              }}
            >
              Restablecer
            </Button>
            <Button
              size="sm"
              disabled={!hasChanges}
              onClick={handleApplyMargins}
            >
              Aplicar Margenes
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
