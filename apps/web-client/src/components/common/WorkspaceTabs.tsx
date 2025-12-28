import { Link, useMatchRoute } from '@tanstack/react-router';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import { Permission } from '@/features/auth/rbac/rules';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  to: string;
  permission?: Permission;
}

interface WorkspaceTabsProps {
  workspaceId: string;
}

export const WorkspaceTabs = ({ workspaceId }: WorkspaceTabsProps) => {
  const matchRoute = useMatchRoute();

  const tabs: Tab[] = [
    { label: 'Documentos', to: `/workspace/${workspaceId}/documents` },
    { label: 'Plantillas', to: `/workspace/${workspaceId}/templates` },
    { label: 'Configuracion', to: `/workspace/${workspaceId}/settings`, permission: Permission.WORKSPACE_UPDATE },
  ];

  return (
    <nav className="flex border-b border-border bg-card">
      {tabs.map((tab) => {
        const isActive = matchRoute({ to: tab.to, fuzzy: false });
        const tabElement = (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors hover:text-foreground',
              isActive
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent'
            )}
          >
            {tab.label}
          </Link>
        );

        return tab.permission ? (
          <PermissionGuard key={tab.to} permission={tab.permission}>
            {tabElement}
          </PermissionGuard>
        ) : (
          tabElement
        );
      })}
    </nav>
  );
};
