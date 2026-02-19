import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InjectablesTab } from '@/features/system-injectables'
import { usePermission } from '@/features/auth/hooks/usePermission'
import { Permission } from '@/features/auth/rbac/rules'
import { useAppContextStore } from '@/stores/app-context-store'
import { useTranslation } from 'react-i18next'
import { ApiKeysTab } from './ApiKeysTab'
import { DocumentTypesTab } from './DocumentTypesTab'
import { TenantsTab } from './TenantsTab'
import { UsersTab } from './UsersTab'
import { WorkspacesTab } from './WorkspacesTab'
import { TenantMembersTab } from './TenantMembersTab'

const TAB_TRIGGER_CLASS = 'font-mono text-xs uppercase tracking-widest'

export function AdministrationPage(): React.ReactElement {
  const { t } = useTranslation()
  const { isGlobalSystemWorkspace, isTenantSystemWorkspace } = useAppContextStore()

  const isGlobal = isGlobalSystemWorkspace()
  const isTenant = isTenantSystemWorkspace()

  const { hasPermission } = usePermission()
  const canManageApiKeys = hasPermission(Permission.SYSTEM_API_KEYS_MANAGE)

  return (
    <div className="animate-page-enter flex-1 overflow-y-auto bg-background">
      <header className="px-4 pb-6 pt-12 md:px-6">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {isGlobal
            ? t('administration.label', 'System')
            : t('administration.labelTenant', 'Tenant')}
        </div>
        <h1 className="font-display text-4xl font-light tracking-tight">
          {t('administration.title', 'Administration')}
        </h1>
      </header>

      <main className="px-4 pb-12 md:px-6">
        {isGlobal && (
          <Tabs defaultValue="tenants">
            <TabsList className="mb-6">
              <TabsTrigger value="tenants" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.tenants', 'Tenants')}
              </TabsTrigger>
              <TabsTrigger value="users" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.users', 'Users')}
              </TabsTrigger>
              <TabsTrigger value="injectables" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.injectables', 'Injectables')}
              </TabsTrigger>
              {canManageApiKeys && (
                <TabsTrigger value="api-keys" className={TAB_TRIGGER_CLASS}>
                  {t('administration.tabs.apiKeys', 'API Keys')}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="tenants">
              <TenantsTab />
            </TabsContent>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>

            <TabsContent value="injectables">
              <InjectablesTab />
            </TabsContent>

            {canManageApiKeys && (
              <TabsContent value="api-keys">
                <ApiKeysTab />
              </TabsContent>
            )}
          </Tabs>
        )}

        {isTenant && (
          <Tabs defaultValue="document-types">
            <TabsList className="mb-6">
              <TabsTrigger value="document-types" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.documentTypes', 'Document Types')}
              </TabsTrigger>
              <TabsTrigger value="workspaces" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.workspaces', 'Workspaces')}
              </TabsTrigger>
              <TabsTrigger value="members" className={TAB_TRIGGER_CLASS}>
                {t('administration.tabs.members', 'Members')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="document-types">
              <DocumentTypesTab />
            </TabsContent>

            <TabsContent value="workspaces">
              <WorkspacesTab />
            </TabsContent>

            <TabsContent value="members">
              <TenantMembersTab />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
