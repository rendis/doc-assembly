import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ScrollText, AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/admin/audit')({
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('admin.audit.title', { defaultValue: 'Audit Logs' })}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.audit.description', {
            defaultValue: 'View platform activity and security events',
          })}
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ScrollText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {t('admin.audit.comingSoon', { defaultValue: 'Coming Soon' })}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {t('admin.audit.comingSoonDescription', {
              defaultValue:
                'Audit logs functionality is not yet available. This feature will provide a comprehensive view of all platform activities, user actions, and security events.',
            })}
          </p>
        </div>
      </div>

      {/* Feature Preview */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium mb-2">
            {t('admin.audit.featureActivity', { defaultValue: 'User Activity' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('admin.audit.featureActivityDesc', {
              defaultValue: 'Track logins, logouts, and user sessions across the platform.',
            })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium mb-2">
            {t('admin.audit.featureChanges', { defaultValue: 'Data Changes' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('admin.audit.featureChangesDesc', {
              defaultValue: 'Monitor create, update, and delete operations on all resources.',
            })}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium mb-2">
            {t('admin.audit.featureSecurity', { defaultValue: 'Security Events' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('admin.audit.featureSecurityDesc', {
              defaultValue: 'Review role changes, permission updates, and access attempts.',
            })}
          </p>
        </div>
      </div>

      {/* Info Notice */}
      <div className="rounded-lg border border-warning-border bg-warning-muted p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
          <div>
            <h3 className="font-medium text-warning-foreground">
              {t('admin.audit.noApiTitle', { defaultValue: 'API Not Available' })}
            </h3>
            <p className="text-sm text-warning-foreground/80 mt-1">
              {t('admin.audit.noApiDescription', {
                defaultValue:
                  'The backend API for audit logs has not been implemented yet. Once available, you will be able to search, filter, and export audit data.',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
