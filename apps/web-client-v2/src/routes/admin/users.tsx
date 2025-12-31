import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/users')({
  component: UsersManagement,
})

function UsersManagement() {
  return (
    <div className="p-8">
      <h1 className="mb-8 font-display text-4xl font-light tracking-tight">
        Users Management
      </h1>
      <div className="rounded-sm border">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Name
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Email
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Role
              </th>
              <th className="p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'John Doe', email: 'john@example.com', role: 'ADMIN' },
              { name: 'Jane Smith', email: 'jane@example.com', role: 'USER' },
              { name: 'Bob Wilson', email: 'bob@example.com', role: 'USER' },
            ].map((user, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{user.name}</td>
                <td className="p-4 font-mono text-sm text-muted-foreground">{user.email}</td>
                <td className="p-4">
                  <span className="rounded-sm bg-muted px-2 py-0.5 font-mono text-xs">{user.role}</span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
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
