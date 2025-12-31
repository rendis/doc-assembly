import { Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AdminSidebar } from './AdminSidebar';
import { ConsoleSwitch } from '@/components/common/ConsoleSwitch';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { UserMenu } from '@/components/common/UserMenu';

export const AdminLayout = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors">
      {/* Admin Sidebar */}
      <AdminSidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin Header */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-6 py-2 shadow-sm transition-colors">
          <div className="flex items-center gap-4">
            <ConsoleSwitch />
            <div className="h-6 w-px bg-border" />
            <span className="text-sm font-medium text-muted-foreground">
              {t('navigation.adminConsole')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
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
