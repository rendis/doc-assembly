import { useState } from 'react';
import { MoreHorizontal, Send, Archive, CalendarClock, CalendarX, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import { Permission } from '@/features/auth/rbac/rules';
import { useVersionActions } from '../../hooks/useVersionActions';
import {
  hasScheduledAction,
  getScheduledActionType,
  getScheduledDate,
  canDelete as canDeleteVersion,
  canClone as canCloneVersion,
  validateForPublish,
} from '../../state-machine';
import { PublishConfirmDialog } from './PublishConfirmDialog';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { ScheduleDialog } from './ScheduleDialog';
import { CancelScheduleDialog } from './CancelScheduleDialog';
import type { TemplateVersion } from '../../types';

interface VersionActionsMenuProps {
  version: TemplateVersion;
  templateId: string;
  onActionComplete: () => void;
}

type DialogType =
  | 'publish'
  | 'archive'
  | 'schedulePublish'
  | 'scheduleArchive'
  | 'cancelSchedule'
  | 'clone'
  | 'delete'
  | null;

export function VersionActionsMenu({
  version,
  templateId,
  onActionComplete,
}: VersionActionsMenuProps) {
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<DialogType>(null);
  const {
    publish,
    archive,
    schedulePublish,
    scheduleArchive,
    cancelSchedule,
    deleteVersion,
    createFromExisting,
    canDeleteDraft,
    canCreateVersion,
  } = useVersionActions();

  const isScheduled = hasScheduledAction(version);
  const scheduledType = getScheduledActionType(version);
  const scheduledDate = getScheduledDate(version);
  const canDelete = canDeleteVersion(version);
  const canClone = canCloneVersion(version);

  const handlePublish = async () => {
    await publish(templateId, version.id);
    setOpenDialog(null);
    onActionComplete();
  };

  const handleArchive = async () => {
    await archive(templateId, version.id);
    setOpenDialog(null);
    onActionComplete();
  };

  const handleSchedulePublish = async (scheduledAt: string) => {
    await schedulePublish(templateId, version.id, scheduledAt);
    setOpenDialog(null);
    onActionComplete();
  };

  const handleScheduleArchive = async (scheduledAt: string) => {
    await scheduleArchive(templateId, version.id, scheduledAt);
    setOpenDialog(null);
    onActionComplete();
  };

  const handleCancelSchedule = async () => {
    await cancelSchedule(templateId, version.id);
    setOpenDialog(null);
    onActionComplete();
  };

  const handleDelete = async () => {
    await deleteVersion(templateId, version.id);
    setOpenDialog(null);
    onActionComplete();
  };

  const handleClone = async () => {
    const newName = `${version.name} (copy)`;
    await createFromExisting(templateId, version.id, newName);
    setOpenDialog(null);
    onActionComplete();
  };

  const versionName = `v${version.versionNumber}`;
  const publishValidation = validateForPublish(version);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="
              p-1.5 rounded-md
              hover:bg-muted transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
            "
            aria-label={t('common.actions')}
          >
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          {/* DRAFT actions */}
          {version.status === 'DRAFT' && (
            <>
              {!isScheduled && (
                <PermissionGuard permission={Permission.VERSION_PUBLISH}>
                  <DropdownMenuItem
                    onClick={() => setOpenDialog('publish')}
                    className="cursor-pointer"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {t('templates.versionActions.publish')}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setOpenDialog('schedulePublish')}
                    className="cursor-pointer"
                  >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    {t('templates.versionActions.schedulePublish')}
                  </DropdownMenuItem>
                </PermissionGuard>
              )}

              {isScheduled && scheduledType === 'publish' && (
                <PermissionGuard permission={Permission.VERSION_PUBLISH}>
                  <DropdownMenuItem
                    onClick={() => setOpenDialog('cancelSchedule')}
                    className="cursor-pointer text-warning"
                  >
                    <CalendarX className="w-4 h-4 mr-2" />
                    {t('templates.versionActions.cancelSchedule')}
                  </DropdownMenuItem>
                </PermissionGuard>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <PermissionGuard permission={Permission.VERSION_DELETE_DRAFT}>
                    <DropdownMenuItem
                      onClick={() => setOpenDialog('delete')}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('templates.versionActions.delete')}
                    </DropdownMenuItem>
                  </PermissionGuard>
                </>
              )}
            </>
          )}

          {/* PUBLISHED actions */}
          {version.status === 'PUBLISHED' && (
            <>
              {!isScheduled && (
                <PermissionGuard permission={Permission.VERSION_PUBLISH}>
                  <DropdownMenuItem
                    onClick={() => setOpenDialog('archive')}
                    className="cursor-pointer"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    {t('templates.versionActions.archive')}
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setOpenDialog('scheduleArchive')}
                    className="cursor-pointer"
                  >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    {t('templates.versionActions.scheduleArchive')}
                  </DropdownMenuItem>
                </PermissionGuard>
              )}

              {isScheduled && scheduledType === 'archive' && (
                <PermissionGuard permission={Permission.VERSION_PUBLISH}>
                  <DropdownMenuItem
                    onClick={() => setOpenDialog('cancelSchedule')}
                    className="cursor-pointer text-warning"
                  >
                    <CalendarX className="w-4 h-4 mr-2" />
                    {t('templates.versionActions.cancelSchedule')}
                  </DropdownMenuItem>
                </PermissionGuard>
              )}

              {canClone && canCreateVersion && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleClone} className="cursor-pointer">
                    <Copy className="w-4 h-4 mr-2" />
                    {t('templates.versionActions.createFromThis')}
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}

          {/* ARCHIVED actions */}
          {version.status === 'ARCHIVED' && canClone && canCreateVersion && (
            <DropdownMenuItem onClick={handleClone} className="cursor-pointer">
              <Copy className="w-4 h-4 mr-2" />
              {t('templates.versionActions.createFromThis')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogs */}
      <PublishConfirmDialog
        isOpen={openDialog === 'publish'}
        versionName={versionName}
        validation={publishValidation}
        onConfirm={handlePublish}
        onCancel={() => setOpenDialog(null)}
      />

      <ArchiveConfirmDialog
        isOpen={openDialog === 'archive'}
        versionName={versionName}
        onConfirm={handleArchive}
        onCancel={() => setOpenDialog(null)}
      />

      <ScheduleDialog
        isOpen={openDialog === 'schedulePublish'}
        type="publish"
        versionName={versionName}
        onSchedule={handleSchedulePublish}
        onCancel={() => setOpenDialog(null)}
      />

      <ScheduleDialog
        isOpen={openDialog === 'scheduleArchive'}
        type="archive"
        versionName={versionName}
        onSchedule={handleScheduleArchive}
        onCancel={() => setOpenDialog(null)}
      />

      {isScheduled && scheduledType && scheduledDate && (
        <CancelScheduleDialog
          isOpen={openDialog === 'cancelSchedule'}
          actionType={scheduledType}
          versionName={versionName}
          scheduledDate={scheduledDate}
          onConfirm={handleCancelSchedule}
          onCancel={() => setOpenDialog(null)}
        />
      )}

      {/* Delete confirmation - reusing ArchiveConfirmDialog pattern */}
      {canDelete && canDeleteDraft && (
        <DeleteConfirmDialog
          isOpen={openDialog === 'delete'}
          versionName={versionName}
          onConfirm={handleDelete}
          onCancel={() => setOpenDialog(null)}
        />
      )}
    </>
  );
}

// Simple delete confirmation dialog
function DeleteConfirmDialog({
  isOpen,
  versionName,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  versionName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      console.error('Failed to delete version:', err);
      setError(t('templates.delete.error'));
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm bg-background rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold">{t('templates.delete.title')}</h2>
            </div>
          </div>

          <div className="px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {t('templates.delete.confirmMessage', { version: versionName })}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-muted/30">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              {t('templates.delete.button')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
