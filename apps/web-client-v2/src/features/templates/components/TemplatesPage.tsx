import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAppContextStore } from '@/stores/app-context-store'
import { TemplatesToolbar } from './TemplatesToolbar'
import { TemplateListRow } from './TemplateListRow'
import { CreateTemplateDialog } from './CreateTemplateDialog'
import { useTemplates } from '../hooks/useTemplates'
import { useTags } from '../hooks/useTags'
import { Skeleton } from '@/components/ui/skeleton'

const PAGE_SIZE = 20

export function TemplatesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  // Search with debounce
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(
    undefined
  )
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  // Pagination
  const [page, setPage] = useState(0)

  // Create dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Reset page when filters change
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch, statusFilter, selectedTagIds])

  // Fetch tags
  const { data: tagsData } = useTags()

  // Fetch templates
  const { data, isLoading } = useTemplates({
    search: debouncedSearch || undefined,
    hasPublishedVersion: statusFilter,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const templates = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Pagination info
  const paginationInfo = useMemo(() => {
    if (total === 0) return t('templates.noTemplates', 'No templates found')
    const start = page * PAGE_SIZE + 1
    const end = Math.min((page + 1) * PAGE_SIZE, total)
    return t('templates.showing', 'Showing {{start}}-{{end}} of {{total}} templates', {
      start,
      end,
      total,
    })
  }, [page, total, t])

  const handleEditTemplate = (templateId: string) => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/editor/$versionId',
        params: { workspaceId: currentWorkspace.id, versionId: templateId },
      })
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('templates.header', 'Management')}
            </div>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {t('templates.title', 'Template List')}
            </h1>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="group flex h-12 items-center gap-2 rounded-none bg-foreground px-6 text-sm font-medium tracking-wide text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90"
          >
            <Plus size={20} />
            <span>{t('templates.createNew', 'CREATE NEW TEMPLATE')}</span>
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <TemplatesToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        tags={tagsData?.data ?? []}
        selectedTagIds={selectedTagIds}
        onTagsChange={setSelectedTagIds}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 md:px-6 lg:px-6">
        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4 pt-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg text-muted-foreground">
              {t('templates.noTemplates', 'No templates found')}
            </p>
            {(debouncedSearch || statusFilter !== undefined || selectedTagIds.length > 0) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setStatusFilter(undefined)
                  setSelectedTagIds([])
                }}
                className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
              >
                {t('templates.clearFilters', 'Clear filters')}
              </button>
            )}
          </div>
        )}

        {/* Table */}
        {!isLoading && templates.length > 0 && (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-background">
              <tr>
                <th className="w-[40%] border-b border-border py-4 pl-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.name', 'Template Name')}
                </th>
                <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.versions', 'Versions')}
                </th>
                <th className="w-[15%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.status', 'Status')}
                </th>
                <th className="w-[20%] border-b border-border py-4 font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.lastModified', 'Last Modified')}
                </th>
                <th className="w-[10%] border-b border-border py-4 pr-4 text-right font-mono text-[10px] font-normal uppercase tracking-widest text-muted-foreground">
                  {t('templates.columns.action', 'Action')}
                </th>
              </tr>
            </thead>
            <tbody className="font-light">
              {templates.map((template) => (
                <TemplateListRow
                  key={template.id}
                  template={template}
                  onClick={() => handleEditTemplate(template.id)}
                />
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between py-8">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {paginationInfo}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Template Dialog */}
      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
