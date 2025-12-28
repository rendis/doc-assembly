import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_app/workspace/$workspaceId/templates')({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('workspace.templates')}</h2>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        {t('workspace.templatesManager')}
      </div>
    </div>
  );
}
