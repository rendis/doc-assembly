import { createFileRoute } from '@tanstack/react-router';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';

export const Route = createFileRoute('/_app/workspace/$workspaceId/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { can } = usePermission();

  if (!can(Permission.WORKSPACE_UPDATE)) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
        <p className="text-destructive font-medium">Sin permisos para acceder a esta seccion</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Configuracion del Workspace</h2>
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
        Opciones de configuracion
      </div>
    </div>
  );
}
