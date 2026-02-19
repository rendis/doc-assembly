import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { AlertTriangle, Key, MoreHorizontal, Pencil, Plus, ShieldOff } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AutomationKey, CreateAutomationKeyResponse } from '../api/automation-keys-api'
import { useAutomationKeys, useRevokeAutomationKey } from '../hooks/useAutomationKeys'
import { ApiKeyAuditPanel } from './ApiKeyAuditPanel'
import { ApiKeyCreateDialog } from './ApiKeyCreateDialog'
import { ApiKeyEditDialog } from './ApiKeyEditDialog'
import { ApiKeyRawKeyModal } from './ApiKeyRawKeyModal'

const TH_CLASS =
  'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'
const TOTAL_COLUMNS = 7

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ApiKeysTab(): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const { data, isLoading, error } = useAutomationKeys()
  const revokeKey = useRevokeAutomationKey()

  const [createOpen, setCreateOpen] = useState(false)
  const [editKey, setEditKey] = useState<AutomationKey | null>(null)
  const [rawKeyResult, setRawKeyResult] = useState<CreateAutomationKeyResponse | null>(null)
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null)

  function toggleExpand(id: string) {
    setExpandedKeyId((prev) => (prev === id ? null : id))
  }

  async function handleRevoke(key: AutomationKey) {
    if (
      !window.confirm(
        t('administration.apiKeys.confirmRevoke', 'Revoke this API key? This cannot be undone.')
      )
    )
      return
    try {
      await revokeKey.mutateAsync(key.id)
      toast({ title: t('administration.apiKeys.revokeSuccess', 'API key revoked') })
      if (expandedKeyId === key.id) setExpandedKeyId(null)
    } catch {
      toast({
        title: t('administration.apiKeys.revokeError', 'Failed to revoke API key'),
        variant: 'destructive',
      })
    }
  }

  function handleCreated(result: CreateAutomationKeyResponse) {
    setCreateOpen(false)
    setRawKeyResult(result)
  }

  const keys = data?.data ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t(
            'administration.apiKeys.description',
            'Manage automation API keys for machine-to-machine access.'
          )}
        </p>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-mono uppercase tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t('administration.apiKeys.newKey', 'New API Key')}
        </button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className={TH_CLASS}>{t('administration.apiKeys.columns.prefix', 'Prefix')}</th>
              <th className={TH_CLASS}>{t('administration.apiKeys.columns.name', 'Name')}</th>
              <th className={TH_CLASS}>
                {t('administration.apiKeys.columns.tenants', 'Allowed Tenants')}
              </th>
              <th className={TH_CLASS}>{t('administration.apiKeys.columns.status', 'Status')}</th>
              <th className={TH_CLASS}>
                {t('administration.apiKeys.columns.lastUsed', 'Last Used')}
              </th>
              <th className={TH_CLASS}>{t('administration.apiKeys.columns.created', 'Created')}</th>
              <th className={TH_CLASS + ' w-12'} />
            </tr>
          </thead>
          <tbody>
            {/* Loading skeletons */}
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: TOTAL_COLUMNS }).map((_, j) => (
                    <td key={j} className="p-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Error */}
            {!isLoading && error && (
              <tr>
                <td colSpan={TOTAL_COLUMNS} className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <AlertTriangle className="h-6 w-6" />
                    <span className="text-sm">
                      {t('administration.apiKeys.loadError', 'Failed to load API keys')}
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty */}
            {!isLoading && !error && keys.length === 0 && (
              <tr>
                <td colSpan={TOTAL_COLUMNS} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Key className="h-8 w-8 opacity-40" />
                    <span className="text-sm">
                      {t('administration.apiKeys.empty', 'No API keys found')}
                    </span>
                  </div>
                </td>
              </tr>
            )}

            {/* Rows */}
            {!isLoading &&
              !error &&
              keys.map((key) => (
                <React.Fragment key={key.id}>
                  <tr
                    className="cursor-pointer border-b hover:bg-muted/50"
                    onClick={() => toggleExpand(key.id)}
                  >
                    <td className="p-4 font-mono text-xs">{key.keyPrefix}…</td>
                    <td className="p-4 text-sm font-medium">{key.name}</td>
                    <td className="p-4 text-sm">
                      {key.allowedTenants.length === 0 ? (
                        <span className="text-muted-foreground">
                          {t('administration.apiKeys.tenants.global', 'Global')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                          {t('administration.apiKeys.tenants.restricted', '{{count}} tenant(s)', {
                            count: key.allowedTenants.length,
                          })}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {key.isActive ? (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          {t('administration.apiKeys.status.active', 'Active')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                          {t('administration.apiKeys.status.revoked', 'Revoked')}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {key.lastUsedAt
                        ? formatDate(key.lastUsedAt)
                        : t('administration.apiKeys.never', 'Never')}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditKey(key)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('common.edit', 'Edit')}
                          </DropdownMenuItem>
                          {key.isActive && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleRevoke(key)}
                              >
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Revoke
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>

                  {expandedKeyId === key.id && (
                    <ApiKeyAuditPanel keyId={key.id} colSpan={TOTAL_COLUMNS} />
                  )}
                </React.Fragment>
              ))}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <ApiKeyCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <ApiKeyEditDialog
        open={editKey !== null}
        keyData={editKey}
        onClose={() => setEditKey(null)}
      />
      {rawKeyResult && (
        <ApiKeyRawKeyModal rawKey={rawKeyResult.rawKey} onClose={() => setRawKeyResult(null)} />
      )}
    </div>
  )
}
