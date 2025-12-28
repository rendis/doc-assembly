import { Outlet } from '@tanstack/react-router';
import { useAppContextStore } from '@/stores/app-context-store';
import { AppSidebar } from './AppSidebar';
import { ConsoleSwitch } from '@/components/common/ConsoleSwitch';
import { UserMenu } from '@/components/common/UserMenu';
import { TenantSelector } from '@/features/tenants/components/TenantSelector';

export const AppLayout = () => {
  const { currentWorkspace } = useAppContextStore();

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors">
      {/* App Sidebar */}
      <AppSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* App Header */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-6 py-2 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <ConsoleSwitch />
            <div className="h-6 w-px bg-border" />
            <TenantSelector />

            {currentWorkspace && (
              <>
                <span className="text-slate-300 dark:text-slate-700 text-lg font-light">/</span>
                <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-transparent">
                  <span className="text-sm font-bold tracking-tight text-foreground truncate max-w-[200px]">
                    {currentWorkspace.name}
                  </span>
                  {currentWorkspace.type === 'SYSTEM' && (
                    <span className="text-[10px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 px-1 rounded font-bold uppercase">
                      SYS
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <UserMenu />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
