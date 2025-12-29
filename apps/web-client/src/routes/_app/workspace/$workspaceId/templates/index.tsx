import { createFileRoute } from '@tanstack/react-router';
import { TemplatesPage } from '@/features/templates/components/TemplatesPage';

export const Route = createFileRoute('/_app/workspace/$workspaceId/templates/')({
  component: TemplatesPageRoute,
});

function TemplatesPageRoute() {
  return (
    <div className="h-full">
      <TemplatesPage />
    </div>
  );
}
