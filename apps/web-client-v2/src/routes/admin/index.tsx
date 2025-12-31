import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  return (
    <div className="p-8">
      <h1 className="mb-8 font-display text-4xl font-light tracking-tight">
        Admin Dashboard
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Total Tenants
          </div>
          <div className="mt-2 font-display text-4xl font-medium">24</div>
        </div>
        <div className="rounded-sm border p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Active Users
          </div>
          <div className="mt-2 font-display text-4xl font-medium">156</div>
        </div>
        <div className="rounded-sm border p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Total Documents
          </div>
          <div className="mt-2 font-display text-4xl font-medium">3,842</div>
        </div>
        <div className="rounded-sm border p-6">
          <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Templates
          </div>
          <div className="mt-2 font-display text-4xl font-medium">89</div>
        </div>
      </div>
    </div>
  )
}
