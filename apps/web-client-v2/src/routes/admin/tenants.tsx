import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/tenants')({
  component: TenantsManagement,
})

function TenantsManagement() {
  return (
    <div className="p-8">
      <h1 className="mb-8 font-display text-4xl font-light tracking-tight">
        Tenants Management
      </h1>
      <div className="rounded-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Name
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Status
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Users
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {['Acme Legal', 'Global Finance', 'Northeast Litigation'].map((name, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{name}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </td>
                <td className="p-4 font-mono text-sm text-muted-foreground">{Math.floor(Math.random() * 50) + 5}</td>
                <td className="p-4 font-mono text-sm text-muted-foreground">Oct 2023</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
