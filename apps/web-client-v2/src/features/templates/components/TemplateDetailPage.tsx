import { useState, useMemo } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Plus,
  FolderOpen,
  Calendar,
  Clock,
  FileText,
  Layers,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppContextStore } from '@/stores/app-context-store'
import { useTemplateWithVersions } from '../hooks/useTemplateDetail'
import { VersionListItem } from './VersionListItem'
import { CreateVersionDialog } from './CreateVersionDialog'
import { TagBadge } from './TagBadge'
import { Skeleton } from '@/components/ui/skeleton'

function formatDate(dateString?: string): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TemplateDetailPage() {
  const { templateId } = useParams({
    from: '/workspace/$workspaceId/templates/$templateId',
  })
  const { fromFolderId } = useSearch({
    from: '/workspace/$workspaceId/templates/$templateId',
  })
  const { currentWorkspace } = useAppContextStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const { data: template, isLoading, error } = useTemplateWithVersions(templateId)

  // Sort versions by version number descending (newest first)
  const sortedVersions = useMemo(() => {
    if (!template?.versions) return []
    return [...template.versions].sort((a, b) => b.versionNumber - a.versionNumber)
  }, [template?.versions])

  const handleBackToList = () => {
    if (currentWorkspace && !isExiting) {
      setIsExiting(true)
      // Wait for exit animation to complete
      setTimeout(() => {
        if (fromFolderId) {
          // Volver al folder de origen (si es 'root', no pasar folderId)
          navigate({
            to: '/workspace/$workspaceId/documents',
            params: { workspaceId: currentWorkspace.id } as any,
            search: fromFolderId === 'root' ? undefined : { folderId: fromFolderId } as any,
          })
        } else {
          // Volver a la lista de templates
          navigate({
            to: '/workspace/$workspaceId/templates',
            params: { workspaceId: currentWorkspace.id } as any,
          })
        }
      }, 300)
    }
  }

  const handleOpenEditor = (versionId: string) => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/editor/$versionId',
        params: { workspaceId: currentWorkspace.id, versionId } as any,
      })
    }
  }

  const handleGoToFolder = () => {
    if (!currentWorkspace || !template?.folderId) return
    navigate({
      to: '/workspace/$workspaceId/documents',
      params: { workspaceId: currentWorkspace.id } as any,
      search: { folderId: template.folderId } as any,
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-col bg-background">
        <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-10 w-64" />
        </header>
        <div className="flex-1 px-4 pb-12 md:px-6 lg:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !template) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">
          {t('templates.detail.notFound', 'Template not found')}
        </p>
        <button
          onClick={handleBackToList}
          className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
        >
          {fromFolderId
            ? t('templates.detail.backToFolder', 'Back to Folder')
            : t('templates.detail.backToList', 'Back to Templates')}
        </button>
      </div>
    )
  }

  return (
    <motion.div
      className="flex h-full flex-1 flex-col bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Header */}
      <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
        {/* Breadcrumb */}
        <button
          onClick={handleBackToList}
          className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          {fromFolderId
            ? t('templates.detail.backToFolder', 'Back to Folder')
            : t('templates.detail.backToList', 'Back to Templates')}
        </button>

        {/* Title */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('templates.detail.header', 'Template Details')}
            </div>
            <h1 className="font-display text-3xl font-light leading-tight tracking-tight text-foreground md:text-4xl">
              {template.title}
            </h1>
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="group flex h-12 items-center gap-2 rounded-none bg-foreground px-6 text-sm font-medium tracking-wide text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90"
          >
            <Plus size={20} />
            <span>{t('templates.detail.createVersion', 'Create New Version')}</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-12 md:px-6 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
          {/* Left Panel: Template Info */}
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="border border-border bg-background p-6">
              <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('templates.detail.metadata', 'Metadata')}
              </h2>

              <dl className="space-y-4">
                {/* Folder */}
                {template.folder && (
                  <div>
                    <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FolderOpen size={12} />
                      {t('templates.detail.folder', 'Folder')}
                    </dt>
                    <dd>
                      <button
                        onClick={handleGoToFolder}
                        className="text-sm text-foreground underline-offset-2 hover:underline"
                      >
                        {template.folder.name}
                      </button>
                    </dd>
                  </div>
                )}

                {/* Created */}
                <div>
                  <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    {t('templates.detail.createdAt', 'Created')}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {formatDate(template.createdAt)}
                  </dd>
                </div>

                {/* Last Updated */}
                <div>
                  <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12} />
                    {t('templates.detail.updatedAt', 'Last Updated')}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {formatDate(template.updatedAt)}
                  </dd>
                </div>

                {/* Version Count */}
                <div>
                  <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Layers size={12} />
                    {t('templates.detail.versionsCount', 'Versions')}
                  </dt>
                  <dd className="text-sm text-foreground">
                    {template.versions?.length ?? 0}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Tags Card */}
            <div className="border border-border bg-background p-6">
              <h2 className="mb-4 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('templates.detail.tags', 'Tags')}
              </h2>

              {template.tags && template.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag.name} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('templates.detail.noTags', 'No tags')}
                </p>
              )}
            </div>
          </div>

          {/* Right Panel: Version History */}
          <div className="border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {t('templates.detail.versionsSection', 'Version History')}
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground">
                {t('templates.detail.versionsTotal', '{{count}} version(s)', {
                  count: template.versions?.length ?? 0,
                })}
              </span>
            </div>

            {sortedVersions.length > 0 ? (
              <div className="divide-y divide-border">
                {sortedVersions.map((version) => (
                  <VersionListItem
                    key={version.id}
                    version={version}
                    onOpenEditor={handleOpenEditor}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText size={32} className="mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t('templates.detail.noVersions', 'No versions yet')}
                </p>
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="mt-4 text-sm text-foreground underline underline-offset-4 hover:no-underline"
                >
                  {t('templates.detail.createFirstVersion', 'Create first version')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Version Dialog */}
      <CreateVersionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        templateId={templateId}
      />
    </motion.div>
  )
}
