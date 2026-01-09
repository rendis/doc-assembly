import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import {
  ArrowLeft,
  Plus,
  FolderOpen,
  Calendar,
  Clock,
  FileText,
  Layers,
  Pencil,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppContextStore } from '@/stores/app-context-store'
import { usePageTransitionStore } from '@/stores/page-transition-store'
import { useSandboxMode } from '@/stores/sandbox-mode-store'
import { useVersionHighlightStore } from '@/stores/version-highlight-store'
import {
  useTemplateWithVersions,
  usePublishVersion,
  useSchedulePublishVersion,
  useCancelSchedule,
  useArchiveVersion,
} from '../hooks/useTemplateDetail'
import { useUpdateTemplate } from '../hooks/useTemplates'
import { VersionListItem } from './VersionListItem'
import { CreateVersionDialog } from './CreateVersionDialog'
import { PublishVersionDialog } from './PublishVersionDialog'
import { SchedulePublishDialog } from './SchedulePublishDialog'
import { PromoteVersionDialog } from './PromoteVersionDialog'
import { ValidationErrorsDialog, type ValidationResponse } from './ValidationErrorsDialog'
import { EditTagsDialog } from './EditTagsDialog'
import { DeleteVersionDialog } from './DeleteVersionDialog'
import { EditableTitle } from './EditableTitle'
import { TagBadge } from './TagBadge'
import { Skeleton } from '@/components/ui/skeleton'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import type { PromoteVersionResponse } from '../api/templates-api'

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
  const [editTagsDialogOpen, setEditTagsDialogOpen] = useState(false)
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationResponse | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersionSummaryResponse | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [versionToDelete, setVersionToDelete] = useState<TemplateVersionSummaryResponse | null>(null)

  // Sandbox mode and highlight
  const { isSandboxActive, disableSandbox } = useSandboxMode()
  const { highlightedVersionId, setHighlightedVersionId, clearHighlight } = useVersionHighlightStore()

  // Template update mutation
  const updateTemplate = useUpdateTemplate()

  // Version action mutations
  const publishVersion = usePublishVersion(templateId)
  const schedulePublishVersion = useSchedulePublishVersion(templateId)
  const cancelSchedule = useCancelSchedule(templateId)
  const archiveVersion = useArchiveVersion(templateId)

  const handleTitleSave = async (newTitle: string) => {
    await updateTemplate.mutateAsync({
      templateId,
      data: { title: newTitle },
    })
  }

  // Page transition state
  const { isTransitioning, direction, startTransition, endTransition } = usePageTransitionStore()
  const [isVisible, setIsVisible] = useState(direction !== 'forward')
  const [_isExiting, setIsExiting] = useState(false)

  // Handle entering animation (coming from list)
  useEffect(() => {
    if (direction === 'forward') {
      // Small delay before starting fade in
      const timer = setTimeout(() => {
        setIsVisible(true)
        endTransition()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [direction, endTransition])

  // Clear highlight after 5 seconds
  useEffect(() => {
    if (highlightedVersionId) {
      console.log('[Highlight] Active highlight ID:', highlightedVersionId)
      console.log('[Highlight] Available versions:', sortedVersions.map(v => v.id))
      const timer = setTimeout(() => {
        console.log('[Highlight] Clearing highlight')
        clearHighlight()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [highlightedVersionId, clearHighlight, sortedVersions])

  const { data: template, isLoading, error } = useTemplateWithVersions(templateId)

  // Check if we have cached data (to avoid skeleton flash)
  const hasCachedData = !!template

  // Sort versions by version number descending (newest first)
  const versions = template?.versions
  const sortedVersions = useMemo(() => {
    if (!versions) return []
    return [...versions].sort((a, b) => b.versionNumber - a.versionNumber)
  }, [versions])

  const handleBackToList = () => {
    if (currentWorkspace && !isTransitioning) {
      startTransition('backward')
      setIsExiting(true)
      setIsVisible(false)
      // Wait for exit animation to complete before navigating
      setTimeout(() => {
        if (fromFolderId) {
          // Volver al folder de origen (si es 'root', no pasar folderId)
          navigate({
            to: '/workspace/$workspaceId/documents',
            /* eslint-disable @typescript-eslint/no-explicit-any -- TanStack Router type limitation */
            params: { workspaceId: currentWorkspace.id } as any,
            search: fromFolderId === 'root' ? undefined : { folderId: fromFolderId } as any,
            /* eslint-enable @typescript-eslint/no-explicit-any */
          })
        } else {
          // Volver a la lista de templates
          navigate({
            to: '/workspace/$workspaceId/templates',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
            params: { workspaceId: currentWorkspace.id } as any,
          })
        }
      }, 300)
    }
  }

  const handleOpenEditor = (versionId: string) => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/editor/$templateId/version/$versionId',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
        params: { workspaceId: currentWorkspace.id, templateId, versionId } as any,
      })
    }
  }

  const handleGoToFolder = () => {
    if (!currentWorkspace || !template?.folderId) return
    navigate({
      to: '/workspace/$workspaceId/documents',
      /* eslint-disable @typescript-eslint/no-explicit-any -- TanStack Router type limitation */
      params: { workspaceId: currentWorkspace.id } as any,
      search: { folderId: template.folderId } as any,
      /* eslint-enable @typescript-eslint/no-explicit-any */
    })
  }

  // Version action handlers
  const handlePublishClick = (version: TemplateVersionSummaryResponse) => {
    setSelectedVersion(version)
    setPublishDialogOpen(true)
  }

  const handleScheduleClick = (version: TemplateVersionSummaryResponse) => {
    setSelectedVersion(version)
    setScheduleDialogOpen(true)
  }

  const handlePublishConfirm = async () => {
    if (!selectedVersion) return
    try {
      await publishVersion.mutateAsync(selectedVersion.id)
      setPublishDialogOpen(false)
      setSelectedVersion(null)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const validation = error.response.data?.validation as ValidationResponse | undefined
        if (validation) {
          setValidationErrors(validation)
          setPublishDialogOpen(false)
          setValidationDialogOpen(true)
          return
        }
      }
      throw error
    }
  }

  const handleScheduleConfirm = async (publishAt: string) => {
    if (!selectedVersion) return
    await schedulePublishVersion.mutateAsync({
      versionId: selectedVersion.id,
      publishAt,
    })
    setScheduleDialogOpen(false)
    setSelectedVersion(null)
  }

  const handleCancelSchedule = async (version: TemplateVersionSummaryResponse) => {
    await cancelSchedule.mutateAsync(version.id)
  }

  const handleArchive = async (version: TemplateVersionSummaryResponse) => {
    await archiveVersion.mutateAsync(version.id)
  }

  const handleDelete = (version: TemplateVersionSummaryResponse) => {
    setVersionToDelete(version)
    setDeleteDialogOpen(true)
  }

  const handlePromoteClick = (version: TemplateVersionSummaryResponse) => {
    setSelectedVersion(version)
    setPromoteDialogOpen(true)
  }

  const handlePromoteSuccess = (response: PromoteVersionResponse) => {
    disableSandbox()
    setHighlightedVersionId(response.version.id)
    setPromoteDialogOpen(false)
    setSelectedVersion(null)

    // Debug: log the promoted version ID
    console.log('[Promote] Version promoted, highlighting:', response.version.id)

    // If promoted as new template, navigate to it
    if (response.template && currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/templates/$templateId',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
        params: { workspaceId: currentWorkspace.id, templateId: response.template.id } as any,
      })
    } else if (response.version.templateId !== templateId && currentWorkspace) {
      // If promoted to different existing template, navigate to it
      navigate({
        to: '/workspace/$workspaceId/templates/$templateId',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
        params: { workspaceId: currentWorkspace.id, templateId: response.version.templateId } as any,
      })
    }
    // If promoted to current template, we stay here and the list will refresh
  }

  // Loading state - only show skeleton if no cached data
  // Use same animation as main content to avoid flicker
  if (isLoading && !hasCachedData) {
    return (
      <motion.div
        className="flex h-full flex-1 flex-col bg-background"
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
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
      </motion.div>
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
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
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
          <div className="min-w-0 flex-1">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('templates.detail.header', 'Template Details')}
            </div>
            <EditableTitle
              value={template.title}
              onSave={handleTitleSave}
              isLoading={updateTemplate.isPending}
              className="font-display text-3xl font-light leading-tight tracking-tight text-foreground md:text-4xl"
            />
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
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {t('templates.detail.tags', 'Tags')}
                </h2>
                <button
                  onClick={() => setEditTagsDialogOpen(true)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  title={t('templates.detail.editTags', 'Edit tags')}
                >
                  <Pencil size={14} />
                </button>
              </div>

              {template.tags && template.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {template.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} />
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
                    onPublish={handlePublishClick}
                    onSchedule={handleScheduleClick}
                    onCancelSchedule={handleCancelSchedule}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                    onPromote={handlePromoteClick}
                    isSandboxMode={isSandboxActive}
                    isHighlighted={version.id === highlightedVersionId}
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

      {/* Edit Tags Dialog */}
      <EditTagsDialog
        open={editTagsDialogOpen}
        onOpenChange={setEditTagsDialogOpen}
        templateId={templateId}
        currentTags={template.tags ?? []}
      />

      {/* Publish Version Dialog */}
      <PublishVersionDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        version={selectedVersion}
        onConfirm={handlePublishConfirm}
        isLoading={publishVersion.isPending}
      />

      {/* Schedule Publish Dialog */}
      <SchedulePublishDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        version={selectedVersion}
        onConfirm={handleScheduleConfirm}
        isLoading={schedulePublishVersion.isPending}
      />

      {/* Validation Errors Dialog */}
      <ValidationErrorsDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        validation={validationErrors}
        onOpenEditor={
          selectedVersion
            ? () => handleOpenEditor(selectedVersion.id)
            : undefined
        }
      />

      {/* Delete Version Dialog */}
      <DeleteVersionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        version={versionToDelete}
        templateId={templateId}
      />

      {/* Promote Version Dialog */}
      <PromoteVersionDialog
        open={promoteDialogOpen}
        onOpenChange={setPromoteDialogOpen}
        version={selectedVersion}
        templateId={templateId}
        onSuccess={handlePromoteSuccess}
      />
    </motion.div>
  )
}
