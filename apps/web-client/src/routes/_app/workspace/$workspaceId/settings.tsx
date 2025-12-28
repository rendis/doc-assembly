import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';

export const Route = createFileRoute('/_app/workspace/$workspaceId/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const { can } = usePermission();

  if (!can(Permission.WORKSPACE_UPDATE)) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive font-medium">{t('workspace.settings.noPermission')}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('workspace.settings.title')}</h2>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        {t('workspace.settings.options')}
      </div>
    </div>
  );
}
