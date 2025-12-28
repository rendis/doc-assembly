import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/workspace/$workspaceId/documents')({
  component: DocumentsPage,
});

function DocumentsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Documentos</h2>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        Explorador de documentos
      </div>
    </div>
  );
}
