import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, AlertCircle } from 'lucide-react'
import {
  getPublicSigningPage,
  completeEmbeddedSigning,
} from '../api/public-signing-api'

interface EmbeddedSigningFrameProps {
  url: string
  token: string
  onComplete: () => void
  onDecline: () => void
}

/**
 * EmbeddedSigningFrame renders the signing provider inside an iframe.
 * It is 100% provider-agnostic: it never imports or references any provider.
 *
 * Two mechanisms detect signing completion:
 * 1. postMessage from our own callback bridge page (loaded when the provider redirects)
 * 2. Polling fallback every 10s (works with any provider, especially those without redirect)
 */
export function EmbeddedSigningFrame({
  url,
  token,
  onComplete,
  onDecline,
}: EmbeddedSigningFrameProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleComplete = useCallback(async () => {
    try {
      await completeEmbeddedSigning(token)
    } catch {
      // Best effort — the backend may already have marked it.
    }
    onComplete()
  }, [token, onComplete])

  // 1. Listen for postMessage — callback bridge (own origin) + provider native events.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // Mechanism 1: Callback bridge (our own origin)
      if (e.origin === window.location.origin && e.data?.type === 'SIGNING_EVENT') {
        if (e.data.status === 'signed') handleComplete()
        if (e.data.status === 'declined') onDecline()
        return
      }

      // Mechanism 2: Native postMessage from the signing provider iframe.
      // Provider-agnostic: only trust messages whose source is our iframe,
      // then look for generic completion/rejection strings in the event type.
      if (e.source === iframeRef.current?.contentWindow) {
        const eventType = e.data?.type || e.data?.event || ''
        if (typeof eventType === 'string') {
          if (eventType.includes('completed') || eventType.includes('signed')) handleComplete()
          if (eventType.includes('rejected') || eventType.includes('declined')) onDecline()
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [handleComplete, onDecline])

  // 2. Polling fallback — universal, works with ANY provider.
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await getPublicSigningPage(token)
        if (res.step === 'completed') {
          handleComplete()
        } else if (res.step === 'declined') {
          onDecline()
        }
      } catch {
        // Token may have been used — ignore and let next poll handle it.
      }
    }, 10_000)

    return () => clearInterval(interval)
  }, [token, handleComplete, onDecline])

  return (
    <div className="relative w-full" style={{ minHeight: '80vh' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {t('publicSigning.loadingSigning')}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-3 text-center px-6">
            <AlertCircle size={32} className="text-destructive" />
            <p className="text-sm text-muted-foreground">
              {t('publicSigning.errors.iframeLoadFailed')}
            </p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={url}
        title="Document Signing"
        className="w-full border-0"
        style={{ height: '80vh' }}
        sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError(true)
        }}
      />
    </div>
  )
}
