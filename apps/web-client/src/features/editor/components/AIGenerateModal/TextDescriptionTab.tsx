/**
 * Text Description Tab for AI Generate Modal
 *
 * Allows users to write a text description of the contract they want to generate.
 * Includes character counter and validation hints.
 */

import { useTranslation } from 'react-i18next';
import { AlertCircle, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { TextDescriptionTabProps } from './types';

const MIN_CHARS = 50;
const MAX_CHARS = 2000;

export function TextDescriptionTab({ onTextChange, text }: TextDescriptionTabProps) {
  const { t } = useTranslation();

  const charCount = text.length;
  const isValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const isTooShort = charCount > 0 && charCount < MIN_CHARS;
  const isTooLong = charCount > MAX_CHARS;

  return (
    <div className="flex flex-col gap-4">
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">
            {t('editor.textDescriptionTip', 'Consejo para mejores resultados')}
          </p>
          <p className="text-xs opacity-90">
            {t(
              'editor.textDescriptionTipDetail',
              'Incluye detalles específicos como: tipo de contrato, partes involucradas, plazos, montos, y condiciones especiales.'
            )}
          </p>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <Textarea
          value={text}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onTextChange(e.target.value)}
          placeholder={t(
            'editor.textDescriptionPlaceholder',
            'Describe el contrato que deseas generar. Por ejemplo:\n\n"Contrato de arrendamiento para un departamento en la Ciudad de México, con duración de 12 meses, renta mensual de $8,000 MXN, y depósito de garantía equivalente a 2 meses de renta. El arrendatario se compromete a..."'
          )}
          className="min-h-[300px] resize-none"
          maxLength={MAX_CHARS}
        />

        {/* Character Counter */}
        <div
          className={`
          absolute bottom-3 right-3 text-xs px-2 py-1 rounded
          ${
            isTooLong
              ? 'bg-destructive/10 text-destructive'
              : isTooShort
              ? 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
              : isValid
              ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
              : 'bg-muted text-muted-foreground'
          }
        `}
        >
          {charCount} / {MAX_CHARS}
        </div>
      </div>

      {/* Validation Messages */}
      {isTooShort && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            {t(
              'errors.textTooShort',
              `La descripción debe tener al menos ${MIN_CHARS} caracteres. Faltan ${
                MIN_CHARS - charCount
              } caracteres.`
            )}
          </p>
        </div>
      )}

      {isTooLong && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">
            {t(
              'errors.textTooLong',
              `La descripción excede el límite de ${MAX_CHARS} caracteres. Elimina ${
                charCount - MAX_CHARS
              } caracteres.`
            )}
          </p>
        </div>
      )}

      {/* Example Hint */}
      {charCount === 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t('editor.textDescriptionExamples', 'Ejemplos de descripciones:')}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>
              {t(
                'editor.exampleLease',
                'Contrato de arrendamiento residencial, 12 meses, $8,000 MXN mensuales'
              )}
            </li>
            <li>
              {t(
                'editor.exampleService',
                'Contrato de prestación de servicios de desarrollo de software, 6 meses'
              )}
            </li>
            <li>
              {t('editor.exampleSale', 'Contrato de compraventa de vehículo usado, pago en efectivo')}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
