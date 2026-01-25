import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertCircle, Loader2, X, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useInjectables } from '../../hooks/useInjectables'
import { useRoleInjectables } from '../../hooks/useRoleInjectables'
import { usePreviewPDF } from '../../hooks/usePreviewPDF'
import { useEmulatedValues } from '../../hooks/useEmulatedValues'
import { emulateValue } from '../../services/injectable-emulator'
import { generateConsistentRoleValues } from '../../services/role-injectable-generator'
import { StandardInjectablesSection } from './StandardInjectablesSection'
import { RoleInjectablesSection } from './RoleInjectablesSection'
import { SystemInjectablesSection } from './SystemInjectablesSection'
import { TableInjectablesSection } from './TableInjectablesSection'
import { PDFPreviewModal } from './PDFPreviewModal'
import type { TableInputValue } from '../../types/table-input'
import { toTableValuePayload } from '../../types/table-input'
import { INTERNAL_INJECTABLE_KEYS } from '../../types/injectable'
import type {
  InjectableFormValues,
  InjectableFormErrors,
} from '../../types/preview'
import type { RoleInjectable } from '../../types/role-injectable'

interface InjectablesFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string
  versionId: string
}

export function InjectablesFormModal({
  open,
  onOpenChange,
  templateId,
  versionId,
}: InjectablesFormModalProps) {
  const { t } = useTranslation()
  const { variables, isLoading: isLoadingVariables } = useInjectables()
  const { roleInjectables } = useRoleInjectables()
  const {
    isGenerating,
    error,
    pdfBlob,
    generatePreview,
    clearError,
    clearPDF,
  } = usePreviewPDF({
    templateId,
    versionId,
  })
  const { getEmulatedValue } = useEmulatedValues()

  // Agrupar role injectables por roleLabel
  const roleGroups = useMemo(() => {
    const groups = new Map<string, RoleInjectable[]>()
    roleInjectables.forEach((ri) => {
      const existing = groups.get(ri.roleLabel) || []
      groups.set(ri.roleLabel, [...existing, ri])
    })
    return groups
  }, [roleInjectables])

  const [values, setValues] = useState<InjectableFormValues>({})
  const [errors, setErrors] = useState<InjectableFormErrors>({})
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())
  const [showPDFModal, setShowPDFModal] = useState(false)
  const hasEmulatedRef = useRef(false)

  // Filtrar solo variables normales (no ROLE_TEXT que ya estan en roleInjectables)
  const standardVariables = useMemo(
    () => variables.filter((v) => v.type !== 'ROLE_TEXT'),
    [variables]
  )

  // Separar variables de sistema de las normales
  const systemVariables = useMemo(
    () =>
      standardVariables.filter((v) =>
        INTERNAL_INJECTABLE_KEYS.includes(
          v.variableId as (typeof INTERNAL_INJECTABLE_KEYS)[number]
        )
      ),
    [standardVariables]
  )

  // Variables del documento (excluyendo las de sistema y TABLE type)
  const documentVariables = useMemo(
    () =>
      standardVariables.filter(
        (v) =>
          !INTERNAL_INJECTABLE_KEYS.includes(
            v.variableId as (typeof INTERNAL_INJECTABLE_KEYS)[number]
          ) && v.type !== 'TABLE'
      ),
    [standardVariables]
  )

  // TABLE type variables (handled by TableInjectablesSection)
  const tableVariables = useMemo(
    () =>
      standardVariables.filter(
        (v) =>
          v.type === 'TABLE' &&
          !INTERNAL_INJECTABLE_KEYS.includes(
            v.variableId as (typeof INTERNAL_INJECTABLE_KEYS)[number]
          )
      ),
    [standardVariables]
  )

  const hasVariables = standardVariables.length > 0 || roleInjectables.length > 0 || tableVariables.length > 0

  // Auto-completar valores emulados al abrir el modal
  useEffect(() => {
    if (open && systemVariables.length > 0 && !hasEmulatedRef.current) {
      const emulatedValues: Record<string, unknown> = {}
      systemVariables.forEach((variable) => {
        const emulatedValueResult = emulateValue(variable.variableId)
        if (emulatedValueResult !== null) {
          emulatedValues[variable.variableId] = emulatedValueResult
        }
      })
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional auto-fill on modal open
      setValues((prev) => ({ ...prev, ...emulatedValues }))
      hasEmulatedRef.current = true
    }
  }, [open, systemVariables])

  // Limpiar estado al abrir/cerrar
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset on modal close
      setErrors({})
      setTouchedFields(new Set())
      clearError()
      hasEmulatedRef.current = false
    }
  }, [open, clearError])

  // Abrir PDF modal cuando el blob esta listo
  useEffect(() => {
    if (pdfBlob && !isGenerating) {
      onOpenChange(false)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional state update on PDF ready
      setShowPDFModal(true)
    }
  }, [pdfBlob, isGenerating, onOpenChange])

  const handleChange = useCallback((variableId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [variableId]: value }))
    setTouchedFields((prev) => new Set(prev).add(variableId))
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[variableId]
      return newErrors
    })
  }, [])

  const handleResetToEmulated = useCallback(
    (variableId: string) => {
      const emulatedValueResult = getEmulatedValue(variableId)
      if (emulatedValueResult !== null) {
        setValues((prev) => ({ ...prev, [variableId]: emulatedValueResult }))
        setTouchedFields((prev) => {
          const newSet = new Set(prev)
          newSet.delete(variableId)
          return newSet
        })
      }
    },
    [getEmulatedValue]
  )

  const handleGenerateAllRoles = useCallback(() => {
    const allGeneratedValues: Record<string, string> = {}

    Array.from(roleGroups.entries()).forEach(([_roleLabel, injectables]) => {
      const { name, email } = generateConsistentRoleValues()

      injectables.forEach((ri) => {
        allGeneratedValues[ri.variableId] =
          ri.propertyKey === 'name' ? name : email
      })
    })

    setValues((prev) => ({ ...prev, ...allGeneratedValues }))

    Object.keys(allGeneratedValues).forEach((variableId) => {
      setTouchedFields((prev) => new Set(prev).add(variableId))
    })
  }, [roleGroups])

  const validateForm = useCallback((): boolean => {
    const newErrors: InjectableFormErrors = {}

    // Only validate document variables, not system variables (which are auto-generated)
    documentVariables.forEach((variable) => {
      const value = values[variable.variableId]
      if (!value || value === '') return

      switch (variable.type) {
        case 'NUMBER':
        case 'CURRENCY':
          if (isNaN(Number(value))) {
            newErrors[variable.variableId] = t(
              'editor.preview.errors.invalidNumber'
            )
          }
          break
        case 'DATE': {
          const date = new Date(value as string)
          if (isNaN(date.getTime())) {
            newErrors[variable.variableId] = t(
              'editor.preview.errors.invalidDate'
            )
          }
          break
        }
      }
    })

    roleInjectables.forEach((ri) => {
      const value = values[ri.variableId]
      if (!value || value === '') return

      if (ri.propertyKey === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value as string)) {
          newErrors[ri.variableId] = t('editor.preview.errors.invalidEmail')
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [standardVariables, roleInjectables, values, t])

  const handleGenerate = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    // Transform table values to backend format
    const transformedValues = { ...values }
    tableVariables.forEach((variable) => {
      const tableValue = values[variable.variableId] as TableInputValue | undefined
      if (tableValue) {
        transformedValues[variable.variableId] = toTableValuePayload(tableValue)
      }
    })

    await generatePreview(transformedValues)
  }, [validateForm, generatePreview, values, tableVariables])

  const handlePDFModalClose = useCallback(() => {
    setShowPDFModal(false)
    clearPDF()
  }, [clearPDF])

  // Caso sin variables
  if (!isLoadingVariables && !hasVariables) {
    return (
      <>
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              aria-describedby={undefined}
              className={cn(
                '[color-scheme:light] dark:[color-scheme:dark]',
                'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border p-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                    {t('editor.preview.title')}
                  </DialogPrimitive.Title>
                </div>
                <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-sm text-muted-foreground">
                  {t('editor.preview.noVariables')}
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t border-border p-6">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  {t('editor.preview.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => generatePreview({})}
                  className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
                >
                  {t('editor.preview.generateAnyway')}
                </button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <PDFPreviewModal
          open={showPDFModal}
          onOpenChange={handlePDFModalClose}
          pdfBlob={pdfBlob}
          fileName={`preview-${templateId}.pdf`}
        />
      </>
    )
  }

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              '[color-scheme:light] dark:[color-scheme:dark]',
              'fixed left-[50%] top-[50%] z-50 w-full max-w-[600px] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200 flex flex-col',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                <div>
                  <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                    {t('editor.preview.title')}
                  </DialogPrimitive.Title>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('editor.preview.description')}
                  </p>
                </div>
              </div>
              <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error.message}</AlertDescription>
                  </Alert>
                )}

                {systemVariables.length > 0 && (
                  <SystemInjectablesSection
                    variables={systemVariables}
                    values={values}
                    errors={errors}
                    touchedFields={touchedFields}
                    onChange={handleChange}
                    onResetToEmulated={handleResetToEmulated}
                    disabled={isGenerating}
                  />
                )}

                {documentVariables.length > 0 && (
                  <div>
                    {systemVariables.length > 0 && (
                      <div className="border-t border-border my-4" />
                    )}
                    <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
                      {t('editor.preview.standardVariables')}
                    </h2>
                    <StandardInjectablesSection
                      variables={documentVariables}
                      values={values}
                      errors={errors}
                      onChange={handleChange}
                      disabled={isGenerating}
                    />
                  </div>
                )}

                {tableVariables.length > 0 && (
                  <>
                    {(systemVariables.length > 0 ||
                      documentVariables.length > 0) && (
                      <div className="border-t border-border my-4" />
                    )}

                    <TableInjectablesSection
                      variables={tableVariables}
                      values={values}
                      onChange={handleChange}
                      disabled={isGenerating}
                    />
                  </>
                )}

                {roleInjectables.length > 0 && (
                  <>
                    {(systemVariables.length > 0 ||
                      documentVariables.length > 0 ||
                      tableVariables.length > 0) && (
                      <div className="border-t border-border my-4" />
                    )}

                    <RoleInjectablesSection
                      roleInjectables={roleInjectables}
                      values={values}
                      errors={errors}
                      onChange={handleChange}
                      onGenerateAll={handleGenerateAllRoles}
                      disabled={isGenerating}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isGenerating}
                className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
              >
                {t('editor.preview.cancel')}
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('editor.preview.generating')}
                  </>
                ) : (
                  t('editor.preview.generate')
                )}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <PDFPreviewModal
        open={showPDFModal}
        onOpenChange={handlePDFModalClose}
        pdfBlob={pdfBlob}
        fileName={`preview-${templateId}.pdf`}
      />
    </>
  )
}
