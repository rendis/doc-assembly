import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Sparkles, X } from 'lucide-react';
import { useInjectables } from '../../hooks/useInjectables';
import { useRoleInjectables } from '../../hooks/useRoleInjectables';
import { usePreviewPDF } from '../../hooks/usePreviewPDF';
import { useEmulatedValues } from '../../hooks/useEmulatedValues';
import { emulateValue } from '../../services/injectable-emulator';
import { generateConsistentRoleValues } from '../../services/role-injectable-generator';
import { StandardInjectablesSection } from './StandardInjectablesSection';
import { RoleInjectablesSection } from './RoleInjectablesSection';
import { SystemInjectablesSection } from './SystemInjectablesSection';
import { PDFPreviewModal } from '../PDFPreviewModal';
import { INTERNAL_INJECTABLE_KEYS } from '../../types/injectable';
import type { InjectableFormValues, InjectableFormErrors } from '../../types/preview';
import type { RoleInjectable } from '../../types/role-injectable';

interface InjectablesFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  versionId: string;
}

export function InjectablesFormModal({
  open,
  onOpenChange,
  templateId,
  versionId,
}: InjectablesFormModalProps) {
  const { t } = useTranslation();
  const { variables, isLoading: isLoadingVariables } = useInjectables();
  const { roleInjectables } = useRoleInjectables();
  const { isGenerating, error, pdfBlob, generatePreview, clearError, clearPDF } = usePreviewPDF({
    templateId,
    versionId,
  });
  const { getEmulatedValue } = useEmulatedValues();

  // Agrupar role injectables por roleLabel
  const roleGroups = useMemo(() => {
    const groups = new Map<string, RoleInjectable[]>();
    roleInjectables.forEach((ri) => {
      const existing = groups.get(ri.roleLabel) || [];
      groups.set(ri.roleLabel, [...existing, ri]);
    });
    return groups;
  }, [roleInjectables]);

  const [values, setValues] = useState<InjectableFormValues>({});
  const [errors, setErrors] = useState<InjectableFormErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [showPDFModal, setShowPDFModal] = useState(false);
  const hasEmulatedRef = useRef(false);

  // Filtrar solo variables normales (no ROLE_TEXT que ya están en roleInjectables)
  const standardVariables = useMemo(
    () => variables.filter((v) => v.type !== 'ROLE_TEXT'),
    [variables]
  );

  // Separar variables de sistema de las normales
  const systemVariables = useMemo(
    () => standardVariables.filter((v) => INTERNAL_INJECTABLE_KEYS.includes(v.variableId as any)),
    [standardVariables]
  );

  // Variables del documento (excluyendo las de sistema)
  const documentVariables = useMemo(
    () => standardVariables.filter((v) => !INTERNAL_INJECTABLE_KEYS.includes(v.variableId as any)),
    [standardVariables]
  );

  const hasVariables = standardVariables.length > 0 || roleInjectables.length > 0;

  // Auto-completar valores emulados al abrir el modal
  useEffect(() => {
    if (open && systemVariables.length > 0 && !hasEmulatedRef.current) {
      const emulatedValues: Record<string, any> = {};
      systemVariables.forEach((variable) => {
        const emulatedValue = emulateValue(variable.variableId);
        if (emulatedValue !== null) {
          emulatedValues[variable.variableId] = emulatedValue;
        }
      });
      setValues((prev) => ({ ...prev, ...emulatedValues }));
      hasEmulatedRef.current = true;
    }
  }, [open, systemVariables]);

  // Limpiar estado al abrir/cerrar
  useEffect(() => {
    if (!open) {
      setErrors({});
      setTouchedFields(new Set());
      clearError();
      hasEmulatedRef.current = false;
    }
  }, [open, clearError]);

  // Abrir PDF modal cuando el blob está listo
  useEffect(() => {
    if (pdfBlob && !isGenerating) {
      onOpenChange(false); // Cerrar modal de formulario
      setShowPDFModal(true); // Abrir modal de PDF
    }
  }, [pdfBlob, isGenerating, onOpenChange]);

  const handleChange = useCallback((variableId: string, value: any) => {
    setValues((prev) => ({ ...prev, [variableId]: value }));
    setTouchedFields((prev) => new Set(prev).add(variableId));
    // Limpiar error al cambiar valor
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[variableId];
      return newErrors;
    });
  }, []);

  const handleResetToEmulated = useCallback(
    (variableId: string) => {
      const emulatedValue = getEmulatedValue(variableId);
      if (emulatedValue !== null) {
        setValues((prev) => ({ ...prev, [variableId]: emulatedValue }));
        setTouchedFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(variableId);
          return newSet;
        });
      }
    },
    [getEmulatedValue]
  );

  const handleGenerateAllRoles = useCallback(() => {
    const allGeneratedValues: Record<string, string> = {};

    Array.from(roleGroups.entries()).forEach(([_roleLabel, injectables]) => {
      const { name, email } = generateConsistentRoleValues();

      injectables.forEach((ri) => {
        allGeneratedValues[ri.variableId] =
          ri.propertyKey === 'name' ? name : email;
      });
    });

    setValues((prev) => ({ ...prev, ...allGeneratedValues }));

    // Marcar todos como touched
    Object.keys(allGeneratedValues).forEach((variableId) => {
      setTouchedFields((prev) => new Set(prev).add(variableId));
    });
  }, [roleGroups]);

  const validateForm = useCallback((): boolean => {
    const newErrors: InjectableFormErrors = {};

    // Validar variables normales
    standardVariables.forEach((variable) => {
      const value = values[variable.variableId];
      if (!value || value === '') return; // Opcional

      switch (variable.type) {
        case 'NUMBER':
        case 'CURRENCY':
          if (isNaN(Number(value))) {
            newErrors[variable.variableId] = t('editor.preview.errors.invalidNumber');
          }
          break;
        case 'DATE':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            newErrors[variable.variableId] = t('editor.preview.errors.invalidDate');
          }
          break;
      }
    });

    // Validar role injectables
    roleInjectables.forEach((ri) => {
      const value = values[ri.variableId];
      if (!value || value === '') return; // Opcional

      if (ri.propertyKey === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          newErrors[ri.variableId] = t('editor.preview.errors.invalidEmail');
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [standardVariables, roleInjectables, values, t]);

  const handleGenerate = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    await generatePreview(values);
  }, [validateForm, generatePreview, values]);

  const handlePDFModalClose = useCallback(() => {
    setShowPDFModal(false);
    clearPDF();
  }, [clearPDF]);

  // Caso sin variables
  if (!isLoadingVariables && !hasVariables) {
    return (
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('editor.preview.title')}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t('editor.preview.noVariables')}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('editor.preview.cancel')}
              </Button>
              <Button onClick={() => generatePreview({})}>
                {t('editor.preview.generateAnyway')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PDFPreviewModal
          open={showPDFModal}
          onOpenChange={handlePDFModalClose}
          pdfBlob={pdfBlob}
          fileName={`preview-${templateId}.pdf`}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] sm:max-h-[90vh] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b">
            <DialogTitle>{t('editor.preview.title')}</DialogTitle>
            <DialogDescription>
              Complete los valores para generar la vista previa del documento.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 relative overflow-hidden">
            {/* Blur fade superior */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background via-background/50 to-transparent pointer-events-none z-10 backdrop-blur-[2px]" />

            {/* Contenido scrolleable */}
            <div className="absolute inset-0 overflow-y-auto px-6 py-4">
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
              />
            )}

            {documentVariables.length > 0 && (
              <div>
                {systemVariables.length > 0 && <div className="border-t my-4" />}
                <h2 className="text-sm font-semibold mb-3">
                  {t('editor.preview.standardVariables')}
                </h2>
                <StandardInjectablesSection
                  variables={documentVariables}
                  values={values}
                  errors={errors}
                  onChange={handleChange}
                />
              </div>
            )}

            {roleInjectables.length > 0 && (
              <>
                {(systemVariables.length > 0 || documentVariables.length > 0) && <div className="border-t my-4" />}

                <RoleInjectablesSection
                  roleInjectables={roleInjectables}
                  values={values}
                  errors={errors}
                  onChange={handleChange}
                  onGenerateAll={handleGenerateAllRoles}
                />
              </>
            )}
              </div>
            </div>

            {/* Blur fade inferior */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none z-10 backdrop-blur-[2px]" />
          </div>

          <div className="flex items-center justify-center gap-2 px-6 py-3 border-t bg-muted/30">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isGenerating}>
              <X className="h-4 w-4 mr-2" />
              {t('editor.preview.cancel')}
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('editor.preview.generating')}
                </>
              ) : (
                t('editor.preview.generate')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PDFPreviewModal
        open={showPDFModal}
        onOpenChange={handlePDFModalClose}
        pdfBlob={pdfBlob}
        fileName={`preview-${templateId}.pdf`}
      />
    </>
  );
}
