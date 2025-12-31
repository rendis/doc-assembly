import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { workspaceApi } from '@/features/workspaces/api/workspace-api';
import type { Workspace } from '@/features/workspaces/types';
import { Plus, X, Loader2 } from 'lucide-react';

interface CreateWorkspaceDialogProps {
  onWorkspaceCreated: (workspace: Workspace) => void;
}

export const CreateWorkspaceDialog = ({ onWorkspaceCreated }: CreateWorkspaceDialogProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<{ name: string; type: 'CLIENT' | 'SYSTEM' }>({
    name: '',
    type: 'CLIENT',
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newWorkspace = await workspaceApi.createWorkspace({
        name: formData.name,
        type: formData.type
      });
      onWorkspaceCreated(newWorkspace);
      setIsOpen(false);
      setFormData({ name: '', type: 'CLIENT' });
    } catch (err) {
      console.error(err);
      setError(t('workspace.errorCreating'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        {t('workspace.new', { defaultValue: 'New Workspace' })}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={!loading ? () => setIsOpen(false) : undefined}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-card p-6 shadow-2xl text-card-foreground dark:border-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{t('workspace.createTitle')}</h2>
          <button
            onClick={() => setIsOpen(false)}
            disabled={loading}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
            <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive dark:text-red-400">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">{t('workspace.name')}</label>
            <input
              required
              type="text"
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={t('workspace.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">{t('workspace.type')}</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'CLIENT' | 'SYSTEM' })}
              disabled={loading}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <option value="CLIENT">{t('workspace.typeClient')}</option>
                <option value="SYSTEM">{t('workspace.typeSystem')}</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? t('common.creating') : t('workspace.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};