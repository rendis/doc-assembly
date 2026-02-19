import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAutomationKeyAuditLog } from '../hooks/useAutomationKeys'

const AUDIT_LIMIT = 20

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-muted text-muted-foreground',
  POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PUT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PATCH: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TH = 'p-3 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'
const TD = 'p-3 text-sm'

interface ApiKeyAuditPanelProps {
  keyId: string
  colSpan: number
}

export function ApiKeyAuditPanel({ keyId, colSpan }: ApiKeyAuditPanelProps) {
  const { t } = useTranslation()
  const [offset, setOffset] = useState(0)

  const { data, isLoading, error } = useAutomationKeyAuditLog(keyId, AUDIT_LIMIT, offset, true)

  const entries = data?.data ?? []
  const total = data?.count ?? 0
  const page = Math.floor(offset / AUDIT_LIMIT) + 1
  const totalPages = Math.max(1, Math.ceil(total / AUDIT_LIMIT))

  return (
    <tr>
      <td colSpan={colSpan} className="bg-muted/30 px-6 pb-4 pt-2">
        <div className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {t('administration.apiKeys.audit.title', 'Audit Log')}
        </div>

        {isLoading && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {t('common.loading', 'Loading...')}
          </div>
        )}

        {error && (
          <div className="py-4 text-center text-sm text-destructive">
            {t('administration.apiKeys.audit.loadError', 'Failed to load audit log')}
          </div>
        )}

        {!isLoading && !error && entries.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {t('administration.apiKeys.audit.empty', 'No activity recorded yet for this key.')}
          </div>
        )}

        {!isLoading && !error && entries.length > 0 && (
          <>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className={TH}>{t('administration.apiKeys.audit.columns.date', 'Date')}</th>
                    <th className={TH}>{t('administration.apiKeys.audit.columns.method', 'Method')}</th>
                    <th className={TH}>{t('administration.apiKeys.audit.columns.path', 'Path')}</th>
                    <th className={TH}>{t('administration.apiKeys.audit.columns.action', 'Action')}</th>
                    <th className={TH}>{t('administration.apiKeys.audit.columns.resource', 'Resource')}</th>
                    <th className={TH}>{t('administration.apiKeys.audit.columns.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className={TD + ' whitespace-nowrap text-muted-foreground'}>
                        {formatDateTime(entry.createdAt)}
                      </td>
                      <td className={TD}>
                        <span
                          className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-medium ${METHOD_COLORS[entry.method] ?? 'bg-muted text-muted-foreground'}`}
                        >
                          {entry.method}
                        </span>
                      </td>
                      <td className={TD + ' max-w-[240px] truncate font-mono text-xs'}>
                        {entry.path}
                      </td>
                      <td className={TD}>{entry.action ?? '—'}</td>
                      <td className={TD}>{entry.resourceType ?? '—'}</td>
                      <td className={TD}>
                        <span
                          className={`font-mono text-xs ${entry.responseStatus >= 400 ? 'text-destructive' : 'text-muted-foreground'}`}
                        >
                          {entry.responseStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                <button
                  onClick={() => setOffset(Math.max(0, offset - AUDIT_LIMIT))}
                  disabled={offset === 0}
                  className="disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + AUDIT_LIMIT)}
                  disabled={offset + AUDIT_LIMIT >= total}
                  className="disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </td>
    </tr>
  )
}
