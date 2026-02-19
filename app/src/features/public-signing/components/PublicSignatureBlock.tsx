import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { PenLine } from 'lucide-react'

interface SignatureItem {
  id: string
  label: string
  subtitle?: string
}

/**
 * Read-only signature block for the public signing page.
 * Shows signature placeholders without any editing functionality.
 */
export function PublicSignatureBlock(props: NodeViewProps) {
  const { node } = props
  const { t } = useTranslation()

  const signatures = useMemo(
    () => (node.attrs.signatures ?? []) as SignatureItem[],
    [node.attrs.signatures],
  )

  return (
    <NodeViewWrapper className="my-6">
      <div
        contentEditable={false}
        className="relative w-full p-6 border-2 border-dashed rounded-lg bg-muted/10 border-border/60 select-none"
      >
        {/* Tab label */}
        <div className="absolute -top-3 left-4 z-10">
          <div className="px-2 h-6 bg-card flex items-center gap-1.5 text-xs font-medium border rounded shadow-sm text-muted-foreground border-border">
            <PenLine className="h-3.5 w-3.5" />
            <span>{t('publicSigning.signatureBlock')}</span>
          </div>
        </div>

        {/* Signatures grid */}
        <div className="flex flex-wrap justify-center gap-8 pt-2">
          {signatures.map((sig) => (
            <div
              key={sig.id}
              className="flex flex-col items-center gap-2 min-w-[180px]"
            >
              {/* Signature line */}
              <div className="w-full h-[1px] bg-border mt-8" />
              <p className="text-xs font-medium text-foreground">
                {sig.label}
              </p>
              {sig.subtitle && (
                <p className="text-[10px] text-muted-foreground -mt-1">
                  {sig.subtitle}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </NodeViewWrapper>
  )
}
