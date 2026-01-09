import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { useAppContextStore } from '@/stores/app-context-store'
import { usePageTransitionStore } from '@/stores/page-transition-store'
import { useSandboxMode } from '@/stores/sandbox-mode-store'
import { useVersionHighlightStore } from '@/stores/version-highlight-store'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import axios from 'axios'
import { motion } from 'framer-motion'
import {
    ArrowLeft,
    Calendar,
    Clock,
    FileText,
    FolderOpen,
    Layers,
    Pencil,
    Plus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PromoteVersionResponse } from '../api/templates-api'
import {
    usePublishVersion,
    useSchedulePublishVersion,
    useTemplateWithVersions,
} from '../hooks/useTemplateDetail'
import { useUpdateTemplate } from '../hooks/useTemplates'
import { ArchiveVersionDialog } from './ArchiveVersionDialog'
import { CancelScheduleDialog } from './CancelScheduleDialog'
import { CloneVersionDialog } from './CloneVersionDialog'
import { CreateVersionDialog } from './CreateVersionDialog'
import { DeleteVersionDialog } from './DeleteVersionDialog'
import { EditableTitle } from './EditableTitle'
import { EditTagsDialog } from './EditTagsDialog'
import { PromoteVersionDialog } from './PromoteVersionDialog'
import { PublishVersionDialog } from './PublishVersionDialog'
import { SchedulePublishDialog } from './SchedulePublishDialog'
import { TagBadge } from './TagBadge'
import { ValidationErrorsDialog, type ValidationResponse } from './ValidationErrorsDialog'
import { VersionListItem } from './VersionListItem'

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
  const { toast } = useToast()
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
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [versionToArchive, setVersionToArchive] = useState<TemplateVersionSummaryResponse | null>(null)
  const [cancelScheduleDialogOpen, setCancelScheduleDialogOpen] = useState(false)
  const [versionToCancelSchedule, setVersionToCancelSchedule] = useState<TemplateVersionSummaryResponse | null>(null)
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false)
  const [versionToClone, setVersionToClone] = useState<TemplateVersionSummaryResponse | null>(null)

  // Sandbox mode and highlight
  const { isSandboxActive, disableSandbox } = useSandboxMode()
  const { highlightedTemplateId, highlightedVersionNumber, setHighlightedVersion, clearHighlight } =
    useVersionHighlightStore()

  // Template update mutation
  const updateTemplate = useUpdateTemplate()

  // Version action mutations
  const publishVersion = usePublishVersion(templateId)
  const schedulePublishVersion = useSchedulePublishVersion(templateId)

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

  // Clear highlight after 5 seconds (only if this is the target template)
  useEffect(() => {
    if (highlightedTemplateId === templateId && highlightedVersionNumber !== null) {
      const timer = setTimeout(() => {
        clearHighlight()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [highlightedTemplateId, highlightedVersionNumber, templateId, clearHighlight])

  const { data: template, isLoading, error } = useTemplateWithVersions(templateId)

  // Check if we have cached data (to avoid skeleton flash)
  const hasCachedData = !!template

  // Sort versions according to business rules:
  // 1. Published version first
  // 2. Scheduled versions (by scheduledPublishAt ascending)
  // 3. Draft versions (by updatedAt descending)
  // 4. Archived versions (by updatedAt descending)
  const versions = template?.versions
  const sortedVersions = useMemo(() => {
    if (!versions || versions.length === 0) return []
    
    // Helper function to get sort date for drafts and archived
    const getSortDate = (version: typeof versions[0]): number => {
      if (version.updatedAt) {
        return new Date(version.updatedAt).getTime()
      }
      // Fallback to createdAt if updatedAt is not available
      return new Date(version.createdAt).getTime()
    }
    
    // Separate versions by status
    const published: typeof versions = []
    const scheduled: typeof versions = []
    const drafts: typeof versions = []
    const archived: typeof versions = []
    
    for (const version of versions) {
      if (version.status === 'PUBLISHED') {
        published.push(version)
      } else if (version.status === 'SCHEDULED') {
        scheduled.push(version)
      } else if (version.status === 'DRAFT') {
        drafts.push(version)
      } else if (version.status === 'ARCHIVED') {
        archived.push(version)
      }
    }
    
    // Sort scheduled by scheduledPublishAt ascending (earliest first)
    scheduled.sort((a, b) => {
      if (!a.scheduledPublishAt && !b.scheduledPublishAt) return 0
      if (!a.scheduledPublishAt) return 1 // Versions without scheduledPublishAt go to end
      if (!b.scheduledPublishAt) return -1
      const dateA = new Date(a.scheduledPublishAt).getTime()
      const dateB = new Date(b.scheduledPublishAt).getTime()
      if (isNaN(dateA) || isNaN(dateB)) return 0
      return dateA - dateB
    })
    
    // Sort drafts by updatedAt descending (most recent first)
    drafts.sort((a, b) => {
      const dateA = getSortDate(a)
      const dateB = getSortDate(b)
      if (isNaN(dateA) || isNaN(dateB)) return 0
      return dateB - dateA
    })
    
    // Sort archived by updatedAt descending (most recent first)
    archived.sort((a, b) => {
      const dateA = getSortDate(a)
      const dateB = getSortDate(b)
      if (isNaN(dateA) || isNaN(dateB)) return 0
      return dateB - dateA
    })
    
    // Concatenate in the required order
    return [...published, ...scheduled, ...drafts, ...archived]
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
    try {
      await schedulePublishVersion.mutateAsync({
        versionId: selectedVersion.id,
        publishAt,
      })
      setScheduleDialogOpen(false)
      setSelectedVersion(null)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const errorData = error.response.data as { error?: string }
        if (errorData.error === 'another version is already scheduled at this time') {
          toast({
            variant: 'destructive',
            title: t('templates.scheduleDialog.error.conflictTitle', 'Scheduling Conflict'),
            description: t('templates.scheduleDialog.error.conflictDescription', 'Another version is already scheduled at this time.'),
          })
          return
        }
      }
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        const validation = error.response.data?.validation as ValidationResponse | undefined
        if (validation) {
          setValidationErrors(validation)
          setScheduleDialogOpen(false)
          setValidationDialogOpen(true)
          return
        }
      }
      throw error
    }
  }

  const handleCancelSchedule = (version: TemplateVersionSummaryResponse) => {
    setVersionToCancelSchedule(version)
    setCancelScheduleDialogOpen(true)
  }

  const handleArchive = (version: TemplateVersionSummaryResponse) => {
    setVersionToArchive(version)
    setArchiveDialogOpen(true)
  }

  const handleDelete = (version: TemplateVersionSummaryResponse) => {
    setVersionToDelete(version)
    setDeleteDialogOpen(true)
  }

  const handlePromoteClick = (version: TemplateVersionSummaryResponse) => {
    setSelectedVersion(version)
    setPromoteDialogOpen(true)
  }

  const handleCloneClick = (version: TemplateVersionSummaryResponse) => {
    setVersionToClone(version)
    setCloneDialogOpen(true)
  }

  const handlePromoteSuccess = (response: PromoteVersionResponse) => {
    disableSandbox()
    setPromoteDialogOpen(false)
    setSelectedVersion(null)

    // Get the target template ID and set highlight
    const targetTemplateId = response.template?.id ?? response.version.templateId
    setHighlightedVersion(targetTemplateId, response.version.versionNumber)

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
                    onClone={handleCloneClick}
                    isSandboxMode={isSandboxActive}
                    isHighlighted={
                      highlightedTemplateId === templateId &&
                      version.versionNumber === highlightedVersionNumber
                    }
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

      {/* Archive Version Dialog */}
      <ArchiveVersionDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        version={versionToArchive}
        templateId={templateId}
      />

      {/* Cancel Schedule Dialog */}
      <CancelScheduleDialog
        open={cancelScheduleDialogOpen}
        onOpenChange={setCancelScheduleDialogOpen}
        version={versionToCancelSchedule}
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

      {/* Clone Version Dialog */}
      <CloneVersionDialog
        open={cloneDialogOpen}
        onOpenChange={setCloneDialogOpen}
        templateId={templateId}
        sourceVersion={versionToClone}
      />
    </motion.div>
  )
}
