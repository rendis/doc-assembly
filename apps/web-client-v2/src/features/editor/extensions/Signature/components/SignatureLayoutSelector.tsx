import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { SignatureCount, SignatureLayout } from '../types'
import { getLayoutsForCount } from '../signature-layouts'

interface SignatureLayoutSelectorProps {
  count: SignatureCount
  value: SignatureLayout
  onChange: (layout: SignatureLayout) => void
}

/**
 * Renderiza una miniatura visual del layout
 */
function LayoutThumbnail({
  layout,
  count,
}: {
  layout: SignatureLayout
  count: SignatureCount
}) {
  // Smaller boxes for single signatures so alignment differences are visible
  const boxWidth =
    count === 4 ? '18px' : count === 3 ? '22px' : count === 2 ? '28px' : '24px'

  const renderSignatureBox = (key: string, className?: string) => (
    <div
      key={key}
      className={cn('h-1.5 bg-foreground rounded-sm', className)}
      style={{ width: boxWidth }}
    />
  )

  switch (layout) {
    // 1 firma
    case 'single-left':
      return (
        <div className="flex justify-start w-full">
          {renderSignatureBox('1')}
        </div>
      )
    case 'single-center':
      return (
        <div className="flex justify-center w-full">
          {renderSignatureBox('1')}
        </div>
      )
    case 'single-right':
      return (
        <div className="flex justify-end w-full">{renderSignatureBox('1')}</div>
      )

    // 2 firmas
    case 'dual-sides':
      return (
        <div className="flex justify-between w-full">
          {renderSignatureBox('1')}
          {renderSignatureBox('2')}
        </div>
      )
    case 'dual-center':
      return (
        <div className="flex flex-col items-center gap-1.5 w-full">
          {renderSignatureBox('1')}
          {renderSignatureBox('2')}
        </div>
      )
    case 'dual-left':
      return (
        <div className="flex flex-col items-start gap-1.5 w-full">
          {renderSignatureBox('1')}
          {renderSignatureBox('2')}
        </div>
      )
    case 'dual-right':
      return (
        <div className="flex flex-col items-end gap-1.5 w-full">
          {renderSignatureBox('1')}
          {renderSignatureBox('2')}
        </div>
      )

    // 3 firmas
    case 'triple-row':
      return (
        <div className="flex justify-between w-full">
          {renderSignatureBox('1')}
          {renderSignatureBox('2')}
          {renderSignatureBox('3')}
        </div>
      )
    case 'triple-pyramid':
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex justify-between">
            {renderSignatureBox('1')}
            {renderSignatureBox('2')}
          </div>
          <div className="flex justify-center">{renderSignatureBox('3')}</div>
        </div>
      )
    case 'triple-inverted':
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex justify-center">{renderSignatureBox('1')}</div>
          <div className="flex justify-between">
            {renderSignatureBox('2')}
            {renderSignatureBox('3')}
          </div>
        </div>
      )

    // 4 firmas
    case 'quad-grid':
      return (
        <div className="grid grid-cols-2 gap-1.5 w-full place-items-center">
          {renderSignatureBox('1')}
          {renderSignatureBox('2')}
          {renderSignatureBox('3')}
          {renderSignatureBox('4')}
        </div>
      )
    case 'quad-top-heavy':
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex justify-between">
            {renderSignatureBox('1')}
            {renderSignatureBox('2')}
            {renderSignatureBox('3')}
          </div>
          <div className="flex justify-center">{renderSignatureBox('4')}</div>
        </div>
      )
    case 'quad-bottom-heavy':
      return (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex justify-center">{renderSignatureBox('1')}</div>
          <div className="flex justify-between">
            {renderSignatureBox('2')}
            {renderSignatureBox('3')}
            {renderSignatureBox('4')}
          </div>
        </div>
      )

    default:
      return null
  }
}

export function SignatureLayoutSelector({
  count,
  value,
  onChange,
}: SignatureLayoutSelectorProps) {
  const { t } = useTranslation()
  const layouts = getLayoutsForCount(count)

  return (
    <motion.div
      layout
      className="grid grid-cols-2 gap-2"
      transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
    >
      {layouts.map((layout) => (
          <motion.button
            key={layout.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              opacity: { duration: 0.15 },
              layout: { duration: 0.2 },
            }}
            type="button"
            onClick={() => onChange(layout.id)}
            className={cn(
              'relative p-3 border rounded-lg',
              'hover:border-muted-foreground hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              value === layout.id
                ? 'border-foreground bg-muted ring-2 ring-foreground/10'
                : 'border-border'
            )}
          >
            {/* Checkmark */}
            {value === layout.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-1 right-1"
              >
                <Check className="h-3 w-3 text-foreground" />
              </motion.div>
            )}

            {/* Thumbnail */}
            <div className="h-10 flex items-center justify-center px-2">
              <LayoutThumbnail layout={layout.id} count={count} />
            </div>

            {/* Label */}
            <p className="text-xs text-center mt-2 text-muted-foreground">
              {t(layout.nameKey)}
            </p>
          </motion.button>
        ))}
    </motion.div>
  )
}
