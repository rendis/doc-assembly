import { useState, useCallback } from 'react';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';
import { versionsApi } from '../api/versions-api';
import {
  validateForPublish,
  validateTransition,
  canTransition,
  hasScheduledAction,
  canDelete,
  canClone,
  type TransitionValidation,
} from '../state-machine';
import type { TemplateVersionDetail, VersionStatus } from '../types';

interface UseVersionActionsState {
  isLoading: boolean;
  error: string | null;
}

interface UseVersionActionsReturn extends UseVersionActionsState {
  // Permission checks
  canPublish: boolean;
  canArchive: boolean;
  canCreateVersion: boolean;
  canDeleteDraft: boolean;

  // Validation
  validateForPublish: (version: TemplateVersionDetail) => TransitionValidation;
  validateTransition: (version: TemplateVersionDetail, to: VersionStatus) => TransitionValidation;

  // State helpers
  canTransition: (from: VersionStatus, to: VersionStatus) => boolean;
  hasScheduledAction: (version: TemplateVersionDetail) => boolean;
  canDelete: (version: TemplateVersionDetail) => boolean;
  canClone: (version: TemplateVersionDetail) => boolean;

  // Actions
  publish: (templateId: string, versionId: string) => Promise<void>;
  archive: (templateId: string, versionId: string) => Promise<void>;
  schedulePublish: (templateId: string, versionId: string, scheduledAt: string) => Promise<void>;
  scheduleArchive: (templateId: string, versionId: string, scheduledAt: string) => Promise<void>;
  cancelSchedule: (templateId: string, versionId: string) => Promise<void>;
  deleteVersion: (templateId: string, versionId: string) => Promise<void>;
  createFromExisting: (
    templateId: string,
    sourceVersionId: string,
    name: string,
    description?: string
  ) => Promise<void>;

  // State management
  clearError: () => void;
}

export function useVersionActions(): UseVersionActionsReturn {
  const { can } = usePermission();
  const [state, setState] = useState<UseVersionActionsState>({
    isLoading: false,
    error: null,
  });

  // Permission checks
  const canPublish = can(Permission.VERSION_PUBLISH);
  const canArchive = can(Permission.VERSION_PUBLISH); // Same permission for archive
  const canCreateVersion = can(Permission.VERSION_CREATE);
  const canDeleteDraft = can(Permission.VERSION_DELETE_DRAFT);

  const setLoading = (isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error }));
  };

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Action: Publish version
  const publish = useCallback(
    async (templateId: string, versionId: string) => {
      if (!canPublish) {
        setError('Permission denied');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await versionsApi.publish(templateId, versionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to publish version';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canPublish]
  );

  // Action: Archive version
  const archive = useCallback(
    async (templateId: string, versionId: string) => {
      if (!canArchive) {
        setError('Permission denied');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await versionsApi.archive(templateId, versionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to archive version';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canArchive]
  );

  // Action: Schedule publish
  const schedulePublish = useCallback(
    async (templateId: string, versionId: string, scheduledAt: string) => {
      if (!canPublish) {
        setError('Permission denied');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await versionsApi.schedulePublish(templateId, versionId, { scheduledAt });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to schedule publish';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canPublish]
  );

  // Action: Schedule archive
  const scheduleArchive = useCallback(
    async (templateId: string, versionId: string, scheduledAt: string) => {
      if (!canArchive) {
        setError('Permission denied');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await versionsApi.scheduleArchive(templateId, versionId, { scheduledAt });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to schedule archive';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canArchive]
  );

  // Action: Cancel schedule
  const cancelSchedule = useCallback(
    async (templateId: string, versionId: string) => {
      if (!canPublish) {
        setError('Permission denied');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await versionsApi.cancelSchedule(templateId, versionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to cancel schedule';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canPublish]
  );

  // Action: Delete version
  const deleteVersion = useCallback(
    async (templateId: string, versionId: string) => {
      if (!canDeleteDraft) {
        setError('Permission denied');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await versionsApi.delete(templateId, versionId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete version';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canDeleteDraft]
  );

  // Action: Create from existing (clone)
  const createFromExisting = useCallback(
    async (templateId: string, sourceVersionId: string, name: string, description?: string) => {
      if (!canCreateVersion) {
        setError('Permission denied');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await versionsApi.createFromExisting(templateId, {
          sourceVersionId,
          name,
          description,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create version';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [canCreateVersion]
  );

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,

    // Permission checks
    canPublish,
    canArchive,
    canCreateVersion,
    canDeleteDraft,

    // Validation (re-exported from state machine)
    validateForPublish,
    validateTransition,

    // State helpers (re-exported from state machine)
    canTransition,
    hasScheduledAction,
    canDelete,
    canClone,

    // Actions
    publish,
    archive,
    schedulePublish,
    scheduleArchive,
    cancelSchedule,
    deleteVersion,
    createFromExisting,

    // State management
    clearError,
  };
}
