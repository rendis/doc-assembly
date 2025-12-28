import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/workspace/$workspaceId/templates')({
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Plantillas</h2>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        Gestor de plantillas
      </div>
    </div>
  );
}
