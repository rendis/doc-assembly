import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useSignerRolesStore } from '../../stores/signer-roles-store'
import type {
  InteractiveFieldAttrs,
  InteractiveFieldType,
  InteractiveFieldOption,
} from './InteractiveFieldExtension'

interface InteractiveFieldConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attrs: InteractiveFieldAttrs
  onSave: (attrs: Partial<InteractiveFieldAttrs>) => void
}

const FIELD_TYPES: InteractiveFieldType[] = ['checkbox', 'radio', 'text']

/**
 * Inner form component that receives initial values as props.
 * Mounted fresh each time the dialog opens via the key prop.
 */
function InteractiveFieldForm({
  attrs,
  onSave,
  onClose,
}: {
  attrs: InteractiveFieldAttrs
  onSave: (attrs: Partial<InteractiveFieldAttrs>) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const roles = useSignerRolesStore((state) => state.roles)

  const [fieldType, setFieldType] = useState<InteractiveFieldType>(attrs.fieldType)
  const [roleId, setRoleId] = useState(attrs.roleId)
  const [label, setLabel] = useState(attrs.label)
  const [required, setRequired] = useState(attrs.required)
  const [options, setOptions] = useState<InteractiveFieldOption[]>(
    attrs.options.length > 0 ? attrs.options : []
  )
  const [placeholder, setPlaceholder] = useState(attrs.placeholder)
  const [maxLength, setMaxLength] = useState(attrs.maxLength)

  const handleAddOption = useCallback(() => {
    setOptions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: '' },
    ])
  }, [])

  const handleRemoveOption = useCallback((optionId: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== optionId))
  }, [])

  const handleOptionLabelChange = useCallback((optionId: string, newLabel: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, label: newLabel } : o))
    )
  }, [])

  const handleRoleChange = useCallback((value: string) => {
    setRoleId(value === '__none__' ? '' : value)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const updatedAttrs: Partial<InteractiveFieldAttrs> = {
      fieldType,
      roleId,
      label,
      required,
      placeholder: fieldType === 'text' ? placeholder : '',
      maxLength: fieldType === 'text' ? maxLength : 0,
      options: fieldType === 'checkbox' || fieldType === 'radio' ? options : [],
    }

    onSave(updatedAttrs)
    onClose()
  }

  const isChoiceType = fieldType === 'checkbox' || fieldType === 'radio'

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border p-6">
        <div>
          <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
            {t('editor.interactiveField.config.title')}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
            {t('editor.interactiveField.config.description')}
          </DialogDescription>
        </div>
        <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="space-y-5 p-6 max-h-[60vh] overflow-y-auto">
          {/* Field Type Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider">
              {t('editor.interactiveField.config.fieldType')}
            </Label>
            <div className="flex gap-1 p-1 bg-muted rounded-md">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft}
                  type="button"
                  onClick={() => setFieldType(ft)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    fieldType === ft
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(`editor.interactiveField.types.${ft}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Role Assignment */}
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider">
              {t('editor.interactiveField.config.role')}
            </Label>
            <Select value={roleId || '__none__'} onValueChange={handleRoleChange}>
              <SelectTrigger className="border-border text-sm">
                <SelectValue placeholder={t('editor.interactiveField.config.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  <span className="text-muted-foreground">
                    {t('editor.interactiveField.config.noRole')}
                  </span>
                </SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label Input */}
          <div className="space-y-2">
            <Label htmlFor="if-label" className="text-xs font-medium uppercase tracking-wider">
              {t('editor.interactiveField.config.label')}
            </Label>
            <Input
              id="if-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('editor.interactiveField.config.labelPlaceholder')}
              className="border-border text-sm"
            />
          </div>

          {/* Required Toggle */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="if-required"
              checked={required}
              onCheckedChange={(checked) => setRequired(checked === true)}
            />
            <Label htmlFor="if-required" className="cursor-pointer text-sm font-normal">
              {t('editor.interactiveField.config.required')}
            </Label>
          </div>

          {/* Options editor (checkbox / radio) */}
          {isChoiceType && (
            <div className="space-y-3 border border-border p-4 rounded">
              <Label className="text-xs font-medium uppercase tracking-wider">
                {t('editor.interactiveField.config.options')}
              </Label>

              {options.length === 0 && (
                <p className="text-xs text-muted-foreground italic">
                  {t('editor.interactiveField.config.noOptionsYet')}
                </p>
              )}

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <Input
                      value={opt.label}
                      onChange={(e) => handleOptionLabelChange(opt.id, e.target.value)}
                      placeholder={t('editor.interactiveField.config.optionPlaceholder', { number: idx + 1 })}
                      className="border-border text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                      onClick={() => handleRemoveOption(opt.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t('editor.interactiveField.config.addOption')}
              </Button>
            </div>
          )}

          {/* Text field settings */}
          {fieldType === 'text' && (
            <div className="space-y-4 border border-border p-4 rounded">
              <Label className="text-xs font-medium uppercase tracking-wider">
                {t('editor.interactiveField.config.textSettings')}
              </Label>

              <div className="space-y-2">
                <Label htmlFor="if-placeholder" className="text-xs font-medium">
                  {t('editor.interactiveField.config.placeholder')}
                </Label>
                <Input
                  id="if-placeholder"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder={t('editor.interactiveField.config.placeholderHint')}
                  className="border-border text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="if-maxlength" className="text-xs font-medium">
                  {t('editor.interactiveField.config.maxLength')}
                </Label>
                <Input
                  id="if-maxlength"
                  type="number"
                  min={0}
                  value={maxLength}
                  onChange={(e) => setMaxLength(parseInt(e.target.value, 10) || 0)}
                  className="border-border text-sm w-32"
                />
                <p className="text-xs text-muted-foreground">
                  {t('editor.interactiveField.config.maxLengthHint')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
          >
            {t('common.save')}
          </button>
        </div>
      </form>
    </>
  )
}

export function InteractiveFieldConfigDialog({
  open,
  onOpenChange,
  attrs,
  onSave,
}: InteractiveFieldConfigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-lg">
        {open && (
          <InteractiveFieldForm
            attrs={attrs}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </BaseDialogContent>
    </Dialog>
  )
}
