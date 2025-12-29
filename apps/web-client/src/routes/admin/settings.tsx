import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Settings, AlertCircle } from 'lucide-react';

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('admin.settings.title', { defaultValue: 'Platform Settings' })}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.settings.description', {
            defaultValue: 'Configure platform-wide settings and preferences',
          })}
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/25 p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Settings className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {t('admin.settings.comingSoon', { defaultValue: 'Coming Soon' })}
          </h2>
          <p className="text-muted-foreground max-w-md">
            {t('admin.settings.comingSoonDescription', {
              defaultValue:
                'Platform settings functionality is not yet available. This feature will allow you to configure global settings, branding, and integrations.',
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
              {t('admin.settings.noApiTitle', { defaultValue: 'API Not Available' })}
            </h3>
            <p className="text-sm text-warning-foreground/80 mt-1">
              {t('admin.settings.noApiDescription', {
                defaultValue:
                  'The backend API for platform settings has not been implemented yet. Once available, you will be able to configure various platform options from this page.',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
