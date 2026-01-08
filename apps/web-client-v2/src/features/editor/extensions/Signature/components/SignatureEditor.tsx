import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  SignatureBlockAttrs,
  SignatureCount,
  SignatureItem,
  SignatureLayout,
  SignatureLineWidth,
} from '../types'
import {
  adjustSignaturesToCount,
  getDefaultLayoutForCount,
} from '../types'
import { SignatureLayoutSelector } from './SignatureLayoutSelector'
import { SignatureImageUpload } from './SignatureImageUpload'
import { SignatureRoleSelector } from './SignatureRoleSelector'

interface SignatureEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attrs: SignatureBlockAttrs
  onSave: (attrs: SignatureBlockAttrs) => void
}

const COUNT_OPTIONS: SignatureCount[] = [1, 2, 3, 4]
const LINE_WIDTH_OPTIONS: { value: SignatureLineWidth; labelKey: string }[] = [
  { value: 'sm', labelKey: 'editor.signature.lineWidths.small' },
  { value: 'md', labelKey: 'editor.signature.lineWidths.medium' },
  { value: 'lg', labelKey: 'editor.signature.lineWidths.large' },
]

export function SignatureEditor({
  open,
  onOpenChange,
  attrs,
  onSave,
}: SignatureEditorProps) {
  const { t } = useTranslation()
  const [localAttrs, setLocalAttrs] = useState<SignatureBlockAttrs>(attrs)
  const [activeTab, setActiveTab] = useState(0)

  // Sincronizar cuando cambian los attrs externos
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync with external attrs
    setLocalAttrs(attrs)
    setActiveTab(0)
  }, [attrs])

  const handleCountChange = useCallback((newCount: SignatureCount) => {
    setLocalAttrs((prev) => {
      const newSignatures = adjustSignaturesToCount(prev.signatures, newCount)
      const newLayout = getDefaultLayoutForCount(newCount)
      return {
        ...prev,
        count: newCount,
        layout: newLayout,
        signatures: newSignatures,
      }
    })
    setActiveTab(0)
  }, [])

  const handleLayoutChange = useCallback((newLayout: SignatureLayout) => {
    setLocalAttrs((prev) => ({
      ...prev,
      layout: newLayout,
    }))
  }, [])

  const handleLineWidthChange = useCallback((newWidth: SignatureLineWidth) => {
    setLocalAttrs((prev) => ({
      ...prev,
      lineWidth: newWidth,
    }))
  }, [])

  const handleSignatureUpdate = useCallback(
    (index: number, updates: Partial<SignatureItem>) => {
      setLocalAttrs((prev) => {
        const newSignatures = [...prev.signatures]
        newSignatures[index] = { ...newSignatures[index], ...updates }
        return { ...prev, signatures: newSignatures }
      })
    },
    []
  )

  const handleSave = useCallback(() => {
    onSave(localAttrs)
    onOpenChange(false)
  }, [localAttrs, onSave, onOpenChange])

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200 flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('editor.signature.configureBlock')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <motion.div
            layout
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1 overflow-hidden p-6"
          >
            <div className="grid grid-cols-[200px_1fr] gap-6 h-full">
              {/* Panel izquierdo: Configuración general */}
              <motion.div
                layout
                className="space-y-4 border-r border-border pr-4 pb-1 overflow-hidden"
              >
                {/* Cantidad de firmas */}
                <div className="space-y-2">
                  <Label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    {t('editor.signature.signatureCount')}
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {COUNT_OPTIONS.map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => handleCountChange(count)}
                        className={cn(
                          'h-8 rounded-none border text-sm font-medium transition-colors',
                          localAttrs.count === count
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background hover:bg-muted border-border'
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout */}
                <div className="space-y-2 min-h-[280px]">
                  <Label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    {t('editor.signature.layout')}
                  </Label>
                  <SignatureLayoutSelector
                    count={localAttrs.count}
                    value={localAttrs.layout}
                    onChange={handleLayoutChange}
                  />
                </div>

                {/* Ancho de línea */}
                <div className="space-y-2">
                  <Label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                    {t('editor.signature.lineWidth')}
                  </Label>
                  <Select
                    value={localAttrs.lineWidth}
                    onValueChange={(value) =>
                      handleLineWidthChange(value as SignatureLineWidth)
                    }
                  >
                    <SelectTrigger className="h-8 text-xs border-border rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[140px] p-1">
                      {LINE_WIDTH_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-xs"
                        >
                          {t(option.labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              {/* Panel derecho: Configuración por firma */}
              <div className="flex flex-col min-h-0">
                {/* Tabs de firmas */}
                <div className="flex border-b border-border mb-3">
                  {localAttrs.signatures.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveTab(index)}
                      className={cn(
                        'px-4 py-2 font-mono text-xs uppercase tracking-wider border-b-2 -mb-px transition-colors',
                        activeTab === index
                          ? 'border-foreground text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {t('editor.signature.signatureN', { n: index + 1 })}
                    </button>
                  ))}
                </div>

                {/* Contenido de la firma activa */}
                <ScrollArea className="flex-1">
                  {localAttrs.signatures.map((signature, index) => (
                    <div
                      key={signature.id}
                      className={cn(
                        'space-y-4 px-1',
                        activeTab !== index && 'hidden'
                      )}
                    >
                      {/* Label */}
                      <div className="space-y-1">
                        <Label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                          {t('editor.signature.label')}
                        </Label>
                        <Input
                          value={signature.label}
                          onChange={(e) =>
                            handleSignatureUpdate(index, { label: e.target.value })
                          }
                          placeholder={t('editor.signature.labelPlaceholder')}
                          className="h-8 text-sm border-border rounded-none focus:border-foreground"
                        />
                      </div>

                      {/* Subtitle */}
                      <div className="space-y-1">
                        <Label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                          {t('editor.signature.subtitleOptional')}
                        </Label>
                        <Input
                          value={signature.subtitle || ''}
                          onChange={(e) =>
                            handleSignatureUpdate(index, {
                              subtitle: e.target.value || undefined,
                            })
                          }
                          placeholder={t('editor.signature.subtitlePlaceholder')}
                          className="h-8 text-sm border-border rounded-none focus:border-foreground"
                        />
                      </div>

                      {/* Rol */}
                      <SignatureRoleSelector
                        roleId={signature.roleId}
                        signatureId={signature.id}
                        onChange={(roleId) =>
                          handleSignatureUpdate(index, { roleId })
                        }
                      />

                      {/* Imagen */}
                      <SignatureImageUpload
                        imageData={signature.imageData}
                        imageOriginal={signature.imageOriginal}
                        opacity={signature.imageOpacity ?? 100}
                        onImageChange={(imageData, imageOriginal) =>
                          handleSignatureUpdate(index, { imageData, imageOriginal })
                        }
                        onOpacityChange={(imageOpacity) =>
                          handleSignatureUpdate(index, { imageOpacity })
                        }
                      />
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {t('editor.signature.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              {t('editor.signature.saveChanges')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
