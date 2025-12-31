import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettings,
})

function AdminSettings() {
  return (
    <div className="p-8">
      <h1 className="mb-8 font-display text-4xl font-light tracking-tight">
        System Settings
      </h1>
      <div className="max-w-2xl space-y-8">
        <div className="rounded-sm border p-6">
          <h3 className="mb-4 font-display text-lg font-medium">General</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted-foreground">
                System Name
              </label>
              <input
                type="text"
                defaultValue="Doc-Assembly"
                className="w-full rounded-sm border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Support Email
              </label>
              <input
                type="email"
                defaultValue="support@doc-assembly.io"
                className="w-full rounded-sm border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-foreground"
              />
            </div>
          </div>
        </div>

        <div className="rounded-sm border p-6">
          <h3 className="mb-4 font-display text-lg font-medium">Security</h3>
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">Require 2FA for all admin users</div>
              </div>
              <input type="checkbox" className="h-4 w-4" defaultChecked />
            </label>
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <div className="font-medium">Session Timeout</div>
                <div className="text-sm text-muted-foreground">Auto-logout after 30 minutes of inactivity</div>
              </div>
              <input type="checkbox" className="h-4 w-4" defaultChecked />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
