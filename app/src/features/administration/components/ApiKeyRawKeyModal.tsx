import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, Copy, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ApiKeyRawKeyModalProps {
  rawKey: string
  onClose: () => void
}

export function ApiKeyRawKeyModal({ rawKey, onClose }: ApiKeyRawKeyModalProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            {t('administration.apiKeys.rawKey.title', 'Save your API Key')}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {t(
            'administration.apiKeys.rawKey.warning',
            'This key will only be shown once. Copy it now and store it somewhere safe — you will not be able to retrieve it again.'
          )}
        </p>

        <div className="space-y-2">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {t('administration.apiKeys.rawKey.keyLabel', 'Your new API key')}
          </div>
          <div className="flex items-center gap-2 rounded-sm border border-border bg-muted p-3">
            <code className="flex-1 break-all text-sm">{rawKey}</code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-background"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {t('administration.apiKeys.rawKey.copied', 'Copied!')}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t('administration.apiKeys.rawKey.copyButton', 'Copy')}
                </>
              )}
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4"
          />
          {t(
            'administration.apiKeys.rawKey.confirmLabel',
            'I have copied the key and stored it safely'
          )}
        </label>

        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={!confirmed}
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
          >
            {t('administration.apiKeys.rawKey.closeButton', 'Close')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
