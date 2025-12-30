import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ValidationError } from '../../state-machine';

interface ValidationErrorsDisplayProps {
  errors: ValidationError[];
}

export function ValidationErrorsDisplay({ errors }: ValidationErrorsDisplayProps) {
  const { t } = useTranslation();

  if (errors.length === 0) return null;

  return (
    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">
            {t('templates.validation.fixErrors')}
          </p>
          <ul className="text-sm text-destructive/90 list-disc list-inside space-y-0.5">
            {errors.map((error, index) => (
              <li key={`${error.code}-${index}`}>{t(error.messageKey)}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
