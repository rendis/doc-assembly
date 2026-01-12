import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { usePermission } from '@/features/auth/hooks/usePermission'
import { Permission } from '@/features/auth/rbac/rules'
import { AlertTriangle, Check, ChevronDown, Code2, Globe, Lock, Search, SquareCheck, X } from 'lucide-react'
import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useActivateSystemInjectable,
  useBulkMakePublic,
  useBulkRemovePublic,
  useDeactivateSystemInjectable,
  useSystemInjectables,
} from '../hooks/useSystemInjectables'
import type { BulkPublicAssignmentsResponse, SystemInjectable } from '../types'
import { BulkConfirmDialog, type BulkAction } from './BulkConfirmDialog'
import { InjectableCard } from './InjectableCard'
import { InjectableDetailSheet } from './InjectableDetailSheet'

type StatusFilter = 'all' | 'active' | 'inactive'
type SortBy = 'name' | 'status' | 'type'

const ITEMS_PER_PAGE = 6

export function InjectablesTab(): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const { hasPermission } = usePermission()

  const canManage = hasPermission(Permission.SYSTEM_INJECTABLES_MANAGE)

  const { data: injectables, isLoading, error } = useSystemInjectables()

  const activateMutation = useActivateSystemInjectable()
  const deactivateMutation = useDeactivateSystemInjectable()
  const bulkMakePublicMutation = useBulkMakePublic()
  const bulkRemovePublicMutation = useBulkRemovePublic()

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  // Selection mode state (for bulk operations)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [bulkConfirmAction, setBulkConfirmAction] = useState<BulkAction | null>(null)

  const isBulkPending = bulkMakePublicMutation.isPending || bulkRemovePublicMutation.isPending

  // Derive current injectable from fresh data
  const selectedInjectable = useMemo(
    () => injectables?.find((item) => item.key === selectedKey) ?? null,
    [injectables, selectedKey]
  )

  // Filters and sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('name')

  // Dropdown states
  const [statusOpen, setStatusOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  // Infinite scroll state
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
        setStatusOpen(false)
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter and sort injectables
  const filteredInjectables = useMemo(() => {
    if (!injectables) return []

    return injectables
      .filter((item) => {
        // Search filter - search by key and localized label
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const label = item.label[i18n.language] || item.label['en'] || ''
          const matchesKey = item.key.toLowerCase().includes(query)
          const matchesLabel = label.toLowerCase().includes(query)
          if (!matchesKey && !matchesLabel) {
            return false
          }
        }
        // Status filter
        if (statusFilter === 'active' && !item.isActive) return false
        if (statusFilter === 'inactive' && item.isActive) return false
        return true
      })
      .sort((a, b) => {
        let result = 0
        switch (sortBy) {
          case 'name':
            return a.key.localeCompare(b.key)
          case 'status':
            result = Number(b.isActive) - Number(a.isActive)
            break
          case 'type':
            result = a.dataType.localeCompare(b.dataType)
            break
        }
        // Tiebreaker: always sort by name
        return result !== 0 ? result : a.key.localeCompare(b.key)
      })
  }, [injectables, searchQuery, statusFilter, sortBy, i18n.language])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE)
  }, [searchQuery, statusFilter, sortBy])

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredInjectables.length) {
          setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, filteredInjectables.length))
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [visibleCount, filteredInjectables.length])

  // Visible items (slice of filtered array)
  const visibleItems = useMemo(
    () => filteredInjectables.slice(0, visibleCount),
    [filteredInjectables, visibleCount]
  )

  function handleToggle(key: string, isActive: boolean) {
    if (isActive) {
      activateMutation.mutate(key)
    } else {
      deactivateMutation.mutate(key)
    }
  }

  function handleSelect(injectable: SystemInjectable) {
    setSelectedKey(injectable.key)
    setSheetOpen(true)
  }

  // Selection mode handlers
  const handleToggleSelectMode = useCallback(() => {
    setSelectMode((prev) => {
      if (prev) {
        // Exiting select mode, clear selection
        setSelectedKeys(new Set())
      }
      return !prev
    })
  }, [])

  const handleSelectChange = useCallback((key: string, selected: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (selected) {
        next.add(key)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedKeys(new Set(filteredInjectables.map((item) => item.key)))
  }, [filteredInjectables])

  const handleSelectNone = useCallback(() => {
    setSelectedKeys(new Set())
  }, [])

  const handleClearSelection = useCallback(() => {
    setSelectMode(false)
    setSelectedKeys(new Set())
  }, [])

  const handleShowBulkResult = useCallback(
    (result: BulkPublicAssignmentsResponse) => {
      // Defensive checks for API response
      const succeededArray = result?.succeeded ?? []
      const failedArray = result?.failed ?? []
      const succeeded = succeededArray.length
      const failed = failedArray.length

      if (failed === 0) {
        toast({
          title: t('systemInjectables.bulk.success', 'Bulk operation completed'),
          description: t('systemInjectables.bulk.successDescription', '{{count}} injectables updated', {
            count: succeeded,
          }),
        })
      } else {
        const failedList = failedArray.map((f) => `${f.key}: ${f.error}`).join('\n')
        toast({
          title: t('systemInjectables.bulk.partialSuccess', 'Operation partially completed'),
          description: `${succeeded} succeeded, ${failed} failed\n${failedList}`,
          variant: 'destructive',
        })
      }
    },
    [t, toast]
  )

  const handleBulkConfirm = useCallback(async () => {
    if (!bulkConfirmAction) return

    const keys = Array.from(selectedKeys)

    try {
      const mutation = bulkConfirmAction === 'make-public'
        ? bulkMakePublicMutation
        : bulkRemovePublicMutation

      const result = await mutation.mutateAsync(keys)
      console.log('Bulk operation result:', result)

      // Close dialog and reset state first
      setBulkConfirmAction(null)
      setSelectMode(false)
      setSelectedKeys(new Set())

      // Then show result toast
      handleShowBulkResult(result)
    } catch (error) {
      // Close dialog on error too
      setBulkConfirmAction(null)

      toast({
        title: t('common.error', 'Error'),
        description: t('systemInjectables.bulk.error', 'Failed to execute bulk operation'),
        variant: 'destructive',
      })
      console.error('Bulk operation error:', error)
    }
  }, [
    bulkConfirmAction,
    selectedKeys,
    bulkMakePublicMutation,
    bulkRemovePublicMutation,
    handleShowBulkResult,
    t,
    toast,
  ])

  // Check if all filtered items are selected
  const allSelected = filteredInjectables.length > 0 && selectedKeys.size === filteredInjectables.length
  const someSelected = selectedKeys.size > 0 && selectedKeys.size < filteredInjectables.length

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: t('systemInjectables.filters.statusAll', 'All'), value: 'all' },
    { label: t('systemInjectables.filters.statusActive', 'Active'), value: 'active' },
    { label: t('systemInjectables.filters.statusInactive', 'Inactive'), value: 'inactive' },
  ]

  const sortOptions: { label: string; value: SortBy }[] = [
    { label: t('systemInjectables.filters.sortName', 'Name'), value: 'name' },
    { label: t('systemInjectables.filters.sortStatus', 'Status'), value: 'status' },
    { label: t('systemInjectables.filters.sortType', 'Type'), value: 'type' },
  ]

  const currentStatusLabel = statusOptions.find((opt) => opt.value === statusFilter)?.label ?? 'All'
  const currentSortLabel = sortOptions.find((opt) => opt.value === sortBy)?.label ?? 'Name'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">
          {t(
            'systemInjectables.description',
            'Manage system-level injectable functions and their availability scopes.'
          )}
        </p>
        {!canManage && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle size={14} />
            {t(
              'systemInjectables.readOnlyWarning',
              'You have read-only access. Only SUPERADMIN can modify settings.'
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        {/* Search */}
        <div className="group relative w-full md:max-w-xs">
          <Search
            className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
            size={18}
          />
          <input
            type="text"
            placeholder={t('systemInjectables.filters.searchPlaceholder', 'Search by name...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-7 pr-4 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-6">
          {/* Select Mode Toggle (SUPERADMIN only) */}
          {canManage && (
            <button
              onClick={handleToggleSelectMode}
              className={cn(
                'flex items-center gap-2 font-mono text-xs uppercase tracking-wider transition-colors',
                selectMode
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SquareCheck size={14} />
              <span>{t('systemInjectables.selectMode', 'Select')}</span>
            </button>
          )}

          {/* Select Mode Controls */}
          <div
            className={cn(
              'flex items-center gap-3 overflow-hidden transition-all duration-300 ease-out',
              selectMode ? 'max-w-[500px] opacity-100' : 'max-w-0 opacity-0'
            )}
          >
            {/* Select All/None */}
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    handleSelectAll()
                  } else {
                    handleSelectNone()
                  }
                }}
                className="h-4 w-4"
              />
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {selectedKeys.size}/{filteredInjectables.length}
              </span>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-1 border-l border-border pl-3">
              <button
                onClick={() => setBulkConfirmAction('make-public')}
                disabled={selectedKeys.size === 0 || isBulkPending}
                className={cn(
                  'flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
                  selectedKeys.size > 0
                    ? 'bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20'
                    : 'text-muted-foreground/50'
                )}
              >
                <Globe size={12} />
                <span className="hidden sm:inline">{t('systemInjectables.bulk.makePublic', 'Make Public')}</span>
              </button>

              <button
                onClick={() => setBulkConfirmAction('remove-public')}
                disabled={selectedKeys.size === 0 || isBulkPending}
                className={cn(
                  'flex items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors',
                  selectedKeys.size > 0
                    ? 'bg-rose-600/10 text-rose-600 hover:bg-rose-600/20'
                    : 'text-muted-foreground/50'
                )}
              >
                <Lock size={12} />
                <span className="hidden sm:inline">{t('systemInjectables.bulk.removePublic', 'Remove Public')}</span>
              </button>

              <button
                onClick={handleClearSelection}
                className="ml-1 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div ref={statusRef} className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>
                {t('systemInjectables.filters.status', 'Status')}: {currentStatusLabel}
              </span>
              <ChevronDown
                size={14}
                className={cn('transition-transform', statusOpen && 'rotate-180')}
              />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] border border-border bg-background shadow-lg">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value)
                      setStatusOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2 text-left font-mono text-xs uppercase tracking-wider transition-colors hover:bg-muted',
                      statusFilter === option.value && 'text-foreground',
                      statusFilter !== option.value && 'text-muted-foreground'
                    )}
                  >
                    <span>{option.label}</span>
                    {statusFilter === option.value && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort */}
          <div ref={sortRef} className="relative">
            <button
              onClick={() => setSortOpen(!sortOpen)}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>
                {t('systemInjectables.filters.sortBy', 'Sort')}: {currentSortLabel}
              </span>
              <ChevronDown
                size={14}
                className={cn('transition-transform', sortOpen && 'rotate-180')}
              />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-[140px] border border-border bg-background shadow-lg">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value)
                      setSortOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2 text-left font-mono text-xs uppercase tracking-wider transition-colors hover:bg-muted',
                      sortBy === option.value && 'text-foreground',
                      sortBy !== option.value && 'text-muted-foreground'
                    )}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-sm border border-border">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border-b border-border p-4 last:border-b-0">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertTriangle size={32} className="mb-3 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {t('systemInjectables.loadError', 'Failed to load system injectables')}
            </p>
          </div>
        )}

        {/* Empty (no data) */}
        {!isLoading && !error && (!injectables || injectables.length === 0) && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Code2 size={32} className="mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t('systemInjectables.empty', 'No system injectables configured')}
            </p>
          </div>
        )}

        {/* Empty (filtered) */}
        {!isLoading &&
          !error &&
          injectables &&
          injectables.length > 0 &&
          filteredInjectables.length === 0 && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Search size={32} className="mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {t('systemInjectables.noResults', 'No injectables match your filters')}
              </p>
            </div>
          )}

        {/* List */}
        {!isLoading && !error && filteredInjectables.length > 0 && (
          <div>
            {visibleItems.map((injectable) => (
              <InjectableCard
                key={injectable.key}
                injectable={injectable}
                onToggle={handleToggle}
                onSelect={handleSelect}
                canManage={canManage}
                isToggling={
                  (activateMutation.isPending &&
                    activateMutation.variables === injectable.key) ||
                  (deactivateMutation.isPending &&
                    deactivateMutation.variables === injectable.key)
                }
                selectable={selectMode}
                selected={selectedKeys.has(injectable.key)}
                onSelectChange={(selected) => handleSelectChange(injectable.key, selected)}
              />
            ))}

            {/* Sentinel for infinite scroll */}
            {visibleCount < filteredInjectables.length && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center border-b border-border p-4"
              >
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {t('systemInjectables.loadingMore', 'Loading more...')}
                </span>
              </div>
            )}

            {/* Results counter */}
            <div className="border-t border-border p-3 text-center">
              <span className="font-mono text-xs text-muted-foreground">
                {t('systemInjectables.showingOf', 'Showing {{visible}} of {{total}}', {
                  visible: visibleItems.length,
                  total: filteredInjectables.length,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <InjectableDetailSheet
        injectable={selectedInjectable}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canManage={canManage}
      />

      {/* Bulk Confirm Dialog */}
      <BulkConfirmDialog
        open={bulkConfirmAction !== null}
        onOpenChange={(open) => !open && setBulkConfirmAction(null)}
        action={bulkConfirmAction}
        selectedKeys={Array.from(selectedKeys)}
        onConfirm={handleBulkConfirm}
        isPending={isBulkPending}
      />
    </div>
  )
}
