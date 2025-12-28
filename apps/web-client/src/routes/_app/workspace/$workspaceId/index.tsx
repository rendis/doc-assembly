import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_app/workspace/$workspaceId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/workspace/$workspaceId/documents',
      params: { workspaceId: params.workspaceId },
    });
  },
});
