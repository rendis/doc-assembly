import { useTranslation } from 'react-i18next'

const TH_CLASS = 'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'

export function UsersTab(): React.ReactElement {
  const { t } = useTranslation()

  // Mock data - replace with actual API call
  const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'SUPERADMIN', status: 'Active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'PLATFORM_ADMIN', status: 'Active' },
    { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'PLATFORM_ADMIN', status: 'Active' },
  ]

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('administration.users.description', 'Manage system users and their roles.')}
      </p>

      <div className="rounded-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className={TH_CLASS}>{t('administration.users.columns.name', 'Name')}</th>
              <th className={TH_CLASS}>{t('administration.users.columns.email', 'Email')}</th>
              <th className={TH_CLASS}>{t('administration.users.columns.role', 'Role')}</th>
              <th className={TH_CLASS}>{t('administration.users.columns.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{user.name}</td>
                <td className="p-4 font-mono text-sm text-muted-foreground">{user.email}</td>
                <td className="p-4">
                  <span className="rounded-sm bg-muted px-2 py-0.5 font-mono text-xs">{user.role}</span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {user.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
