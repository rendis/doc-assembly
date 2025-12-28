import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_app/workspace/$workspaceId/documents')({
  component: DocumentsPage,
});

function DocumentsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">{t('workspace.documents')}</h2>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        {t('workspace.documentsExplorer')}
      </div>
    </div>
  );
}
