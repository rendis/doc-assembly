import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '@/features/tenants/api/tenant-api';
import type { Tenant } from '@/features/tenants/types';
import { Plus, X } from 'lucide-react';

interface CreateTenantDialogProps {
  onTenantCreated: (tenant: Tenant) => void;
}

export const CreateTenantDialog = ({ onTenantCreated }: CreateTenantDialogProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const newTenant = await tenantApi.createTenant(formData);
      onTenantCreated(newTenant);
      setIsOpen(false);
      setFormData({ name: '', code: '', description: '' });
    } catch (err) {
      console.error(err);
      setError(t('tenant.errorCreating'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        {t('tenant.createTitle')}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg text-card-foreground">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('tenant.createTitle')}</h2>
          <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
            <div className="mb-4 rounded bg-red-100 p-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('tenant.name')}</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('tenant.namePlaceholder')}
            />
          </div>
          
          <div>
            <label className="mb-1 block text-sm font-medium">{t('tenant.code')}</label>
            <input
              required
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={t('tenant.codePlaceholder')}
              maxLength={10}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t('tenant.codeHelp')}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('tenant.description')}</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? t('common.creating') : t('common.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
