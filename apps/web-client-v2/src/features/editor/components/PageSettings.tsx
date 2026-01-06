import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [customMargins, setCustomMargins] = useState(margins)
  const [inputValues, setInputValues] = useState({
    top: String(margins.top),
    bottom: String(margins.bottom),
    left: String(margins.left),
    right: String(margins.right),
  })

  // Sincronizar inputValues cuando customMargins cambie (ej: botón Restablecer)
  useEffect(() => {
    setInputValues({
      top: String(customMargins.top),
      bottom: String(customMargins.bottom),
      left: String(customMargins.left),
      right: String(customMargins.right),
    })
  }, [customMargins])

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
    setInputValues(prev => ({ ...prev, [key]: value }))
  }

  const handleMarginBlur = (key: keyof PageMargins) => {
    const value = inputValues[key]
    const numValue = parseInt(value, 10)

    if (isNaN(numValue) || value === '') {
      // Restaurar al valor actual si es inválido
      setInputValues(prev => ({ ...prev, [key]: String(customMargins[key]) }))
      return
    }

    // Clampear al rango permitido
    const clampedValue = Math.max(MARGIN_LIMITS.min, Math.min(MARGIN_LIMITS.max, numValue))

    setInputValues(prev => ({ ...prev, [key]: String(clampedValue) }))
    setCustomMargins(prev => ({ ...prev, [key]: clampedValue }))
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
            <h4 className="font-medium leading-none">{t('editor.pageSettings.title')}</h4>
            <p className="text-sm text-muted-foreground">
              {t('editor.pageSettings.description')}
            </p>
          </div>

          {/* Page Size */}
          <div className="grid gap-2">
            <Label htmlFor="page-size">{t('editor.pageSettings.pageSize')}</Label>
            <Select
              value={getCurrentSizeKey()}
              onValueChange={handlePageSizeChange}
            >
              <SelectTrigger id="page-size">
                <SelectValue placeholder={t('editor.pageSettings.pageSizePlaceholder')} />
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
            <Label>{t('editor.pageSettings.margins')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="margin-top" className="text-xs text-muted-foreground">
                  {t('editor.pageSettings.marginTop')}
                </Label>
                <Input
                  id="margin-top"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={inputValues.top}
                  onChange={(e) => handleMarginChange('top', e.target.value)}
                  onBlur={() => handleMarginBlur('top')}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="margin-bottom" className="text-xs text-muted-foreground">
                  {t('editor.pageSettings.marginBottom')}
                </Label>
                <Input
                  id="margin-bottom"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={inputValues.bottom}
                  onChange={(e) => handleMarginChange('bottom', e.target.value)}
                  onBlur={() => handleMarginBlur('bottom')}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="margin-left" className="text-xs text-muted-foreground">
                  {t('editor.pageSettings.marginLeft')}
                </Label>
                <Input
                  id="margin-left"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={inputValues.left}
                  onChange={(e) => handleMarginChange('left', e.target.value)}
                  onBlur={() => handleMarginBlur('left')}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="margin-right" className="text-xs text-muted-foreground">
                  {t('editor.pageSettings.marginRight')}
                </Label>
                <Input
                  id="margin-right"
                  type="number"
                  min={MARGIN_LIMITS.min}
                  max={MARGIN_LIMITS.max}
                  value={inputValues.right}
                  onChange={(e) => handleMarginChange('right', e.target.value)}
                  onBlur={() => handleMarginBlur('right')}
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
              {t('editor.pageSettings.reset')}
            </Button>
            <Button
              size="sm"
              disabled={!hasChanges}
              onClick={handleApplyMargins}
            >
              {t('editor.pageSettings.applyMargins')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
